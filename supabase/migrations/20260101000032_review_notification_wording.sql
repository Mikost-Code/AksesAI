-- =============================================================================
-- 0032 — Redaksi notifikasi "Kontribusi baru" tidak lagi menyesatkan
-- =============================================================================
-- Masalah: body notifikasi staf tertulis "Menunggu tinjauan sejak {waktu}"
-- dan TETAP begitu setelah entri diverifikasi/ditolak — teksnya dibaca
-- seperti status aktif sehingga pemilik menyangka antrean masih berisi
-- padahal tidak (antrean = status live, notifikasi = catatan sejarah).
--
-- Solusi: (1) composer submit_program kini menulis "Masuk antrean sejak
-- {waktu}" — akurat untuk selamanya; (2) notifikasi lama yang sudah
-- tersimpan diperbarui sekaligus (replace string, kind dipertahankan).
--
-- Body fungsi identik dengan migrasi 0014, hanya string notifikasi yang
-- berubah. Idempoten (create or replace).
-- =============================================================================

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
  -- Notifikasi ke staf peninjau (migrasi 0014, redaksi diperbaiki 0032)
  -- ------------------------------------------------------------------
  -- "Masuk antrean sejak ..." tetap akurat setelah entri keluar dari
  -- antrean (diverifikasi/ditolak) — notifikasi adalah catatan sejarah,
  -- bukan cerminan status live.
  insert into public.notifications (user_id, kind, title, body, href, metadata)
  select distinct
    ur.user_id,
    'review_queue_new',
    left('Kontribusi baru: ' || v_row.title, 160),
    'Masuk antrean sejak ' ||
      to_char(now() at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') ||
      ' WIB · ' || v_src || ' sumber.',
    '/review',
    jsonb_build_object('program_id', p_program_id, 'slug', v_row.slug)
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role in ('reviewer', 'admin', 'super_admin')
    and ur.user_id <> v_uid
    and p.is_banned = false;

  get diagnostics v_staf = row_count;

  return 'pending'::public.program_status;
end;
$$;

revoke all on function public.submit_program(uuid) from public;
grant execute on function public.submit_program(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Perbaiki notifikasi lama yang tersimpan dengan redaksi lama
-- ---------------------------------------------------------------------------
update public.notifications
set body = replace(body, 'Menunggu tinjauan sejak', 'Masuk antrean sejak')
where kind = 'review_queue_new'
  and body like 'Menunggu tinjauan sejak%';
