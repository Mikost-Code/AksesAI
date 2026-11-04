# Database Schema — AksesAI

Supabase PostgreSQL. Semua tabel di schema `public`, **RLS aktif**. Dokumen ini mencerminkan **implementasi nyata** di `supabase/migrations/` (8 migrasi, `20260101000001`–`20260101000008`). Migrasi `0008` merenovasi domain: program bansos → **entri info AI gratis/murah**; kolom `region_scope`/`province`/`city`/`region`/`organizer`/`start_date`/`end_date` dipertahankan sebagai legacy, dengan kolom baru `access_type`, `provider`, `free_tier`, harga per token, dan `promo_start`/`promo_end`. Bila mengubah skema, perbarui dokumen ini pada PR yang sama.

## 1. Diagram Relasi

```text
auth.users 1─1 profiles 1─* user_roles
profiles 1─* assistance_programs (contributor_id, reviewer_id)
categories 1─* assistance_programs
assistance_programs 1─* sources
assistance_programs 1─* reports
assistance_programs 1─* contribution_history
profiles 1─* moderation_logs (actor_id)
```

## 2. Ekstensi & Enum

```sql
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create type app_role        as enum ('member','reviewer','moderator','admin');
create type program_status  as enum ('draft','pending','needs_changes','verified','rejected','expired','archived');
create type access_type     as enum ('api','chat','tool','hosting','model');
create type source_type     as enum ('dokumentasi_resmi','halaman_harga','blog_provider',
                                     'repo_resmi','media_tepercaya','lainnya');  -- migrasi 0008
create type report_reason   as enum ('tidak_akurat','kedaluwarsa','link_mati','duplikat','dugaan_penipuan','spam',
                                     'kuota_berubah','tidak_lagi_gratis','harga_salah');
create type report_status   as enum ('open','in_review','resolved','dismissed');

-- Legacy domain bansos (migrasi 0008): dipertahankan demi migrasi in-place, tidak dipakai UI.
create type region_scope    as enum ('nasional','provinsi','kabupaten_kota');
```

> Nilai enum disimpan dalam snake_case; label Bahasa Indonesia ada di UI.

## 3. Tabel

### 3.1 profiles
```sql
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  github_username text not null unique,
  github_avatar   text,
  github_url      text,
  bio             text check (char_length(bio) <= 300),
  is_banned       boolean not null default false,
  is_deleted      boolean not null default false,  -- anonimisasi saat akun dihapus
  created_at      timestamptz not null default now()
);

-- Buat profil otomatis dari metadata GitHub
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, github_username, github_avatar, github_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', 'user-' || left(new.id::text, 8)),
    new.raw_user_meta_data->>'avatar_url',
    'https://github.com/' || (new.raw_user_meta_data->>'user_name')
  );
  insert into user_roles (user_id, role) values (new.id, 'member');
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function handle_new_user();
```

### 3.2 user_roles
```sql
create table user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  role        app_role not null,
  assigned_by uuid references profiles(id),
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);
create index on user_roles (user_id);
```

### 3.3 categories
```sql
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  is_active   boolean not null default true,
  sort_order  int not null default 0
);
```
Seed awal (lihat `supabase/seed.sql`): Free API & Token, Free Tier Model, Murah / Hemat Biaya, Model Open-Weight, Tool AI Gratis, Hosting Gratis, Promo & Kredit Terbatas, Lainnya.

