-- 0030 — Bersihkan program uji kendali masa berlaku
--
-- Skrip `scripts/verify-expiry-controls.mjs` membuat satu program sementara
-- berstatus verified lalu menandainya kedaluwarsa lewat UI. Riwayat kontribusi
-- dan audit log sengaja append-only, sehingga pembersihan ini mematikan kedua
-- trigger HANYA selama transaksi ini lalu menyalakannya kembali.
--
-- Tanpa pembersihan, entri "Uji kendali masa berlaku" akan tertinggal di
-- katalog publik dan audit log.

begin;

alter table public.contribution_history
  disable trigger trg_contribution_history_immutable;
alter table public.moderation_logs
  disable trigger trg_moderation_logs_immutable;

delete from public.contribution_history
where program_id = 'e3a4aecd-a5d5-4096-b49a-b0c7a9f8997f';

delete from public.moderation_logs
where target_id = 'e3a4aecd-a5d5-4096-b49a-b0c7a9f8997f';

delete from public.notifications
where metadata->>'program_id' = 'e3a4aecd-a5d5-4096-b49a-b0c7a9f8997f';

delete from public.assistance_programs
where id = 'e3a4aecd-a5d5-4096-b49a-b0c7a9f8997f';

alter table public.contribution_history
  enable trigger trg_contribution_history_immutable;
alter table public.moderation_logs
  enable trigger trg_moderation_logs_immutable;

commit;
