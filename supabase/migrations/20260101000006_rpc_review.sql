-- =============================================================================
-- 0006 — RPC transisi status kontribusi & tinjauan
-- =============================================================================
-- Semua RPC:
--  * SECURITY DEFINER + search_path dikunci,
--  * memeriksa auth.uid(), role, dan status saat ini,
--  * menulis contribution_history (+ moderation_logs bila aksi staf),
--  * atomik dalam satu transaksi.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper internal: catat riwayat
-- ---------------------------------------------------------------------------
create or replace function public.log_history(
  p_program_id uuid,
  p_actor_id uuid,
  p_action text,
  p_previous jsonb default null,
  p_new jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.contribution_history (program_id, contributor_id, action, previous_data, new_data)
  values (p_program_id, p_actor_id, p_action, p_previous, p_new);
$$;

-- ---------------------------------------------------------------------------
-- Helper internal: catat audit log
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.moderation_logs (actor_id, target_type, target_id, action, reason, metadata)
  values (p_actor_id, p_target_type, p_target_id, p_action, p_reason, coalesce(p_metadata, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- submit_program: draft/needs_changes -> pending
-- ---------------------------------------------------------------------------
create or replace function public.submit_program(p_program_id uuid)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_row   public.assistance_programs;
  v_src   integer;
  v_pending_today integer;
  v_pending_open  integer;
  v_max_per_day   integer := 10;
  v_created interval;
begin
  if v_uid is null then
    raise exception 'Harus masuk untuk mengirim kontribusi.' using errcode = '42501';
  end if;
  if public.is_user_banned(v_uid) then
    raise exception 'Akun Anda sedang dibatasi sehingga tidak dapat mengirim kontribusi.'
      using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then
    raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_row.contributor_id <> v_uid then
    raise exception 'Anda hanya dapat mengirim kontribusi milik sendiri.' using errcode = '42501';
  end if;
  if v_row.status not in ('draft', 'needs_changes') then
    raise exception 'Kontribusi berstatus % tidak dapat dikirim.', v_row.status
      using errcode = '22000';
  end if;

  select count(*) into v_src from public.sources where program_id = p_program_id;
  if v_src < 1 then
    raise exception 'Tambahkan minimal satu sumber sebelum mengirim.' using errcode = '22000';
  end if;

  -- Batas harian (PRD FR-CON-5)
  select coalesce((select (value #>> '{}')::int from public.site_settings where key = 'max_pending_per_day'), v_max_per_day)
    into v_max_per_day;

  select count(*) into v_pending_today
  from public.contribution_history h
  where h.contributor_id = v_uid
    and h.action = 'submit'
    and h.created_at >= date_trunc('day', now());

  if v_pending_today >= v_max_per_day then
    raise exception 'Batas pengiriman harian (% kontribusi) tercapai. Coba lagi besok.', v_max_per_day
      using errcode = '22000';
  end if;

  -- Kontributor baru (<7 hari, belum punya Verified) maks. 3 pending bersamaan
  select count(*) into v_pending_open
  from public.assistance_programs p
  where p.contributor_id = v_uid and p.status = 'pending';

  v_created := now() - (select created_at from public.profiles where id = v_uid);
  if v_created < interval '7 days'
     and not exists (select 1 from public.assistance_programs p where p.contributor_id = v_uid and p.status in ('verified', 'expired'))
     and v_pending_open >= 3 then
    raise exception 'Kontributor baru dibatasi maksimal 3 kontribusi dalam peninjauan. Tunggu keputusan reviewer.'
      using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'pending', review_note = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'submit',
    jsonb_build_object('status', v_row.status),
    jsonb_build_object('status', 'pending'));

  return 'pending'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- withdraw_program: pending -> draft
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_program(p_program_id uuid)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null then
    raise exception 'Harus masuk.' using errcode = '42501';
  end if;
  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.contributor_id <> v_uid then
    raise exception 'Anda hanya dapat menarik kontribusi milik sendiri.' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya kontribusi berstatus pending yang dapat ditarik.' using errcode = '22000';
  end if;

  update public.assistance_programs set status = 'draft' where id = p_program_id;
  perform public.log_history(p_program_id, v_uid, 'withdraw',
    jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'draft'));
  return 'draft'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- claim_program: reviewer mengambil item antrean (30 menit, auto-expire)
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
  if v_uid is null or not public.has_role(v_uid, 'reviewer') and not public.has_role(v_uid, 'admin') then
    raise exception 'Hanya reviewer yang dapat mengambil item.' using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat diambil.' using errcode = '22000';
  end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat meninjau kontribusi sendiri.' using errcode = '42501';
  end if;
  -- Claim aktif milik orang lain dan belum kedaluwarsa (30 menit)
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
-- request_changes: pending -> needs_changes (wajib alasan >= 20 char)
-- ---------------------------------------------------------------------------
create or replace function public.request_changes(p_program_id uuid, p_reason text)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat meminta revisi.' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 20 then
    raise exception 'Alasan revisi minimal 20 karakter.' using errcode = '22000';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat meninjau kontribusi sendiri.' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat diminta revisi.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'needs_changes', review_note = trim(p_reason),
      claimed_by = null, claimed_at = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'request_changes',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'needs_changes', 'reason', trim(p_reason)));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.request_changes', trim(p_reason));
  return 'needs_changes'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- verify_program: pending -> verified
-- ---------------------------------------------------------------------------
create or replace function public.verify_program(p_program_id uuid)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat memverifikasi.' using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat memverifikasi kontribusi sendiri.' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat diverifikasi.' using errcode = '22000';
  end if;
  if not exists (select 1 from public.sources s where s.program_id = p_program_id) then
    raise exception 'Tidak dapat memverifikasi tanpa sumber.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'verified', reviewer_id = v_uid, verified_at = now(),
      review_note = null, claimed_by = null, claimed_at = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'verify',
    jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'verified'));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.verify');
  return 'verified'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- reject_program: pending -> rejected (wajib alasan)
-- ---------------------------------------------------------------------------
create or replace function public.reject_program(p_program_id uuid, p_reason text)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat menolak.' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 20 then
    raise exception 'Alasan penolakan minimal 20 karakter.' using errcode = '22000';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat menolak kontribusi sendiri.' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat ditolak.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'rejected', reviewer_id = v_uid, review_note = trim(p_reason),
      claimed_by = null, claimed_at = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'reject',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'rejected', 'reason', trim(p_reason)));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.reject', trim(p_reason));
  return 'rejected'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_expired: verified -> expired
-- ---------------------------------------------------------------------------
create or replace function public.mark_expired(p_program_id uuid, p_reason text default null)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','moderator','admin']::public.app_role[]) then
    raise exception 'Tidak berwenang menandai kedaluwarsa.' using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.status not in ('verified', 'pending') then
    raise exception 'Hanya program terverifikasi yang dapat ditandai kedaluwarsa.' using errcode = '22000';
  end if;

  update public.assistance_programs set status = 'expired' where id = p_program_id;
  perform public.log_history(p_program_id, v_uid, 'expire',
    jsonb_build_object('status', v_row.status), jsonb_build_object('status', 'expired'));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.expire', p_reason);
  return 'expired'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- reviewer_update_program: koreksi konten oleh reviewer (tetap status)
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
      requirements = p_requirements
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'reviewer_edit',
    jsonb_build_object('title', v_row.title, 'description', v_row.description,
                       'organizer', v_row.organizer, 'requirements', v_row.requirements),
    jsonb_build_object('title', p_title, 'description', p_description,
                       'organizer', p_organizer, 'requirements', p_requirements));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.reviewer_edit');
end;
$$;
