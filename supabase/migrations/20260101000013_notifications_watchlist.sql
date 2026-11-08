-- =============================================================================
-- 0013 — Fitur produk: notifikasi, watchlist, riwayat harga, klik sumber,
--        dan pencarian full-text berbasis ranking.
-- =============================================================================
-- Semua tabel baru: default-deny (RLS aktif, tanpa policy tulis untuk klien).
-- Penulisan sensitif hanya lewat RPC `security definer` / `log_*` internal.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. notifications — kotak masuk kontributor & staf
-- ---------------------------------------------------------------------------
-- Pengguna hanya membaca notifikasi miliknya dan boleh menandai sudah dibaca
-- (update kolom `read_at` saja — dijaga trigger agar isi tidak dapat diubah).
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  href       text,
  metadata   jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(title) between 1 and 160),
  constraint notifications_body_length check (body is null or char_length(body) <= 1000)
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select
  using (user_id = auth.uid());

drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.notifications_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.user_id is distinct from old.user_id
       or new.kind is distinct from old.kind
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.href is distinct from old.href
       or new.metadata is distinct from old.metadata
       or new.created_at is distinct from old.created_at then
      raise exception 'Hanya status baca yang dapat diubah.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_guard on public.notifications;
create trigger trg_notifications_guard
  before update on public.notifications
  for each row execute function public.notifications_guard_columns();

-- ---------------------------------------------------------------------------
-- 2. program_watchlist — "ingatkan saya saat promo berakhir / berubah"
-- ---------------------------------------------------------------------------
create table if not exists public.program_watchlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.assistance_programs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, program_id)
);

create index if not exists program_watchlist_program_idx
  on public.program_watchlist (program_id);

alter table public.program_watchlist enable row level security;

drop policy if exists watchlist_read_own on public.program_watchlist;
create policy watchlist_read_own on public.program_watchlist
  for select
  using (user_id = auth.uid());

-- Masuk/keluar daftar hanya lewat RPC `toggle_program_watch` (cek entri publik).

-- ---------------------------------------------------------------------------
-- 3. Catat waktu notifikasi promo terakhir → cegah pengingat berulang.
-- ---------------------------------------------------------------------------
alter table public.assistance_programs
  add column if not exists promo_reminded_at timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Riwayat harga per entri (snapshot saat harga berubah / diverifikasi)
-- ---------------------------------------------------------------------------
create table if not exists public.program_price_history (
  id                    bigserial primary key,
  program_id            uuid not null references public.assistance_programs (id) on delete cascade,
  price_input_per_mtok  numeric(12, 4),
  price_output_per_mtok numeric(12, 4),
  free_tier             text,
  free_tier_available   boolean not null default true,
  source                text not null default 'auto',
  recorded_at           timestamptz not null default now()
);

create index if not exists program_price_history_program_idx
  on public.program_price_history (program_id, recorded_at desc);

alter table public.program_price_history enable row level security;

drop policy if exists price_history_read on public.program_price_history;
create policy price_history_read on public.program_price_history
  for select
  using (
    exists (
      select 1 from public.assistance_programs p
      where p.id = program_price_history.program_id
        and (
          p.status in ('verified', 'expired')
          or p.contributor_id = auth.uid()
          or public.has_any_role(auth.uid(), array['reviewer', 'moderator', 'admin']::public.app_role[])
        )
    )
  );

-- Tulis otomatis: hanya saat harga/kuota berubah (atau baris pertama).
create or replace function public.track_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.price_input_per_mtok is not null
       or new.price_output_per_mtok is not null
       or new.free_tier is not null then
      insert into public.program_price_history
        (program_id, price_input_per_mtok, price_output_per_mtok, free_tier, free_tier_available, source)
      values
        (new.id, new.price_input_per_mtok, new.price_output_per_mtok, new.free_tier, new.free_tier_available, 'create');
    end if;
    return new;
  end if;

  if new.price_input_per_mtok is distinct from old.price_input_per_mtok
     or new.price_output_per_mtok is distinct from old.price_output_per_mtok
     or new.free_tier is distinct from old.free_tier
     or new.free_tier_available is distinct from old.free_tier_available then
    insert into public.program_price_history
      (program_id, price_input_per_mtok, price_output_per_mtok, free_tier, free_tier_available, source)
    values
      (new.id, new.price_input_per_mtok, new.price_output_per_mtok, new.free_tier, new.free_tier_available,
       case when new.status = 'verified' and new.verified_at is distinct from old.verified_at
            then 'verify' else 'update' end);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_program_price_history on public.assistance_programs;
