-- =============================================================================
-- 0003 — Program bantuan, sumber, laporan, riwayat, audit log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- assistance_programs
-- ---------------------------------------------------------------------------
create table if not exists public.assistance_programs (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  description      text not null,
  category_id      uuid not null references public.categories (id),
  region_scope     public.region_scope not null default 'nasional',
  province         text,
  city             text,
  region           text generated always as (
                     case
                       when city is not null and province is not null then city || ', ' || province
                       when city is not null then city
                       when province is not null then province
                       else 'Nasional'
                     end
                   ) stored,
  organizer        text not null,
  requirements     text,
  published_at     date,
  start_date       date,
  end_date         date,
  status           public.program_status not null default 'draft',
  review_note      text,
  contributor_id   uuid not null references public.profiles (id),
  reviewer_id      uuid references public.profiles (id),
  claimed_by       uuid references public.profiles (id),
  claimed_at       timestamptz,
  verified_at      timestamptz,
  contributor_note text,
  search_tsv       tsvector generated always as (
                     to_tsvector(
                       'simple',
                       coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(organizer, '')
                     )
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint programs_title_length check (char_length(title) between 10 and 150),
  constraint programs_description_length check (char_length(description) between 50 and 3000),
  constraint programs_dates_order check (end_date is null or start_date is null or end_date >= start_date),
  constraint programs_province_required check (region_scope <> 'provinsi' or province is not null),
  constraint programs_city_required check (
    region_scope <> 'kabupaten_kota' or (province is not null and city is not null)
  ),
  constraint programs_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists assistance_programs_search_idx
  on public.assistance_programs using gin (search_tsv);
create index if not exists assistance_programs_title_trgm_idx
  on public.assistance_programs using gin (title gin_trgm_ops);
create index if not exists assistance_programs_status_published_idx
  on public.assistance_programs (status, published_at desc nulls last);
create index if not exists assistance_programs_category_idx
  on public.assistance_programs (category_id);
create index if not exists assistance_programs_region_idx
  on public.assistance_programs (province, city);
create index if not exists assistance_programs_contributor_idx
  on public.assistance_programs (contributor_id);
create index if not exists assistance_programs_end_date_verified_idx
  on public.assistance_programs (end_date)
  where status = 'verified';
create index if not exists assistance_programs_claimed_idx
  on public.assistance_programs (claimed_at)
  where claimed_by is not null;

drop trigger if exists trg_programs_updated on public.assistance_programs;
create trigger trg_programs_updated
  before update on public.assistance_programs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
create table if not exists public.sources (
  id                    uuid primary key default gen_random_uuid(),
  program_id            uuid not null references public.assistance_programs (id) on delete cascade,
  source_url            text not null,
  source_url_normalized text not null,
  source_title          text,
  source_type           public.source_type not null default 'lainnya',
  is_primary            boolean not null default false,
  link_status           text,
  last_checked_at       timestamptz,
  created_at            timestamptz not null default now(),
  constraint sources_url_scheme check (source_url ~* '^https?://'),
  constraint sources_title_length check (source_title is null or char_length(source_title) <= 200),
  unique (program_id, source_url_normalized)
);

create index if not exists sources_normalized_idx
  on public.sources (source_url_normalized);
create unique index if not exists sources_one_primary_per_program
  on public.sources (program_id) where is_primary;

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references public.assistance_programs (id) on delete cascade,
  reporter_id      uuid references public.profiles (id) on delete set null,
  reporter_ip_hash text,
  reason           public.report_reason not null,
  description      text not null,
  status           public.report_status not null default 'open',
  handled_by       uuid references public.profiles (id),
  resolution_note  text,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  constraint reports_description_length check (char_length(description) between 10 and 1000)
);

create index if not exists reports_status_reason_idx
  on public.reports (status, reason, created_at);
create index if not exists reports_program_idx on public.reports (program_id);
create index if not exists reports_ip_hash_idx on public.reports (reporter_ip_hash);

-- ---------------------------------------------------------------------------
-- moderation_logs (append-only audit log)
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id),
  target_type text not null,
  target_id   uuid,
  action      text not null,
  reason      text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists moderation_logs_created_idx
  on public.moderation_logs (created_at desc);
create index if not exists moderation_logs_actor_idx
  on public.moderation_logs (actor_id);
create index if not exists moderation_logs_target_idx
  on public.moderation_logs (target_type, target_id);

drop trigger if exists trg_moderation_logs_immutable on public.moderation_logs;
create trigger trg_moderation_logs_immutable
  before update or delete on public.moderation_logs
  for each row execute function public.forbid_mutation();

-- ---------------------------------------------------------------------------
-- contribution_history (append-only, menyimpan diff JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.contribution_history (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid not null references public.assistance_programs (id) on delete cascade,
  contributor_id uuid references public.profiles (id),
  action         text not null,
  previous_data  jsonb,
  new_data       jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists contribution_history_program_idx
  on public.contribution_history (program_id, created_at desc);

drop trigger if exists trg_contribution_history_immutable on public.contribution_history;
create trigger trg_contribution_history_immutable
  before update or delete on public.contribution_history
  for each row execute function public.forbid_mutation();
