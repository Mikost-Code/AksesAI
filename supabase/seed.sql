-- =============================================================================
-- Seed data: kategori awal & site_settings
-- Aman dijalankan berulang (on conflict do nothing).
-- TIDAK membuat akun admin atau data pengguna (bootstrap admin manual).
-- =============================================================================

insert into public.categories (name, slug, description, is_active, sort_order)
values
  ('Pendidikan', 'pendidikan', 'Beasiswa, bantuan sekolah, dan biaya pendidikan.', true, 10),
  ('Kesehatan', 'kesehatan', 'Bantuan biaya pengobatan, BPJS, dan layanan kesehatan.', true, 20),
  ('Pangan & Sembako', 'pangan-sembako', 'Bantuan pangan, sembako, dan gizi keluarga.', true, 30),
  ('Tunai & Subsidi', 'tunai-subsidi', 'Bantuan tunai langsung dan subsidi pemerintah.', true, 40),
  ('Perumahan', 'perumahan', 'Bantuan rumah layak huni dan renovasi.', true, 50),
  ('Disabilitas & Lansia', 'disabilitas-lansia', 'Bantuan untuk penyandang disabilitas dan lansia.', true, 60),
  ('UMKM & Usaha', 'umkm-usaha', 'Modal usaha, pelatihan, dan pendampingan UMKM.', true, 70),
  ('Bencana & Darurat', 'bencana-darurat', 'Bantuan bencana alam dan kondisi darurat.', true, 80),
  ('Lainnya', 'lainnya', 'Informasi bantuan sosial lainnya.', true, 90)
on conflict (slug) do nothing;

insert into public.site_settings (key, value)
values
  ('disclaimer_text', to_jsonb('Terverifikasi berarti informasi telah diperiksa oleh reviewer berdasarkan sumber yang tersedia. Ini bukan jaminan pemerintah dan bukan jaminan bantuan masih tersedia. Selalu periksa sumber resmi.'::text)),
  ('expiring_soon_days', to_jsonb(14)),
  ('max_pending_per_day', to_jsonb(10)),
  ('report_rate_per_hour', to_jsonb(5))
on conflict (key) do nothing;