create trigger trg_program_price_history
  after insert or update of price_input_per_mtok, price_output_per_mtok, free_tier,
    free_tier_available, verified_at, status on public.assistance_programs
  for each row execute function public.track_price_history();

-- ---------------------------------------------------------------------------
-- 5. Klik sumber — sinyal kualitas ("tautan ini dipakai N pengunjung")
-- ---------------------------------------------------------------------------
alter table public.sources
  add column if not exists click_count bigint not null default 0;

create or replace function public.record_source_click(p_source_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  update public.sources s
  set click_count = s.click_count + 1
  from public.assistance_programs p
  where s.id = p_source_id
    and p.id = s.program_id
    and p.status in ('verified', 'expired')
  returning s.click_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.record_source_click(uuid) from anon, authenticated, public;
grant execute on function public.record_source_click(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Pencarian full-text berperingkat (menggantikan ilike berantai)
-- ---------------------------------------------------------------------------
-- Mengembalikan id + status saja; RLS tetap berlaku karena FUNGSI INI
-- SECURITY INVOKER (bukan definer) sehingga query dijalankan sebagai pemanggil.
create or replace function public.search_programs(
  p_query text,
  p_limit integer default 200
)
returns table (id uuid, status public.program_status, rank real)
language sql
stable
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('simple', coalesce(nullif(trim(p_query), ''), '')) as tsq
  )
  select
    p.id,
    p.status,
    ts_rank(p.search_tsv, q.tsq) as rank
  from public.assistance_programs p, q
  where p.search_tsv @@ q.tsq
    and p.status in ('verified', 'expired', 'pending')
  order by ts_rank(p.search_tsv, q.tsq) desc, p.verified_at desc nulls last
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

revoke all on function public.search_programs(text, integer) from anon, authenticated, public;
grant execute on function public.search_programs(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Notifikasi otomatis pada transisi status
-- ---------------------------------------------------------------------------
-- Dipanggil oleh RPC review/moderasi setelah perubahan status.
create or replace function public.notify_contributor(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_href text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, kind, title, body, href, metadata)
  values (p_user_id, p_kind, left(p_title, 160), left(nullif(p_body, ''), 1000), p_href, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.notify_contributor(uuid, text, text, text, text, jsonb) from anon, authenticated, public;
grant execute on function public.notify_contributor(uuid, text, text, text, text, jsonb) to service_role;

-- verify_program: beri tahu kontributor bahwa entri tayang.
create or replace function public.verify_program(p_program_id uuid)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat memverifikasi.' using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat memverifikasi kontribusi sendiri.' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat diverifikasi.' using errcode = '22000';
  end if;
  if not exists (select 1 from public.sources s where s.program_id = p_program_id) then
    raise exception 'Tidak dapat memverifikasi tanpa sumber.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'verified', reviewer_id = v_uid, verified_at = now(),
      review_note = null, claimed_by = null, claimed_at = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'verify',
    jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'verified'));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.verify');

  perform public.notify_contributor(
    v_row.contributor_id, 'program_verified',
    'Kontribusi Anda diverifikasi',
    format('%s kini tayang di direktori AksesAI.', v_row.title),
    '/info/' || v_row.slug,
    jsonb_build_object('program_id', p_program_id));

  return 'verified'::public.program_status;
end;
$$;

-- request_changes: beri tahu kontributor + sertakan alasan.
create or replace function public.request_changes(p_program_id uuid, p_reason text)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat meminta revisi.' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 20 then
    raise exception 'Alasan revisi minimal 20 karakter.' using errcode = '22000';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat meninjau kontribusi sendiri.' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat diminta revisi.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'needs_changes', review_note = trim(p_reason),
      claimed_by = null, claimed_at = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'request_changes',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'needs_changes', 'reason', trim(p_reason)));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.request_changes', trim(p_reason));

  perform public.notify_contributor(
    v_row.contributor_id, 'needs_changes',
    'Reviewer meminta revisi',
    trim(p_reason),
    '/dashboard/kontribusi/' || p_program_id::text,
    jsonb_build_object('program_id', p_program_id));

  return 'needs_changes'::public.program_status;
