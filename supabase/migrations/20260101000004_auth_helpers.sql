-- =============================================================================
-- 0004 — Fungsi otorisasi, trigger profil baru, dan helper kebijakan
-- =============================================================================
-- CATATAN PERBAIKAN (dibanding docs/DATABASE_SCHEMA.md):
--  * Semua helper memakai SECURITY DEFINER + `set search_path = ''` (schema
--    dikualifikasi penuh) agar tidak dapat dibajak lewat search_path.
--  * Fungsi helper yang dipakai di dalam policy profiles TIDAK membaca
--    `profiles` secara langsung dari policy (mencegah rekursi RLS tanpa batas);
--    pembacaan status blokir memakai helper berikut yang berjalan sebagai
--    pemilik tabel.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- has_role / has_any_role
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
    where ur.user_id = uid and ur.role = r
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
    where ur.user_id = uid and ur.role = any (rs)
  );
$$;

-- ---------------------------------------------------------------------------
-- is_banned / is_deleted: helper yang menghindari rekursi policy profiles
-- ---------------------------------------------------------------------------
create or replace function public.is_user_banned(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_banned from public.profiles p where p.id = uid), true);
$$;

create or replace function public.is_user_deleted(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_deleted from public.profiles p where p.id = uid), true);
$$;

-- ---------------------------------------------------------------------------
-- current_roles: kumpulan role pengguna aktif (dipakai RPC/validasi)
-- ---------------------------------------------------------------------------
create or replace function public.current_roles()
returns public.app_role[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(ur.role), '{}'::public.app_role[])
  from public.user_roles ur
  where ur.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- is_staff: reviewer, moderator, admin
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_any_role(auth.uid(), array['reviewer', 'moderator', 'admin']::public.app_role[]);
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user: auto-profil saat login GitHub pertama kali
-- ---------------------------------------------------------------------------
-- Perbaikan:
--  * username dijamin unik (fallback deterministik + penomoran bila bentrok),
--  * hanya memberikan role 'member' (TIDAK pernah dari metadata),
--  * search_path dikunci.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  base      text;
  suffix    integer := 0;
begin
  base := nullif(trim(new.raw_user_meta_data ->> 'user_name'), '');
  if base is null then
    base := 'user-' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  -- sanitasi karakter agar lolos constraint username
  base := regexp_replace(base, '[^A-Za-z0-9-]', '-', 'g');
  base := left(base, 30);
  if base = '' or base !~ '^[A-Za-z0-9]' then
    base := 'user-' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  candidate := base;
  while exists (
    select 1 from public.profiles p where lower(p.github_username) = lower(candidate)
  ) loop
    suffix := suffix + 1;
    candidate := left(base, 34 - length(suffix::text) - 1) || '-' || suffix::text;
    if suffix > 999 then
      candidate := 'user-' || substr(replace(new.id::text, '-', ''), 1, 12);
      exit;
    end if;
  end loop;

  insert into public.profiles (id, github_username, github_avatar, github_url)
  values (
    new.id,
    candidate,
    new.raw_user_meta_data ->> 'avatar_url',
    'https://github.com/' || coalesce(new.raw_user_meta_data ->> 'user_name', candidate)
  )
  on conflict (id) do nothing;

  -- Role default HANYA member. Role lain hanya diberikan admin lewat RPC.
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- sync profile metadata saat login ulang (avatar/url/bio berubah di GitHub)
-- ---------------------------------------------------------------------------
create or replace function public.handle_user_metadata_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set github_avatar = coalesce(new.raw_user_meta_data ->> 'avatar_url', p.github_avatar),
      github_url = 'https://github.com/' || coalesce(new.raw_user_meta_data ->> 'user_name', p.github_username)
  where p.id = new.id
    and p.is_deleted = false;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_user_metadata_update();
