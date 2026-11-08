-- Pembersihan data uji + penonaktifan sementara trigger append-only.
--
-- `contribution_history` sengaja append-only (trigger `forbid_mutation`).
-- Cascade delete program akan ikut menghapus baris riwayat dan ditolak trigger.
-- Untuk membersihkan data uji ini, trigger dimatikan HANYA selama transaksi
-- pembersihan lalu dinyalakan kembali — pola yang sama dipakai saat admin
-- menganonimkan program.
begin;

-- 1. Matikan trigger append-only sementara (khusus transaksi ini).
alter table public.contribution_history
  disable trigger trg_contribution_history_immutable;

-- 2. Hapus riwayat milik program uji.
delete from public.contribution_history
where program_id in (
  select id from public.assistance_programs where slug like 'uji-notif-review-%'
);

-- 3. Hapus program uji (cascade ke sources).
delete from public.assistance_programs
where slug like 'uji-notif-review-%';

-- 4. Hapus notifikasi uji & diagnostik.
delete from public.notifications
where kind in ('diag_tmp', 'diag_tmp2', 'diag_tmp3')
   or title like 'Uji diagnostik%'
   or title like 'Kontribusi baru: Uji notifikasi antrean review%';

-- 5. Hapus fungsi diagnostik sementara.
drop function if exists public.diag_notif();
drop function if exists public.diag_def();

-- 6. Nyalakan kembali trigger append-only.
alter table public.contribution_history
  enable trigger trg_contribution_history_immutable;

commit;