end;
$$;

-- reject_program: beri tahu kontributor + alasan.
create or replace function public.reject_program(p_program_id uuid, p_reason text)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null or not public.has_any_role(v_uid, array['reviewer','admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat menolak.' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 20 then
    raise exception 'Alasan penolakan minimal 20 karakter.' using errcode = '22000';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_row.contributor_id = v_uid then
    raise exception 'Anda tidak dapat menolak kontribusi sendiri.' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Hanya item pending yang dapat ditolak.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'rejected', reviewer_id = v_uid, review_note = trim(p_reason),
      claimed_by = null, claimed_at = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'reject',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'rejected', 'reason', trim(p_reason)));
  perform public.log_audit(v_uid, 'program', p_program_id, 'program.reject', trim(p_reason));

  perform public.notify_contributor(
    v_row.contributor_id, 'rejected',
    'Kontribusi Anda ditolak',
    trim(p_reason),
    '/dashboard/kontribusi/' || p_program_id::text,
    jsonb_build_object('program_id', p_program_id));

  return 'rejected'::public.program_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Pengingat promo: pemberi tahu siapa pun yang "ingatkan saya" + kontributor
-- ---------------------------------------------------------------------------
create or replace function public.notify_ending_promos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days integer;
  v_count integer := 0;
  r record;
begin
  v_days := coalesce((select (value #>> '{}')::int from public.site_settings where key = 'expiring_soon_days'), 7);

  for r in
    select p.id, p.slug, p.title, p.contributor_id, p.promo_end
    from public.assistance_programs p
    where p.status = 'verified'
      and p.promo_end is not null
      and p.promo_end between current_date and current_date + v_days
      and (p.promo_reminded_at is null or p.promo_reminded_at < current_date - interval '30 days')
    for update
  loop
    insert into public.notifications (user_id, kind, title, body, href, metadata)
    select w.user_id, 'promo_ending',
           'Promo hampir berakhir',
           format('%s berakhir pada %s.', r.title, to_char(r.promo_end, 'DD Mon YYYY')),
           '/info/' || r.slug,
           jsonb_build_object('program_id', r.id)
    from public.program_watchlist w
    where w.program_id = r.id;

    update public.assistance_programs set promo_reminded_at = now() where id = r.id;
    perform public.log_audit(null, 'system', r.id, 'cron.promo_reminder', null,
      jsonb_build_object('promo_end', r.promo_end));
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.notify_ending_promos() from anon, authenticated, public;
grant execute on function public.notify_ending_promos() to service_role;

-- ---------------------------------------------------------------------------
-- 9. Watchlist: toggle (dipakai server action / server component)
-- ---------------------------------------------------------------------------
create or replace function public.toggle_program_watch(p_program_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Harus masuk untuk menyimpan pengingat.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.assistance_programs
    where id = p_program_id and status in ('verified', 'expired')
  ) then
    raise exception 'Entri tidak ditemukan atau tidak dapat diingatkan.' using errcode = 'P0002';
  end if;

  -- Toggle dalam satu transaksi. `FOUND` di-set ulang oleh SETIAP statement
  -- yang memengaruhi baris, jadi nilainya DIBACA tepat setelah DELETE —
  -- jangan menyisipkan statement lain di antaranya.
  delete from public.program_watchlist
  where user_id = v_uid and program_id = p_program_id;

  if found then
    -- Baris ada → dihapus (pengingat dilepas).
    return false;
  end if;

  -- Baris tidak ada → pasang. `on conflict do nothing` melindungi dari
  -- permintaan ganda bersamaan; hasilnya tetap "aktif".
  insert into public.program_watchlist (user_id, program_id)
  values (v_uid, p_program_id)
  on conflict (user_id, program_id) do nothing;

  return true;
end;
$$;

revoke all on function public.toggle_program_watch(uuid) from anon, public;
grant execute on function public.toggle_program_watch(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Hak eksekusi
-- ---------------------------------------------------------------------------
revoke all on function public.verify_program(uuid) from anon, public;
revoke all on function public.request_changes(uuid, text) from anon, public;
revoke all on function public.reject_program(uuid, text) from anon, public;
grant execute on function public.verify_program(uuid) to authenticated;
grant execute on function public.request_changes(uuid, text) to authenticated;
grant execute on function public.reject_program(uuid, text) to authenticated;
