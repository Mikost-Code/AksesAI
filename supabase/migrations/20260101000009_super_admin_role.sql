-- =============================================================================
-- 0009 — Role `super_admin` (pemilik) + implikasi di helper role
-- =============================================================================
-- super_admin adalah pemilik platform (satu orang). Ia mewarisi SEMUA
-- kemampuan admin — diuji lewat helper di bawah sehingga semua policy RLS
-- dan RPC yang memeriksa role 'admin' otomatis meloloskan super_admin —
-- ditambah kewenangan eksklusif: mengatur role pengguna & memblokir admin.
--
-- Role super_admin TIDAK dapat diberikan lewat aplikasi (anti eskalasi
-- privilege); hanya lewat konsol database oleh operator tepercaya.
-- =============================================================================

alter type public.app_role add value if not exists 'super_admin' after 'admin';

-- ---------------------------------------------------------------------------
-- has_role / has_any_role: super_admin mewarisi semua role lain
-- ---------------------------------------------------------------------------
create or replace function public.has_role(uid uuid, r public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid
      and (ur.role = r or ur.role = 'super_admin')
  );
$$;

create or replace function public.has_any_role(uid uuid, rs public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid
      and (ur.role = any (rs) or ur.role = 'super_admin')
  );
$$;
