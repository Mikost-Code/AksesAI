-- =============================================================================
-- 0005 — Row Level Security untuk semua tabel
-- =============================================================================
-- Prinsip (docs/SECURITY.md §3, DATABASE_SCHEMA.md §5):
--  * default-deny; semua tabel di-RLS-kan.
--  * user_roles / moderation_logs / contribution_history TIDAK punya policy
--    tulis untuk klien → hanya lewat RPC security definer.
--  * perubahan status program hanya lewat RPC (trigger penjaga tambahan).
-- =============================================================================

alter table public.profiles             enable row level security;
alter table public.user_roles           enable row level security;
alter table public.categories           enable row level security;
alter table public.assistance_programs  enable row level security;
alter table public.sources              enable row level security;
alter table public.reports              enable row level security;
alter table public.moderation_logs      enable row level security;
alter table public.contribution_history enable row level security;
alter table public.site_settings        enable row level security;
alter table public.rate_limit_buckets   enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Publik hanya melihat profil yang tidak dihapus. Pengguna dapat melihat
-- profilnya sendiri (untuk pengelolaan akun).
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select
  using (not is_deleted or id = auth.uid());

-- Pemilik boleh mengubah bio saja. is_banned / is_deleted / username TIDAK
-- dapat diubah pengguna (perubahan kolom dijaga trigger).
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Tidak ada policy INSERT (dibuat trigger) atau DELETE (anonimisasi via RPC).

-- Trigger penjaga: cegah pengguna mengubah kolom terlarang di profiles.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Admin & operator internal (service_role) boleh mengubah; pengguna biasa tidak.
  if current_user in ('authenticated', 'anon') then
    if new.is_banned is distinct from old.is_banned
       or new.is_deleted is distinct from old.is_deleted
       or new.github_username is distinct from old.github_username
       or new.id is distinct from old.id then
      raise exception 'Kolom tersebut hanya dapat diubah oleh sistem/admin.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ---------------------------------------------------------------------------
