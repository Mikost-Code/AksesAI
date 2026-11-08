-- 0015 — Perbaiki penulisan notifikasi dari RPC SECURITY DEFINER
--
-- MASALAH YANG DITEMUKAN SAAT UJI 0014:
-- `submit_program` menulis notifikasi untuk staf, tetapi hasilnya SELALU 0 baris
-- dan tidak memunculkan error apa pun. Penyebabnya bukan SQL notifikasinya —
-- melainkan Row Level Security.
--
-- Tabel `notifications` mengaktifkan RLS dengan policy SELECT dan UPDATE saja;
-- tidak ada policy INSERT (memang disengaja: klien tidak boleh menulis
-- notifikasi). Tetapi RLS di Postgres berlaku juga untuk fungsi SECURITY
-- DEFINER: fungsi itu berjalan sebagai `postgres`, dan `postgres` adalah
-- pemilik tabel — bukan superuser — sehingga tetap tunduk pada RLS kecuali
-- tabelnya memiliki `force row level security` (tidak ada) atau pemiliknya
-- dikecualikan lewat policy.
--
-- Akibatnya `insert ... select` dari dalam RPC disaring oleh RLS. Karena
-- `auth.uid()` saat itu adalah KONTRIBUTOR (bukan staf penerima), semua baris
-- dibuang tanpa error. Itu jenis kegagalan paling berbahaya: senyap.
--
-- PERBAIKAN:
-- Policy ditulis eksplisit untuk role `authenticated` saja. Dengan begitu:
--   * klien (`authenticated`) tetap TIDAK punya policy INSERT → tidak berubah,
--     klien masih tidak bisa menulis notifikasi sendiri;
--   * fungsi SECURITY DEFINER berjalan sebagai `postgres` (pemilik tabel) yang
--     tidak termasuk role `authenticated`, sehingga INSERT dari RPC lolos.
--
-- Policy SELECT/UPDATE yang ada juga dipersempit ke `authenticated` agar
-- perilakunya eksplisit dan tidak bergantung pada default role.

-- ---------------------------------------------------------------------------
-- 1. Policy dibatasi ke role authenticated
-- ---------------------------------------------------------------------------
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Beri tahu bila nanti ada yang menambah policy INSERT untuk authenticated
-- ---------------------------------------------------------------------------
comment on table public.notifications is
  'Notifikasi in-app. Ditulis HANYA oleh fungsi SECURITY DEFINER (verify_program, '
  'request_changes, reject_program, notify_ending_promos, submit_program). '
  'Sengaja TIDAK ada policy INSERT untuk role authenticated: klien tidak boleh '
  'membuat notifikasi. Policy dibatasi ke role authenticated agar fungsi '
  'SECURITY DEFINER (berjalan sebagai pemilik tabel) dapat menulis.';

-- ---------------------------------------------------------------------------
-- 3. Verifikasi mandiri: pastikan tidak ada policy INSERT untuk authenticated
-- ---------------------------------------------------------------------------
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'notifications'
    and cmd = 'INSERT';

  if v_count > 0 then
    raise exception
      'Policy INSERT pada notifications ditemukan (%). Klien tidak boleh dapat '
      'menulis notifikasi; hapus policy tersebut sebelum melanjutkan.', v_count;
  end if;
end $$;
