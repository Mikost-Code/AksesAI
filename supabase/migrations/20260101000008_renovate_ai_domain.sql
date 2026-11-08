-- =============================================================================
-- 0008 — Renovasi domain: bansos → direktori info AI gratis/murah (AksesAI)
--
-- Migrasi ini mengubah arti tabel yang sudah ada, BUKAN membuat tabel baru,
-- agar seluruh RLS, RPC transisi status, trigger penjaga, dan tes yang sudah
-- teruji tetap berlaku.
--
-- Pemetaan konsep:
--   program bantuan sosial      → entri info AI (provider/akses gratis/murah)
--   region_scope (wilayah)      → access_type (jenis akses: api/chat/tool/hosting/model)
--   organizer (penyelenggara)   → provider (nama provider/platform)
--   requirements (persyaratan)  → requirements (syarat mengakses, tetap relevan)
--   published_at/start/end      → promo_start/promo_end (masa berlaku promo)
--
-- Kolom baru khusus domain AI:
--   free_tier            teks kuota/benefit gratis (mis. "5 USD kredit, 3 bulan")
--   free_tier_available  boolean, ada free tier atau tidak
--   requires_card        boolean, perlu kartu kredit untuk daftar
--   price_input_per_mtok numeric, harga per 1 juta token input (USD)
--   price_output_per_mtok numeric, harga per 1 juta token output (USD)
--   rate_limit_rpm       integer, batas request per menit (opsional)
--   context_window       integer, ukuran konteks token (opsional)
--
-- Semua penambahan bersifat nullable/default agar baris lama (bila ada) tetap
-- valid. Untuk instalasi baru, seed.sql mengisi data yang benar.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enum baru: jenis akses AI + status ketersediaan
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.access_type as enum (
    'api',        -- API / endpoint model
    'chat',       -- aplikasi chat / playground
    'tool',       -- tool AI (coding assistant, image gen, dsb.)
    'hosting',    -- hosting gratis untuk model/aplikasi AI
    'model'       -- model open-weight yang bisa dijalankan gratis
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Kolom domain AI pada assistance_programs
-- ---------------------------------------------------------------------------
alter table public.assistance_programs
  add column if not exists access_type public.access_type not null default 'api',
  add column if not exists provider text,
  add column if not exists free_tier text,
  add column if not exists free_tier_available boolean not null default true,
  add column if not exists requires_card boolean not null default false,
  add column if not exists price_input_per_mtok numeric(12, 4),
  add column if not exists price_output_per_mtok numeric(12, 4),
  add column if not exists rate_limit_rpm integer,
  add column if not exists context_window integer,
  add column if not exists promo_start date,
  add column if not exists promo_end date;

-- Backfill `provider` dari `organizer` agar baris lama (kalau ada) tidak kosong.
update public.assistance_programs
   set provider = organizer
 where provider is null;

update public.assistance_programs
   set promo_start = published_at
 where promo_start is null;

update public.assistance_programs
   set promo_end = end_date
 where promo_end is null;

-- Nilai wajar untuk batas angka.
alter table public.assistance_programs
  drop constraint if exists programs_price_nonneg;
alter table public.assistance_programs
  add constraint programs_price_nonneg check (
    (price_input_per_mtok  is null or price_input_per_mtok  >= 0) and
    (price_output_per_mtok is null or price_output_per_mtok >= 0)
  );

alter table public.assistance_programs
  drop constraint if exists programs_rate_limit_positive;
alter table public.assistance_programs
  add constraint programs_rate_limit_positive check (
    rate_limit_rpm is null or rate_limit_rpm > 0
  );

alter table public.assistance_programs
  drop constraint if exists programs_context_window_positive;
alter table public.assistance_programs
  add constraint programs_context_window_positive check (
    context_window is null or context_window > 0
  );

alter table public.assistance_programs
  drop constraint if exists programs_free_tier_length;
alter table public.assistance_programs
  add constraint programs_free_tier_length check (
    free_tier is null or char_length(free_tier) <= 500
  );

alter table public.assistance_programs
  drop constraint if exists programs_provider_length;
alter table public.assistance_programs
  add constraint programs_provider_length check (
    provider is null or char_length(provider) between 2 and 150
  );

-- Index untuk filter baru.
create index if not exists assistance_programs_access_type_idx
  on public.assistance_programs (access_type);
create index if not exists assistance_programs_free_tier_idx
  on public.assistance_programs (free_tier_available, requires_card);
create index if not exists assistance_programs_promo_end_idx
  on public.assistance_programs (promo_end)
  where status = 'verified';

-- ---------------------------------------------------------------------------
-- 3. Rebuild kolom pencarian agar memuat provider & free_tier
--    (generated column tidak bisa diubah in-place; drop + add ulang)
-- ---------------------------------------------------------------------------
drop index if exists public.assistance_programs_search_idx;
alter table public.assistance_programs drop column if exists search_tsv;
alter table public.assistance_programs
  add column search_tsv tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(provider, '') || ' ' ||
      coalesce(organizer, '') || ' ' ||
      coalesce(free_tier, '')
    )
  ) stored;
