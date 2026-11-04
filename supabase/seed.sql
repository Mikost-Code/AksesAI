-- =============================================================================
-- Seed data: kategori awal & site_settings — AksesAI
-- Direktori info "gratisan & murah" seputar AI (API/token gratis, free tier,
-- model open-weight, tool gratis, hosting gratis, promo).
--
-- Aman dijalankan berulang (on conflict do nothing).
-- TIDAK membuat akun admin atau data pengguna (bootstrap admin manual).
-- =============================================================================

-- Bersihkan kategori domain lama (bansos) bila masih ada dan tidak terpakai,
-- agar instalasi lama yang menjalankan ulang seed ikut bersih.
delete from public.categories c
 where c.slug in (
   'pendidikan','kesehatan','pangan-sembako','tunai-subsidi','perumahan',
   'disabilitas-lansia','umkm-usaha','bencana-darurat'
 )
 and not exists (
   select 1 from public.assistance_programs p where p.category_id = c.id
 );

insert into public.categories (name, slug, description, is_active, sort_order)
values
  ('Free API & Token',        'free-api',        'Provider AI dengan API/token gratis atau kredit awal tanpa biaya.', true, 10),
  ('Free Tier Model',         'free-tier-model', 'Model yang bisa dipakai gratis lewat paket free tier provider.',   true, 20),
  ('Murah / Hemat Biaya',     'murah-hemat',     'API dengan harga per token paling kompetitif.',                      true, 30),
  ('Model Open-Weight',       'open-weight',     'Model terbuka yang bisa dijalankan sendiri tanpa biaya lisensi.',    true, 40),
  ('Tool AI Gratis',          'tool-ai-gratis',  'Aplikasi/tool AI yang bisa dipakai gratis (chat, coding, gambar).', true, 50),
  ('Hosting Gratis',          'hosting-gratis',  'Hosting gratis untuk model atau aplikasi AI (Spaces, Colab, dsb.).', true, 60),
  ('Promo & Kredit Terbatas', 'promo-kredit',    'Promo kredit/diskon yang berlaku untuk waktu terbatas.',             true, 70),
  ('Lainnya',                 'lainnya',         'Info AI gratis/murah lainnya.',                                      true, 90)
on conflict (slug) do nothing;

insert into public.site_settings (key, value)
values
  ('disclaimer_text', to_jsonb('Terverifikasi berarti entri telah diperiksa reviewer terhadap dokumentasi atau halaman resmi provider pada saat peninjauan. Kuota gratis, harga, dan promo dapat berubah sewaktu-waktu tanpa pemberitahuan. Selalu periksa halaman resmi provider sebelum mendaftar.'::text)),
  ('expiring_soon_days', to_jsonb(7)),
  ('max_pending_per_day', to_jsonb(10)),
  ('report_rate_per_hour', to_jsonb(5))
on conflict (key) do nothing;
