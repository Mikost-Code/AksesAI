-- =============================================================================
-- 0010 — Bootstrap pemilik + penjaga kewenangan super_admin di RPC
-- =============================================================================
-- Aturan baru (ditambah di atas aturan lama yang tetap berlaku):
--  * grant_role / revoke_role HANYA oleh super_admin (pemilik).
--  * Role dari/sebuah akun super_admin tidak dapat dicabut lewat aplikasi,
--    dan super_admin tidak dapat diblokir — pemilik selalu terjaga.
--  * resolve_report (aksi ban_contributor) ikut dijaga.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Bootstrap: jadikan pemilik super_admin bila profilnya sudah ada.
-- Untuk instance baru: jalankan SQL serupa SETELAH login pertama, atau
-- sisipkan baris user_roles secara manual dengan service_role.
-- ---------------------------------------------------------------------------
insert into public.user_roles (user_id, role, assigned_by)
select p.id, 'super_admin', p.id
from public.profiles p
where p.github_username = 'zann06'
on conflict (user_id, role) do nothing;

-- ---------------------------------------------------------------------------
-- grant_role — hanya super_admin; super_admin tak dapat diberikan via RPC
-- ---------------------------------------------------------------------------
create or replace function public.grant_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := public.require_staff(array['super_admin']::public.app_role[]);
  if p_role = 'member' then
    raise exception 'Semua pengguna sudah memiliki role member.' using errcode = '22000';
  end if;
  if p_role = 'super_admin' then
    raise exception 'Role super_admin hanya dapat diatur lewat konsol database.'
      using errcode = '22000';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Pengguna tidak ditemukan.' using errcode = 'P0002';
  end if;

  insert into public.user_roles (user_id, role, assigned_by)
  values (p_user_id, p_role, v_uid)
  on conflict (user_id, role) do nothing;

  perform public.log_audit(v_uid, 'role', p_user_id, 'role.grant', null,
    jsonb_build_object('role', p_role));
end;
$$;

-- ---------------------------------------------------------------------------
-- revoke_role — hanya super_admin; akun super_admin tak tersentuh
-- ---------------------------------------------------------------------------
create or replace function public.revoke_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_admin_count integer;
begin
  v_uid := public.require_staff(array['super_admin']::public.app_role[]);
  if p_role = 'member' then
    raise exception 'Role member tidak dapat dicabut.' using errcode = '22000';
  end if;

  -- Pemilik: seluruh role-nya permanen lewat aplikasi (jaga akses pemulihan).
  if public.has_role(p_user_id, 'super_admin') then
    raise exception 'Role milik pemilik (super_admin) tidak dapat dicabut lewat aplikasi.'
      using errcode = '42501';
  end if;

  if p_role = 'admin' then
    -- Admin efektif = admin + super_admin (super_admin mewarisi admin).
    select count(*) into v_admin_count from public.user_roles
    where role in ('admin', 'super_admin');
    if v_admin_count <= 1 then
      raise exception 'Tidak dapat mencabut admin terakhir.' using errcode = '22000';
    end if;
  end if;

  delete from public.user_roles where user_id = p_user_id and role = p_role;
  if not found then
    raise exception 'Role tidak ditemukan pada pengguna ini.' using errcode = 'P0002';
  end if;

  perform public.log_audit(v_uid, 'role', p_user_id, 'role.revoke', null,
    jsonb_build_object('role', p_role));
end;
$$;

-- ---------------------------------------------------------------------------
-- set_user_banned — pemilik kebal blokir; admin hanya bisa diblokir pemilik
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
  -- Pemilik kebal blokir dari siapa pun (termasuk dirinya lewat UI).
  if public.has_role(p_user_id, 'super_admin') then
    raise exception 'Pemilik (super_admin) tidak dapat diblokir.' using errcode = '42501';
  end if;
  -- Moderator tidak boleh memblokir admin; hanya pemilik yang bisa.
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
-- resolve_report — aksi ban_contributor ikut menghormati proteksi di atas
-- ---------------------------------------------------------------------------
create or replace function public.resolve_report(
  p_report_id uuid,
  p_action text,
  p_note text
)
returns public.report_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid;
  v_rep   public.reports;
  v_prog  public.assistance_programs;
begin
  v_uid := public.require_staff(array['moderator','admin']::public.app_role[]);

  if p_action not in ('dismiss', 'reopen_for_review', 'archive_program', 'resolve', 'ban_contributor') then
    raise exception 'Aksi moderasi tidak dikenal.' using errcode = '22000';
  end if;
  if p_action in ('reopen_for_review', 'archive_program', 'ban_contributor')
     and (p_note is null or char_length(trim(p_note)) < 10) then
    raise exception 'Catatan minimal 10 karakter untuk aksi ini.' using errcode = '22000';
  end if;

  select * into v_rep from public.reports where id = p_report_id for update;
  if not found then raise exception 'Laporan tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_rep.status in ('resolved', 'dismissed') then
    raise exception 'Laporan sudah diselesaikan.' using errcode = '22000';
  end if;

  select * into v_prog from public.assistance_programs where id = v_rep.program_id for update;

  if p_action = 'reopen_for_review' then
    if v_prog.status in ('verified', 'expired') then
      update public.assistance_programs set status = 'pending', claimed_by = null, claimed_at = null
      where id = v_prog.id;
      perform public.log_history(v_prog.id, v_uid, 'reopen',
        jsonb_build_object('status', v_prog.status), jsonb_build_object('status', 'pending'));
    end if;
  elsif p_action = 'archive_program' then
    update public.assistance_programs set status = 'archived' where id = v_prog.id;
    perform public.log_history(v_prog.id, v_uid, 'archive',
      jsonb_build_object('status', v_prog.status), jsonb_build_object('status', 'archived'));
  elsif p_action = 'ban_contributor' then
    -- Kontributor pemilik/admin tidak boleh diblokir lewat jalur moderasi.
    if public.has_role(v_prog.contributor_id, 'super_admin') then
      raise exception 'Pemilik (super_admin) tidak dapat diblokir.' using errcode = '42501';
    end if;
    if public.has_role(v_prog.contributor_id, 'admin')
       and not public.has_role(v_uid, 'super_admin') then
      raise exception 'Hanya pemilik (super_admin) yang dapat memblokir admin.' using errcode = '42501';
    end if;
    update public.profiles set is_banned = true where id = v_prog.contributor_id;
    perform public.log_audit(v_uid, 'user', v_prog.contributor_id, 'user.ban', p_note);
  end if;

  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end::public.report_status,
      handled_by = v_uid,
      resolution_note = coalesce(trim(p_note), null),
      resolved_at = now()
  where id = p_report_id
  returning status into v_rep.status;

  perform public.log_audit(v_uid, 'report', p_report_id, 'report.' || p_action,
    coalesce(trim(p_note), null), jsonb_build_object('program_id', v_prog.id));

  return v_rep.status;
end;
$$;