### 3.4 assistance_programs
```sql
create table assistance_programs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 10 and 150),
  slug          text not null unique,
  description   text not null check (char_length(description) between 50 and 3000),
  category_id   uuid not null references categories(id),

  -- Domain AI (migrasi 0008)
  access_type   access_type not null default 'api',  -- api/chat/tool/hosting/model
  provider      text check (provider is null or char_length(provider) between 2 and 150),
  free_tier     text check (free_tier is null or char_length(free_tier) <= 500),
                -- kuota/benefit gratis, mis. "5 USD kredit, 3 bulan"
  free_tier_available boolean not null default true,
  requires_card boolean not null default false,      -- perlu kartu kredit untuk daftar
  price_input_per_mtok  numeric(12, 4) check (price_input_per_mtok  is null or price_input_per_mtok  >= 0),
  price_output_per_mtok numeric(12, 4) check (price_output_per_mtok is null or price_output_per_mtok >= 0),
  rate_limit_rpm integer check (rate_limit_rpm is null or rate_limit_rpm > 0),
  context_window integer check (context_window is null or context_window > 0),
  promo_start   date,                       -- masa berlaku promo
  promo_end     date,

  -- Legacy domain bansos (dipertahankan, tidak dipakai UI)
  region_scope  region_scope not null default 'nasional',
  province      text,
  city          text,
  region        text generated always as (
                  coalesce(city || ', ', '') || coalesce(province, 'Nasional')
                ) stored,
  organizer     text not null,
  requirements  text,                       -- syarat akses, hanya yang tercantum di sumber
  published_at  date,                       -- tanggal publikasi/ditemukan
  start_date    date,
  end_date      date,

  status        program_status not null default 'draft',
  review_note   text,                       -- alasan revisi/penolakan terakhir
  contributor_id uuid not null references profiles(id),
  reviewer_id   uuid references profiles(id),
  claimed_by    uuid references profiles(id),
  claimed_at    timestamptz,
  verified_at   timestamptz,
  contributor_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search_tsv    tsvector generated always as (
                  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' ||
                              coalesce(provider,'') || ' ' || coalesce(organizer,'') || ' ' || coalesce(free_tier,''))
                ) stored,
  check (end_date is null or start_date is null or end_date >= start_date),
  check (region_scope <> 'provinsi' or province is not null),
  check (region_scope <> 'kabupaten_kota' or (province is not null and city is not null))
);
create index on assistance_programs using gin (search_tsv);
create index on assistance_programs using gin (title gin_trgm_ops);
create index on assistance_programs (status, published_at desc);
create index on assistance_programs (category_id);
create index on assistance_programs (province, city);        -- legacy
create index on assistance_programs (contributor_id);
create index on assistance_programs (end_date) where status = 'verified';   -- legacy
create index on assistance_programs (access_type);
create index on assistance_programs (free_tier_available, requires_card);
create index on assistance_programs (promo_end) where status = 'verified';
```

### 3.5 sources
```sql
create table sources (
  id                    uuid primary key default gen_random_uuid(),
  program_id            uuid not null references assistance_programs(id) on delete cascade,
  source_url            text not null check (source_url ~* '^https?://'),
  source_url_normalized text not null,      -- lowercase host, tanpa fragment/utm, tanpa trailing slash
  source_title          text,
  source_type           source_type not null default 'lainnya',
  is_primary            boolean not null default false,
  link_status           text,               -- 'ok' | 'broken' | null (diisi reviewer/cron opsional)
  last_checked_at       timestamptz,
  created_at            timestamptz not null default now(),
  unique (program_id, source_url_normalized)
);
create index on sources (source_url_normalized);
create unique index one_primary_per_program on sources (program_id) where is_primary;
```

### 3.6 reports
```sql
create table reports (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references assistance_programs(id) on delete cascade,
  reporter_id   uuid references profiles(id) on delete set null,  -- null = anonim
  reporter_ip_hash text,                    -- sha256(ip + IP_HASH_SALT); bukan IP mentah
  reason        report_reason not null,
  description   text not null check (char_length(description) between 10 and 1000),
  status        report_status not null default 'open',
  handled_by    uuid references profiles(id),
  resolution_note text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index on reports (status, reason, created_at);
create index on reports (program_id);
```

### 3.7 moderation_logs (audit log, append-only)
```sql
create table moderation_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),     -- null = sistem/cron
  target_type text not null,                    -- 'program' | 'report' | 'user' | 'role' | 'category' | 'setting'
  target_id   uuid,
  action      text not null,                    -- mis. 'program.verify', 'role.grant'
  reason      text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on moderation_logs (created_at desc);
create index on moderation_logs (actor_id);
create index on moderation_logs (target_type, target_id);
```

### 3.8 contribution_history
```sql
create table contribution_history (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid not null references assistance_programs(id) on delete cascade,
  contributor_id uuid references profiles(id),  -- pelaku perubahan
  action         text not null,                 -- 'create','edit','submit','withdraw','request_changes','verify','reject','expire','archive','reviewer_edit'
  previous_data  jsonb,
  new_data       jsonb,
  created_at     timestamptz not null default now()
);
create index on contribution_history (program_id, created_at desc);
```

### 3.9 site_settings
```sql
create table site_settings (
  key   text primary key,
  value jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
-- keys: disclaimer_text, expiring_soon_days (7), max_pending_per_day (10), report_rate_per_hour (5)
```

### 3.10 rate_limit_buckets

Fallback rate limiting berbasis PostgreSQL, dipakai ketika Upstash Redis tidak
dikonfigurasi.

