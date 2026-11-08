-- =============================================================================
-- 0002 — Tabel inti: profiles, user_roles, categories, site_settings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Email TIDAK disalin (docs/SECURITY.md §1).
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  github_username text not null,
  github_avatar   text,
  github_url      text,
  bio             text,
  is_banned       boolean not null default false,
  is_deleted      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_username_format check (github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$'),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 300)
);

-- Username unik secara case-insensitive (GitHub case-insensitive).
create unique index if not exists profiles_username_unique
  on public.profiles (lower(github_username));

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.app_role not null,
  assigned_by uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated
  before update on public.categories
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- site_settings (bukan rahasia; terbaca publik)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rate_limit_buckets (fallback Postgres bila Upstash tidak tersedia)
-- Ditulis HANYA lewat fungsi security definer check_rate_limit.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_buckets (
  bucket_key   text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket_key, window_start)
);
create index if not exists rate_limit_buckets_window_idx
  on public.rate_limit_buckets (window_start);
