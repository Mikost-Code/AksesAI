-- =============================================================================
-- 0011 — Feedback "berguna" pada entri publik
-- =============================================================================
-- Pengunjung (anon sekalipun) dapat menilai apakah sebuah entri berguna.
-- Identitas pemilih HANYA disimpan sebagai hash (sha256 + salt, dihitung di
-- server) — IP mentah atau akun tidak pernah tersedia di tabel ini.
-- Tulis & baca agregat hanya lewat RPC security definer; tabel tidak punya
-- policy klien (default-deny).
-- =============================================================================

create table if not exists public.program_feedback (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.assistance_programs(id) on delete cascade,
  voter_hash   text not null,
  is_helpful   boolean not null,
  created_at   timestamptz not null default now(),
  unique (program_id, voter_hash)
);

create index if not exists program_feedback_program_idx
  on public.program_feedback (program_id);

alter table public.program_feedback enable row level security;

-- ---------------------------------------------------------------------------
-- record_program_feedback: simpan/ubah suara, balikkan agregat terkini
-- ---------------------------------------------------------------------------
create or replace function public.record_program_feedback(
  p_program_id uuid,
  p_voter_hash text,
  p_is_helpful boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_counts jsonb;
begin
  -- voter_hash wajib hex sha256 (64 karakter) — dihitung server, bukan klien.
  if p_voter_hash is null or p_voter_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Identitas pemilih tidak valid.' using errcode = '22000';
  end if;

  if not exists (
    select 1 from public.assistance_programs
    where id = p_program_id and status in ('verified', 'expired')
  ) then
    raise exception 'Entri tidak ditemukan atau tidak dapat dinilai.' using errcode = 'P0002';
  end if;

  insert into public.program_feedback (program_id, voter_hash, is_helpful)
  values (p_program_id, p_voter_hash, p_is_helpful)
  on conflict (program_id, voter_hash)
  do update set is_helpful = excluded.is_helpful, created_at = now();

  select jsonb_build_object(
    'helpful', count(*) filter (where is_helpful),
    'notHelpful', count(*) filter (where not is_helpful)
  )
  into v_counts
  from public.program_feedback
  where program_id = p_program_id;

  return v_counts;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_program_feedback: agregat publik (tanpa membocorkan baris per pemilih)
-- ---------------------------------------------------------------------------
create or replace function public.get_program_feedback(p_program_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'helpful', count(*) filter (where is_helpful),
    'notHelpful', count(*) filter (where not is_helpful)
  )
  from public.program_feedback
  where program_id = p_program_id;
$$;

-- ---------------------------------------------------------------------------
-- Hak eksekusi: anon & authenticated (validasi ketat ada di dalam fungsi).
-- CATATAN KEAMANAN: `p_voter_hash` dihitung server, jadi RPC ini sebenarnya
-- HANYA boleh dipanggil dari server (server action). Memberi EXECUTE ke `anon`
-- membuat siapa pun yang punya anon key dapat memalsukan hash dan menggelembungkan
-- suara. Migrasi 0012 mencabut akses anon/authenticated; jalankan migrasi itu.
-- ---------------------------------------------------------------------------
revoke all on function public.record_program_feedback(uuid, text, boolean) from anon, authenticated, public;
grant execute on function public.record_program_feedback(uuid, text, boolean) to anon, authenticated;
revoke all on function public.get_program_feedback(uuid) from anon, authenticated, public;
grant execute on function public.get_program_feedback(uuid) to anon, authenticated;
