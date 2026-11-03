-- =============================================================================
-- 0001 — Ekstensi, tipe enum, dan fungsi utilitas dasar
-- BantuWarga: fondasi skema sesuai docs/DATABASE_SCHEMA.md
-- =============================================================================

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipe enum
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('member', 'reviewer', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.program_status as enum (
    'draft', 'pending', 'needs_changes', 'verified', 'rejected', 'expired', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.region_scope as enum ('nasional', 'provinsi', 'kabupaten_kota');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.source_type as enum (
    'situs_resmi', 'media_massa', 'media_sosial_resmi', 'dokumen', 'lainnya'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_reason as enum (
    'tidak_akurat', 'kedaluwarsa', 'link_mati', 'duplikat', 'dugaan_penipuan', 'spam'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'in_review', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Fungsi utilitas
-- ---------------------------------------------------------------------------

-- Pembaruan `updated_at` otomatis.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Cegah UPDATE/DELETE pada tabel append-only.
create or replace function public.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Tabel % bersifat append-only dan tidak dapat diubah.', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

-- Slug dasar dari judul: huruf kecil, alfanumerik dan tanda hubung.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(
    both '-' from
    regexp_replace(
      lower(coalesce(input, '')),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- Slug unik: slugify(judul) + "-" + 6 karakter acak (PRD §10).
create or replace function public.generate_program_slug(input text)
returns text
language plpgsql
as $$
declare
  base text;
begin
  base := left(nullif(public.slugify(input), ''), 80);
  if base is null then
    base := 'program';
  end if;
  return base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
end;
$$;
