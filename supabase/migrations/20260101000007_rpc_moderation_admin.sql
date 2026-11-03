-- =============================================================================
-- 0007 — RPC moderasi, admin, cron, dan fallback rate limit
-- =============================================================================

-- ---------------------------------------------------------------------------
-- is_admin / is_moderator helper
-- ---------------------------------------------------------------------------
create or replace function public.require_staff(roles public.app_role[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Harus masuk.' using errcode = '42501';
  end if;
  if not public.has_any_role(v_uid, roles) then
    raise exception 'Anda tidak memiliki akses untuk tindakan ini.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- resolve_report: menyelesaikan laporan + aksi moderasi terkait
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

-- ---------------------------------------------------------------------------
-- mark_report_in_review: moderator mulai menangani laporan
-- ---------------------------------------------------------------------------
create or replace function public.mark_report_in_review(p_report_id uuid)
returns public.report_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_status public.report_status;
begin
  v_uid := public.require_staff(array['moderator','admin']::public.app_role[]);
  update public.reports
  set status = 'in_review', handled_by = v_uid
  where id = p_report_id and status = 'open'
  returning status into v_status;

  if v_status is null then
    raise exception 'Laporan tidak ditemukan atau sudah diproses.' using errcode = '22000';
  end if;
  perform public.log_audit(v_uid, 'report', p_report_id, 'report.in_review');
  return v_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- archive_program: moderator/admin menyembunyikan program
-- ---------------------------------------------------------------------------
create or replace function public.archive_program(p_program_id uuid, p_reason text)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_row public.assistance_programs;
begin
  v_uid := public.require_staff(array['moderator','admin']::public.app_role[]);
  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Program tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.status not in ('verified', 'expired', 'rejected') then
    raise exception 'Hanya program verified/expired/rejected yang dapat diarsipkan.' using errcode = '22000';
  end if;

  update public.assistance_programs set status = 'archived' where id = p_program_id;
  perform public.log_history(p_program_id, v_uid, 'archive',
    jsonb_build_object('status', v_row.status), jsonb_build_object('status', 'archived'));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.archive', p_reason);
  return 'archived'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_user_banned
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
  -- Moderator tidak boleh memblokir admin.
  if public.has_role(p_user_id, 'admin') and not public.has_role(v_uid, 'admin') then
    raise exception 'Hanya admin yang dapat mengubah status admin.' using errcode = '42501';
  end if;

  update public.profiles set is_banned = p_banned where id = p_user_id;
  if not found then raise exception 'Pengguna tidak ditemukan.' using errcode = 'P0002'; end if;

  perform public.log_audit(v_uid, 'user', p_user_id,
    case when p_banned then 'user.ban' else 'user.unban' end, trim(p_reason));
  return p_banned;
end;
$$;

-- ---------------------------------------------------------------------------
-- grant_role / revoke_role (admin only, admin terakhir dilindungi)
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
  v_uid := public.require_staff(array['admin']::public.app_role[]);
  if p_role = 'member' then
    raise exception 'Semua pengguna sudah memiliki role member.' using errcode = '22000';
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
  v_uid := public.require_staff(array['admin']::public.app_role[]);
  if p_role = 'member' then
    raise exception 'Role member tidak dapat dicabut.' using errcode = '22000';
  end if;

  if p_role = 'admin' then
    select count(*) into v_admin_count from public.user_roles where role = 'admin';
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
-- Kategori (admin only)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_category(
  p_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_is_active boolean,
  p_sort_order integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  v_uid := public.require_staff(array['admin']::public.app_role[]);

  if p_id is null then
    insert into public.categories (name, slug, description, is_active, sort_order)
    values (trim(p_name), p_slug, p_description, p_is_active, p_sort_order)
    returning id into v_id;
  else
    update public.categories
    set name = trim(p_name), slug = p_slug, description = p_description,
        is_active = p_is_active, sort_order = p_sort_order
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Kategori tidak ditemukan.' using errcode = 'P0002'; end if;
  end if;

  perform public.log_audit(v_uid, 'category', v_id,
    case when p_id is null then 'category.create' else 'category.update' end);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- site_settings (admin only)
-- ---------------------------------------------------------------------------
create or replace function public.update_site_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := public.require_staff(array['admin']::public.app_role[]);
  insert into public.site_settings (key, value, updated_by)
  values (p_key, p_value, v_uid)
  on conflict (key) do update
    set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
  perform public.log_audit(v_uid, 'setting', null, 'setting.update', null,
    jsonb_build_object('key', p_key));
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_due_programs: cron harian (verified & end_date < hari ini)
-- ---------------------------------------------------------------------------
create or replace function public.expire_due_programs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select id from public.assistance_programs
    where status = 'verified' and end_date is not null and end_date < current_date
    for update
  loop
    update public.assistance_programs set status = 'expired' where id = r.id;
    perform public.log_history(r.id, null, 'expire',
      jsonb_build_object('status', 'verified'), jsonb_build_object('status', 'expired'));
    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    perform public.log_audit(null, 'system', null, 'cron.expire_due',
      null, jsonb_build_object('count', v_count));
  end if;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- cleanup_expired_data: hapus hash IP lama & claim kedaluwarsa (cron mingguan)
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reports integer;
  v_claims integer;
  v_limits integer;
begin
  update public.reports
  set reporter_ip_hash = null
  where reporter_ip_hash is not null and created_at < now() - interval '90 days';
  get diagnostics v_reports = row_count;

  update public.assistance_programs
  set claimed_by = null, claimed_at = null
  where claimed_by is not null and claimed_at < now() - interval '30 minutes';
  get diagnostics v_claims = row_count;

  delete from public.rate_limit_buckets where window_start < now() - interval '2 days';
  get diagnostics v_limits = row_count;

  perform public.log_audit(null, 'system', null, 'cron.cleanup', null,
    jsonb_build_object('reports', v_reports, 'claims', v_claims, 'rate_limit_rows', v_limits));

  return jsonb_build_object('reports_cleared', v_reports, 'claims_cleared', v_claims, 'rate_limit_rows', v_limits);
end;
$$;

-- ---------------------------------------------------------------------------
-- check_rate_limit: fallback Postgres (sliding window sederhana per menit)
-- Dipanggil route handler bila Upstash tidak dikonfigurasi.
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Parameter rate limit tidak valid.' using errcode = '22000';
  end if;

  -- Window tetap: awal window dibulatkan
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_buckets (bucket_key, window_start, count)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set count = public.rate_limit_buckets.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hak eksekusi
-- ---------------------------------------------------------------------------
-- Publik boleh membaca fungsi tanpa data sensitif; RPC mutasi hanya authenticated.
revoke all on function public.grant_role(uuid, public.app_role) from anon, public;
revoke all on function public.revoke_role(uuid, public.app_role) from anon, public;
revoke all on function public.upsert_category(uuid, text, text, text, boolean, integer) from anon, public;
revoke all on function public.update_site_setting(text, jsonb) from anon, public;
revoke all on function public.resolve_report(uuid, text, text) from anon, public;
revoke all on function public.mark_report_in_review(uuid) from anon, public;
revoke all on function public.archive_program(uuid, text) from anon, public;
revoke all on function public.set_user_banned(uuid, boolean, text) from anon, public;
revoke all on function public.expire_due_programs() from anon, authenticated, public;
revoke all on function public.cleanup_expired_data() from anon, authenticated, public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon, authenticated, public;

grant execute on function public.expire_due_programs() to service_role;
grant execute on function public.cleanup_expired_data() to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
