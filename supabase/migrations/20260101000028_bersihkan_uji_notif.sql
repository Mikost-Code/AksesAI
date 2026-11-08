-- Bersihkan sisa uji notifikasi antrean review (program + notifikasi).
-- `contribution_history` bersifat append-only sehingga trigger dimatikan
-- HANYA selama transaksi pembersihan ini, lalu dinyalakan kembali.
begin;

alter table public.contribution_history
  disable trigger trg_contribution_history_immutable;

delete from public.notifications
where metadata->>'slug' like 'uji-notif-review-%'
   or metadata->>'slug' like 'diag-prog-%'
   or kind in ('diag_tmp', 'diag_tmp2', 'diag_tmp3');

delete from public.contribution_history
where program_id in (
  select id from public.assistance_programs
  where slug like 'uji-notif-review-%' or slug like 'diag-prog-%'
);

delete from public.assistance_programs
where slug like 'uji-notif-review-%' or slug like 'diag-prog-%';

alter table public.contribution_history
  enable trigger trg_contribution_history_immutable;

commit;