```sql
create table public.rate_limit_buckets (
  bucket_key   text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket_key, window_start)
);
create index rate_limit_buckets_window_idx on public.rate_limit_buckets (window_start);
```

- Hanya ditulis lewat fungsi `security definer` `check_rate_limit` — tidak ada
  policy INSERT/UPDATE untuk klien, sehingga pengguna tidak bisa memalsukan counter.
- Baris lama dibersihkan oleh cron `/api/cron/cleanup`.

## 4. Fungsi Bantu

```sql
create function has_role(uid uuid, r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = uid and role = r);
$$;

create function has_any_role(uid uuid, rs app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = uid and role = any(rs));
$$;

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_programs_updated before update on assistance_programs
for each row execute function touch_updated_at();
```

## 5. Row Level Security

```sql
alter table profiles              enable row level security;
alter table user_roles            enable row level security;
alter table categories            enable row level security;
alter table assistance_programs   enable row level security;
alter table sources               enable row level security;
alter table reports               enable row level security;
alter table moderation_logs       enable row level security;
alter table contribution_history  enable row level security;
alter table site_settings         enable row level security;
```

### profiles
```sql
create policy profiles_read on profiles for select using (not is_deleted or id = auth.uid());
create policy profiles_update_own on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and is_banned = (select is_banned from profiles where id = auth.uid()));
-- is_banned hanya diubah lewat RPC moderator/admin.
```

### user_roles
```sql
create policy roles_read_own  on user_roles for select using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
-- INSERT/UPDATE/DELETE: tidak ada policy → hanya lewat RPC admin (security definer).
```

### categories
```sql
create policy categories_read on categories for select using (is_active or has_role(auth.uid(),'admin'));
-- Tulis: hanya via RPC admin.
```

### assistance_programs
```sql
-- Publik: Verified & Expired
create policy programs_public_read on assistance_programs for select
  using (status in ('verified','expired'));

-- Pemilik: semua miliknya
create policy programs_owner_read on assistance_programs for select
  using (contributor_id = auth.uid());

-- Reviewer/Admin: antrean & semua
create policy programs_staff_read on assistance_programs for select
  using (has_any_role(auth.uid(), array['reviewer','moderator','admin']::app_role[]));

-- Buat: sebagai diri sendiri, status awal draft, tidak banned
create policy programs_insert on assistance_programs for insert
  with check (
    contributor_id = auth.uid() and status = 'draft'
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
  );

-- Edit pemilik: hanya saat draft/needs_changes, dan status tidak boleh diubah langsung
create policy programs_owner_update on assistance_programs for update
  using (contributor_id = auth.uid() and status in ('draft','needs_changes'))
  with check (contributor_id = auth.uid() and status in ('draft','needs_changes'));
-- Perubahan status & aksi reviewer/moderator: hanya lewat RPC (security definer).
```

### sources
```sql
create policy sources_read on sources for select using (
  exists (select 1 from assistance_programs p where p.id = program_id and (
    p.status in ('verified','expired') or p.contributor_id = auth.uid()
    or has_any_role(auth.uid(), array['reviewer','moderator','admin']::app_role[])))
);
create policy sources_owner_write on sources for all using (
  exists (select 1 from assistance_programs p where p.id = program_id
          and p.contributor_id = auth.uid() and p.status in ('draft','needs_changes'))
) with check (
  exists (select 1 from assistance_programs p where p.id = program_id
          and p.contributor_id = auth.uid() and p.status in ('draft','needs_changes'))
);
```

### reports
```sql
-- Insert dilakukan lewat route handler (rate limit + Turnstile + hash IP) memakai service_role,
-- atau policy berikut untuk user login:
create policy reports_insert_auth on reports for insert
  with check (reporter_id = auth.uid());
create policy reports_read_own on reports for select using (reporter_id = auth.uid());
create policy reports_read_mod on reports for select
  using (has_any_role(auth.uid(), array['moderator','admin']::app_role[]));
-- Update: hanya via RPC moderator.
```