create index if not exists assistance_programs_search_idx
  on public.assistance_programs using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- 4. Jenis sumber disesuaikan konteks AI
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.source_type_v2 as enum (
    'dokumentasi_resmi',   -- docs.provider.com
    'halaman_harga',       -- pricing page
    'blog_provider',       -- pengumuman/promo resmi
    'repo_resmi',          -- GitHub/GitLab resmi
    'media_tepercaya',     -- artikel media teknologi kredibel
    'lainnya'
  );
exception when duplicate_object then null; end $$;

-- Petakan nilai lama ke nilai baru sebelum mengganti tipe.
alter table public.sources
  add column if not exists source_type_v2 public.source_type_v2 not null default 'lainnya';

update public.sources
   set source_type_v2 = case source_type::text
     when 'situs_resmi'        then 'dokumentasi_resmi'::public.source_type_v2
     when 'media_massa'        then 'media_tepercaya'::public.source_type_v2
     when 'media_sosial_resmi' then 'blog_provider'::public.source_type_v2
     when 'dokumen'            then 'dokumentasi_resmi'::public.source_type_v2
     else 'lainnya'::public.source_type_v2
   end
 where source_type_v2 = 'lainnya';

alter table public.sources drop column if exists source_type;
alter table public.sources rename column source_type_v2 to source_type;

-- ---------------------------------------------------------------------------
-- 5. Alasan laporan disesuaikan: info AI cepat berubah
-- ---------------------------------------------------------------------------
alter type public.report_reason add value if not exists 'kuota_berubah';
alter type public.report_reason add value if not exists 'tidak_lagi_gratis';
alter type public.report_reason add value if not exists 'harga_salah';

-- ---------------------------------------------------------------------------
-- 6. Perbarui fungsi slug: awalan generik 'entri'
-- ---------------------------------------------------------------------------
create or replace function public.generate_program_slug(input text)
returns text
language plpgsql
as $$
declare
  base text;
begin
  base := left(nullif(public.slugify(input), ''), 80);
  if base is null then
    base := 'entri';
  end if;
  return base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Hapus kategori lama (bansos) HANYA jika tidak dipakai program apa pun.
--    Penyisipan kategori AI dilakukan di seed.sql agar satu sumber kebenaran.
-- ---------------------------------------------------------------------------
delete from public.categories c
 where c.slug in (
   'pendidikan','kesehatan','pangan-sembako','tunai-subsidi','perumahan',
   'disabilitas-lansia','umkm-usaha','bencana-darurat'
 )
 and not exists (
   select 1 from public.assistance_programs p where p.category_id = c.id
 );

-- ---------------------------------------------------------------------------
-- 8. Perbarui site_settings: disclaimer & ambang kedaluwarsa promo
-- ---------------------------------------------------------------------------
update public.site_settings
   set value = to_jsonb('Terverifikasi berarti entri telah diperiksa reviewer terhadap dokumentasi atau halaman resmi provider pada saat peninjauan. Kuota gratis, harga, dan promo dapat berubah sewaktu-waktu tanpa pemberitahuan. Selalu periksa halaman resmi provider sebelum mendaftar.'::text)
 where key = 'disclaimer_text';

insert into public.site_settings (key, value)
values
  ('disclaimer_text', to_jsonb('Terverifikasi berarti entri telah diperiksa reviewer terhadap dokumentasi atau halaman resmi provider pada saat peninjauan. Kuota gratis, harga, dan promo dapat berubah sewaktu-waktu tanpa pemberitahuan. Selalu periksa halaman resmi provider sebelum mendaftar.'::text)),
  ('expiring_soon_days', to_jsonb(7)),
  ('max_pending_per_day', to_jsonb(10)),
  ('report_rate_per_hour', to_jsonb(5))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 9. Perbarui cron kedaluwarsa: baca promo_end (bukan end_date legacy).
--    Aplikasi hanya menulis promo_start/promo_end; RPC dari 0007 masih membaca
--    end_date sehingga auto-expire tidak akan pernah terpicu.
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
    where status = 'verified' and promo_end is not null and promo_end < current_date
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
