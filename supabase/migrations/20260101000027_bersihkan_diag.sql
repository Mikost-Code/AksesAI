-- Bersihkan sisa uji & diagnostik (notifikasi + program diagnostik),
-- termasuk riwayat kontribusi (append-only) yang harus dimatikan sementara.
begin;

alter table public.contribution_history
  disable trigger trg_contribution_history_immutable;

delete from public.notifications
where kind in ('diag_tmp', 'diag_tmp2', 'diag_tmp3')
   or metadata->>'slug' like 'uji-notif-review-%'
   or metadata->>'slug' like 'diag-prog-%'
   or title like 'Uji diagnostik%'
   or title like 'Kontribusi baru: Uji notifikasi%'
   or title like 'Kontribusi baru: Program diagnostik%';

delete from public.contribution_history
where program_id in (
  select id from public.assistance_programs
  where slug like 'uji-notif-review-%' or slug like 'diag-prog-%'
);

delete from public.assistance_programs
where slug like 'uji-notif-review-%' or slug like 'diag-prog-%';

drop function if exists public.diag_notif();
drop function if exists public.diag_def();

alter table public.contribution_history
  enable trigger trg_contribution_history_immutable;

commit;
