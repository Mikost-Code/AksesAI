-- =============================================================================
-- 0012 — Hardening (hasil audit keamanan)
-- =============================================================================
-- 1. `record_program_feedback` hanya untuk service_role (voter_hash dibuat server).
-- 2. `log_audit` / `log_history` hanya untuk service_role — sebelumnya bisa
--    dipanggil `authenticated` untuk menyuntik catatan audit palsu.
-- 3. `get_program_feedback` hanya menghitung entri publik (verified/expired),
--    supaya UUID entri draft/rejected tidak membocorkan keberadaannya.
-- 4. `claim_program` menolak kontributor yang diblokir.
-- 5. `set_user_banned` menolak blokir-diri (tidak bisa unban diri sendiri).
-- 6. `reviewer_update_program` membaca `provider` (bukan hanya `organizer`).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Feedback: tulis hanya lewat server (service_role dari server action)
-- ---------------------------------------------------------------------------
revoke all on function public.record_program_feedback(uuid, text, boolean) from anon, authenticated, public;
grant execute on function public.record_program_feedback(uuid, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Helper log: bukan bagian dari API klien
-- ---------------------------------------------------------------------------
revoke all on function public.log_audit(uuid, text, uuid, text, text, jsonb) from anon, authenticated, public;
revoke all on function public.log_history(uuid, uuid, text, jsonb, jsonb) from anon, authenticated, public;
grant execute on function public.log_audit(uuid, text, uuid, text, text, jsonb) to service_role;
grant execute on function public.log_history(uuid, uuid, text, jsonb, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Agregat feedback hanya untuk entri publik
-- ---------------------------------------------------------------------------
create or replace function public.get_program_feedback(p_program_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'helpful', count(*) filter (where f.is_helpful),
    'notHelpful', count(*) filter (where not f.is_helpful)
  )
  from public.program_feedback f
  join public.assistance_programs p on p.id = f.program_id
  where f.program_id = p_program_id
    and p.status in ('verified', 'expired');
$$;

revoke all on function public.get_program_feedback(uuid) from anon, authenticated, public;
grant execute on function public.get_program_feedback(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. claim_program: tolak akun yang diblokir
-- ---------------------------------------------------------------------------
create or replace function public.claim_program(p_program_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or (not public.has_role(v_uid, 'reviewer') and not public.has_role(v_uid, 'admin')) then
    raise exception 'Hanya reviewer yang dapat mengambil item.' using errcode = '42501';
  end if;
  if public.is_user_banned(v_uid) then
    raise exception 'Akun Anda dibatasi sehingga tidak dapat meninjau.' using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat diambil.' using errcode = '22000';
  end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat meninjau kontribusi sendiri.' using errcode = '42501';
  end if;
  if v_row.claimed_by is not null
     and v_row.claimed_by <> v_uid
     and v_row.claimed_at > now() - interval '30 minutes' then
    raise exception 'Item sedang ditinjau reviewer lain.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set claimed_by = v_uid, claimed_at = now()
  where id = p_program_id;

  return now() + interval '30 minutes';
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. set_user_banned: tidak boleh memblokir diri sendiri
-- ---------------------------------------------------------------------------
create or replace function public.set_user_banned(p_user_id uuid, p_banned boolean, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := public.require_staff(array['moderator','admin']::public.app_role[]);
  if p_reason is null or char_length(trim(p_reason)) < 10 then
    raise exception 'Alasan wajib diisi minimal 10 karakter.' using errcode = '22000';
  end if;
  if p_user_id = v_uid then
    raise exception 'Anda tidak dapat mengubah status blokir akun sendiri.' using errcode = '42501';
  end if;
  if public.has_role(p_user_id, 'super_admin') then
    raise exception 'Pemilik (super_admin) tidak dapat diblokir.' using errcode = '42501';
  end if;
  if public.has_role(p_user_id, 'admin') and not public.has_role(v_uid, 'super_admin') then
    raise exception 'Hanya pemilik (super_admin) yang dapat memblokir admin.' using errcode = '42501';
  end if;

  update public.profiles set is_banned = p_banned where id = p_user_id;
  if not found then raise exception 'Pengguna tidak ditemukan.' using errcode = 'P0002'; end if;

  perform public.log_audit(v_uid, 'user', p_user_id,
    case when p_banned then 'user.ban' else 'user.unban' end, trim(p_reason));
  return p_banned;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. reviewer_update_program: sinkronkan `provider` (kolom domain AI)
-- ---------------------------------------------------------------------------
create or replace function public.reviewer_update_program(
  p_program_id uuid,
  p_title text,
  p_description text,
  p_organizer text,
  p_requirements text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat mengoreksi konten.' using errcode = '42501';
  end if;
  if char_length(p_title) not between 10 and 150 then
    raise exception 'Judul harus 10–150 karakter.' using errcode = '22000';
  end if;
  if char_length(p_description) not between 50 and 3000 then
    raise exception 'Deskripsi harus 50–3000 karakter.' using errcode = '22000';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.status not in ('pending', 'verified', 'expired') then
    raise exception 'Status % tidak dapat dikoreksi reviewer.', v_row.status using errcode = '22000';
  end if;

  update public.assistance_programs
  set title = p_title, description = p_description, organizer = p_organizer,
      provider = p_organizer, requirements = p_requirements
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'reviewer_edit',
    jsonb_build_object('title', v_row.title, 'description', v_row.description,
                       'provider', v_row.provider, 'requirements', v_row.requirements),
    jsonb_build_object('title', p_title, 'description', p_description,
                       'provider', p_organizer, 'requirements', p_requirements));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.reviewer_edit');
end;
$$;