### moderation_logs & contribution_history
```sql
create policy modlogs_admin_read on moderation_logs for select using (has_role(auth.uid(),'admin'));
-- Tidak ada policy INSERT/UPDATE/DELETE untuk klien. Tulis hanya via RPC/trigger.
create policy history_read on contribution_history for select using (
  exists (select 1 from assistance_programs p where p.id = program_id and (
    p.contributor_id = auth.uid()
    or has_any_role(auth.uid(), array['reviewer','moderator','admin']::app_role[])))
);
-- Riwayat publik di halaman detail disajikan lewat view yang hanya menampilkan tanggal + aksi.

-- Proteksi data historis dari perubahan
create function forbid_mutation() returns trigger language plpgsql as $$
begin raise exception 'Tabel % bersifat append-only', tg_table_name; end $$;
create trigger modlogs_immutable before update or delete on moderation_logs
  for each row execute function forbid_mutation();
create trigger history_immutable before update or delete on contribution_history
  for each row execute function forbid_mutation();
```
> `contribution_history` memakai `on delete cascade` dari program; hapus program permanen hanya boleh oleh admin lewat prosedur khusus (jarang; prefer Archived). Pertimbangkan `on delete restrict` jika ingin arsip tak terhapus.

### site_settings
```sql
create policy settings_read on site_settings for select using (true);   -- tidak menyimpan rahasia
-- Tulis: via RPC admin.
```

## 6. RPC Transisi Status (security definer)

Semua fungsi: memeriksa `auth.uid()`, role, status saat ini (transisi valid), menulis `contribution_history` + `moderation_logs` dalam satu transaksi.

| Fungsi | Role | Transisi | Catatan |
|---|---|---|---|
| `submit_program(id)` | pemilik | draft/needs_changes → pending | Validasi lengkap, rate limit harian, ≥1 sumber, cek duplikasi |
| `withdraw_program(id)` | pemilik | pending → draft | |
| `claim_program(id)` | reviewer | (pending, tanpa claim aktif) | set `claimed_by/at`, kedaluwarsa 30 mnt |
| `request_changes(id, reason)` | reviewer | pending → needs_changes | reason ≥ 20 karakter; reviewer ≠ pemilik |
| `verify_program(id)` | reviewer | pending → verified | set `reviewer_id`, `verified_at`; reviewer ≠ pemilik |
| `reject_program(id, reason)` | reviewer | pending → rejected | reason ≥ 20 karakter |
| `reviewer_edit_program(id, patch)` | reviewer/admin | verified/pending (tetap) | simpan `previous_data/new_data` |
| `mark_expired(id)` | reviewer/admin/cron | verified → expired | |
| `archive_program(id, reason)` | moderator/admin | verified/expired/rejected → archived | |
| `reopen_for_review(id, reason)` | moderator/admin | verified/expired → pending | dari laporan |
| `resolve_report(id, action, note)` | moderator/admin | open/in_review → resolved/dismissed | |
| `set_user_banned(uid, bool, reason)` | moderator/admin | — | |
| `grant_role / revoke_role(uid, role)` | admin | — | tolak jika mencabut admin terakhir |
| `expire_due_programs()` | cron (service_role) | verified → expired jika `promo_end < current_date` | diperbarui migrasi 0008 (dari `end_date`) |

## 7. Akses Data Publik (tanpa view)

**Tidak ada view publik** di implementasi ini. Keputusan ini disengaja: view
`public_programs` sempat direncanakan, tetapi dibatalkan karena (a) view dengan
`security_invoker = true` tetap tunduk pada RLS tabel dasar sehingga tidak menambah
keamanan, dan (b) view tanpa `security_invoker` akan **melewati** RLS (risiko
kebocoran draft). Query publik cukup memakai RLS pada `assistance_programs`:

```sql
-- policy SELECT untuk anon & authenticated
using (status in ('verified', 'expired'))
```

Klien (anon key) hanya melihat baris berstatus `verified`/`expired`; draft, pending,
dan rejected tidak pernah terlihat publik — diverifikasi oleh
`tests/rls/access-control.test.ts`.

## 8. Query Pencarian (contoh)

```sql
select * from assistance_programs
where status = any($status)
  and ($q is null or search_tsv @@ plainto_tsquery('simple', $q) or title % $q)
  and ($category is null or category_id = $category)
  and ($akses is null or access_type = $akses::access_type)
  and ($gratis is null or free_tier_available = $gratis)
order by case when $q is null then 0 else ts_rank(search_tsv, plainto_tsquery('simple', $q)) end desc,
         published_at desc nulls last
limit 12 offset $offset;
```

## 9. Strategi Tes RLS

Untuk setiap tabel × role (visitor/anon, member A, member B, reviewer, moderator, admin) uji: SELECT yang diizinkan/ditolak, INSERT/UPDATE/DELETE langsung (harus ditolak kecuali dinyatakan), eskalasi role, reviewer memverifikasi miliknya sendiri (ditolak), mutasi tabel append-only (ditolak).
