-- 0014 — Notifikasi ke staf saat ada kontribusi baru masuk antrean
--
-- Masalah: antrean review tidak pernah memberi tahu siapa pun. Kontribusi
-- teman/member bisa mengendap berhari-hari karena satu-satunya cara mengetahuinya
-- adalah membuka /review secara manual. Untuk platform yang isinya bergantung
-- pada kiriman komunitas, itu kehilangan yang paling mahal.
--
-- Solusi: setelah `submit_program` memindahkan status ke 'pending', tulis satu
-- notifikasi untuk setiap staf yang berhak meninjau (reviewer, admin,
-- super_admin). Ditulis di dalam RPC yang sama sehingga tidak ada jalur insert
-- dari klien — sejalan dengan keputusan sebelumnya bahwa `notifications` hanya
-- ditulis oleh fungsi SECURITY DEFINER.
--
-- Penerima TIDAK mencakup kontributor sendiri: contributor tidak boleh meninjau
-- kirimannya, jadi notifikasi ke dirinya hanya menimbulkan klik ke halaman yang
-- akan menolaknya. Bila super_admin kebetulan kontributornya, ia tetap
-- dikecualikan dari notifikasi ini — ia sudah tahu karena baru saja mengirim.
--
-- Idempoten: `create or replace` pada fungsi; aman dijalankan berulang.

create or replace function public.submit_program(p_program_id uuid)
returns public.program_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_row   public.assistance_programs;
  v_src   integer;
  v_pending_today integer;
  v_pending_open  integer;
  v_max_per_day   integer := 10;
  v_created interval;
  v_staf  integer;
begin
  if v_uid is null then
    raise exception 'Harus masuk untuk mengirim kontribusi.' using errcode = '42501';
  end if;
  if public.is_user_banned(v_uid) then
    raise exception 'Akun Anda sedang dibatasi sehingga tidak dapat mengirim kontribusi.'
      using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then
    raise exception 'Kontribusi tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_row.contributor_id <> v_uid then
    raise exception 'Anda hanya dapat mengirim kontribusi milik sendiri.' using errcode = '42501';
  end if;
  if v_row.status not in ('draft', 'needs_changes') then
    raise exception 'Kontribusi berstatus % tidak dapat dikirim.', v_row.status
      using errcode = '22000';
  end if;

  select count(*) into v_src from public.sources where program_id = p_program_id;
  if v_src < 1 then
    raise exception 'Tambahkan minimal satu sumber sebelum mengirim.' using errcode = '22000';
  end if;

  -- Batas harian (PRD FR-CON-5)
  select coalesce((select (value #>> '{}')::int from public.site_settings where key = 'max_pending_per_day'), v_max_per_day)
    into v_max_per_day;

  select count(*) into v_pending_today
  from public.contribution_history h
  where h.contributor_id = v_uid
    and h.action = 'submit'
    and h.created_at >= date_trunc('day', now());

  if v_pending_today >= v_max_per_day then
    raise exception 'Batas pengiriman harian (% kontribusi) tercapai. Coba lagi besok.', v_max_per_day
      using errcode = '22000';
  end if;

  -- Kontributor baru (<7 hari, belum punya Verified) maks. 3 pending bersamaan
  select count(*) into v_pending_open
  from public.assistance_programs p
  where p.contributor_id = v_uid and p.status = 'pending';

  v_created := now() - (select created_at from public.profiles where id = v_uid);
  if v_created < interval '7 days'
     and not exists (select 1 from public.assistance_programs p where p.contributor_id = v_uid and p.status in ('verified', 'expired'))
     and v_pending_open >= 3 then
    raise exception 'Kontributor baru dibatasi maksimal 3 kontribusi dalam peninjauan. Tunggu keputusan reviewer.'
      using errcode = '22000';
  end if;

  update public.assistance_programs
  set status = 'pending', review_note = null
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'submit',
    jsonb_build_object('status', v_row.status),
    jsonb_build_object('status', 'pending'));

  -- ------------------------------------------------------------------
  -- Notifikasi ke staf peninjau (migrasi 0014)
  -- ------------------------------------------------------------------
  -- Judul dibatasi 160 karakter dan body 1000 oleh constraint tabel;
  -- judul program dipotong agar aman bila kontributor menulis judul panjang.
  insert into public.notifications (user_id, kind, title, body, href, metadata)
  select distinct
    ur.user_id,
    'review_queue_new',
    left('Kontribusi baru: ' || v_row.title, 160),
    'Menunggu tinjauan sejak ' ||
      to_char(now() at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') ||
      ' WIB · ' || v_src || ' sumber.',
    '/review',
    jsonb_build_object('program_id', p_program_id, 'slug', v_row.slug)
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role in ('reviewer', 'admin', 'super_admin')
    and ur.user_id <> v_uid          -- tidak menotifikasi kontributor sendiri
    and p.is_banned = false;          -- staf yang diblokir tidak perlu diberi tahu

  get diagnostics v_staf = row_count;

  return 'pending'::public.program_status;
end;
$$;

revoke all on function public.submit_program(uuid) from public;
grant execute on function public.submit_program(uuid) to authenticated;

comment on function public.submit_program(uuid) is
  'Kirim draf kontribusi ke antrean review (draft/needs_changes -> pending). '
  'Sejak migrasi 0014 juga menulis notifikasi review_queue_new ke semua '
  'reviewer/admin/super_admin selain kontributor sendiri.';