-- user_roles — baca milik sendiri (atau admin). Tanpa policy tulis.
-- ---------------------------------------------------------------------------
drop policy if exists roles_read_own on public.user_roles;
create policy roles_read_own on public.user_roles
  for select
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- categories — baca aktif (atau admin). Tulis hanya via RPC admin.
-- ---------------------------------------------------------------------------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select
  using (is_active or public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- assistance_programs
-- ---------------------------------------------------------------------------
drop policy if exists programs_public_read on public.assistance_programs;
create policy programs_public_read on public.assistance_programs
  for select
  using (status in ('verified', 'expired'));

drop policy if exists programs_owner_read on public.assistance_programs;
create policy programs_owner_read on public.assistance_programs
  for select
  using (contributor_id = auth.uid());

drop policy if exists programs_staff_read on public.assistance_programs;
create policy programs_staff_read on public.assistance_programs
  for select
  using (public.has_any_role(auth.uid(), array['reviewer', 'moderator', 'admin']::public.app_role[]));

-- Buat: sebagai diri sendiri, status draft, tidak diblokir.
drop policy if exists programs_insert on public.assistance_programs;
create policy programs_insert on public.assistance_programs
  for insert
  with check (
    contributor_id = auth.uid()
    and status = 'draft'
    and not public.is_user_banned(auth.uid())
  );

-- Edit pemilik: hanya saat draft/needs_changes; status tidak boleh diubah ke
-- status lain lewat UPDATE langsung (dijaga trigger programs_guard_status).
drop policy if exists programs_owner_update on public.assistance_programs;
create policy programs_owner_update on public.assistance_programs
  for update
  using (
    contributor_id = auth.uid()
    and status in ('draft', 'needs_changes')
    and not public.is_user_banned(auth.uid())
  )
  with check (
    contributor_id = auth.uid()
    and status in ('draft', 'needs_changes')
  );

-- Hapus permanen: tidak diizinkan untuk kontributor (gunakan arsip).
-- Admin pun hanya lewat RPC (tidak ada policy DELETE).

-- Trigger penjaga: perubahan kolom sistem & status hanya lewat RPC.
create or replace function public.programs_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    -- Status hanya boleh diubah melalui RPC security definer.
    if new.status is distinct from old.status then
      raise exception 'Perubahan status hanya melalui alur review yang sah.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.contributor_id is distinct from old.contributor_id
       or new.reviewer_id is distinct from old.reviewer_id
       or new.claimed_by is distinct from old.claimed_by
       or new.claimed_at is distinct from old.claimed_at
       or new.verified_at is distinct from old.verified_at
       or new.review_note is distinct from old.review_note
       or new.slug is distinct from old.slug then
      raise exception 'Kolom tersebut hanya dapat diubah oleh sistem/reviewer.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_programs_guard on public.assistance_programs;
create trigger trg_programs_guard
  before update on public.assistance_programs
  for each row execute function public.programs_guard_privileged_columns();

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
drop policy if exists sources_read on public.sources;
create policy sources_read on public.sources
  for select
  using (
    exists (
      select 1 from public.assistance_programs p
      where p.id = sources.program_id
        and (
          p.status in ('verified', 'expired')
          or p.contributor_id = auth.uid()
          or public.has_any_role(auth.uid(), array['reviewer', 'moderator', 'admin']::public.app_role[])
        )
    )
  );

drop policy if exists sources_owner_write on public.sources;
create policy sources_owner_write on public.sources
  for all
  using (
    exists (
      select 1 from public.assistance_programs p
      where p.id = sources.program_id
        and p.contributor_id = auth.uid()
        and p.status in ('draft', 'needs_changes')
    )
  )
  with check (
    exists (
      select 1 from public.assistance_programs p
      where p.id = sources.program_id
        and p.contributor_id = auth.uid()
        and p.status in ('draft', 'needs_changes')
    )
  );

-- ---------------------------------------------------------------------------
-- reports — insert oleh pemilik (login) atau service_role (anonim).
-- ---------------------------------------------------------------------------
drop policy if exists reports_insert_auth on public.reports;
create policy reports_insert_auth on public.reports
  for insert
  with check (
    reporter_id = auth.uid()
    and not public.is_user_banned(auth.uid())
  );

drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
  for select
  using (reporter_id = auth.uid());

drop policy if exists reports_read_mod on public.reports;
create policy reports_read_mod on public.reports
  for select
  using (public.has_any_role(auth.uid(), array['moderator', 'admin']::public.app_role[]));

-- Update: hanya lewat RPC moderator (tidak ada policy UPDATE).

-- ---------------------------------------------------------------------------
-- moderation_logs — baca admin saja; tanpa policy tulis.
-- ---------------------------------------------------------------------------
drop policy if exists modlogs_admin_read on public.moderation_logs;
create policy modlogs_admin_read on public.moderation_logs
  for select
  using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- contribution_history — pemilik program atau staf.
-- ---------------------------------------------------------------------------
drop policy if exists history_read on public.contribution_history;
create policy history_read on public.contribution_history
  for select
  using (
    exists (
      select 1 from public.assistance_programs p
      where p.id = contribution_history.program_id
        and (
          p.contributor_id = auth.uid()
          or public.has_any_role(auth.uid(), array['reviewer', 'moderator', 'admin']::public.app_role[])
        )
    )
  );

-- ---------------------------------------------------------------------------
-- site_settings — baca publik (tidak menyimpan rahasia). Tulis via RPC admin.
-- ---------------------------------------------------------------------------
drop policy if exists settings_read on public.site_settings;
create policy settings_read on public.site_settings
  for select
  using (true);

-- ---------------------------------------------------------------------------
-- rate_limit_buckets — tanpa policy (hanya fungsi security definer).
-- ---------------------------------------------------------------------------
