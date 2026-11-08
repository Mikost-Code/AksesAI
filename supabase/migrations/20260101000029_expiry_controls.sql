-- 0029 — Kendali masa berlaku program oleh staf
--
-- Sebelumnya tanggal berakhir (`promo_end`) hanya dapat diisi kontributor saat
-- membuat kontribusi. Setelah terkirim, staf tidak punya cara mengoreksinya,
-- dan RPC `mark_expired` yang sudah ada tidak pernah dipanggil UI mana pun.
-- Akibatnya satu-satunya jalan menandai kedaluwarsa adalah cron harian, dan
-- tanggal yang salah tidak dapat diperbaiki sama sekali.
--
-- Migrasi ini menambah RPC sempit untuk mengoreksi `promo_end`. Sengaja
-- dipisah dari `reviewer_update_program` (yang menangani judul/deskripsi):
--  * perubahan tanggal punya konsekuensi langsung ke cron kedaluwarsa;
--  * tidak ingin memperluas permukaan RPC koreksi konten yang sudah ada.
--
-- Otorisasi tetap di database: `reviewer`, `moderator`, dan `admin`
-- (super_admin mewarisi lewat `has_any_role`). RPC `mark_expired` dari
-- migrasi 0006 tetap dipakai untuk tombol "Tandai kedaluwarsa".

create or replace function public.reviewer_set_promo_end(
  p_program_id uuid,
  p_promo_end date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.assistance_programs;
begin
  if v_uid is null
     or not public.has_any_role(
       v_uid,
       array['reviewer', 'moderator', 'admin']::public.app_role[]
     ) then
    raise exception 'Tidak berwenang mengubah masa berlaku.' using errcode = '42501';
  end if;

  select * into v_row
  from public.assistance_programs
  where id = p_program_id
  for update;

  if not found then
    raise exception 'Program tidak ditemukan.' using errcode = 'P0002';
  end if;

  -- Hanya untuk program yang sudah pernah dikirim. Draf masih milik
  -- kontributor dan harus diubah lewat alur kontribusi biasa.
  if v_row.status not in ('pending', 'verified', 'expired') then
    raise exception 'Masa berlaku hanya dapat diubah untuk program yang sudah dikirim.'
      using errcode = '22000';
  end if;

  if p_promo_end is not null
     and v_row.promo_start is not null
     and p_promo_end < v_row.promo_start then
    raise exception 'Tanggal berakhir tidak boleh sebelum tanggal mulai.'
      using errcode = '22000';
  end if;

  update public.assistance_programs
  set promo_end = p_promo_end
  where id = p_program_id;

  perform public.log_history(
    p_program_id,
    v_uid,
    'set_promo_end',
    jsonb_build_object('promo_end', v_row.promo_end),
    jsonb_build_object('promo_end', p_promo_end)
  );

  perform public.log_audit(
    v_uid,
    'program',
    p_program_id,
    'program.set_promo_end',
    null,
    jsonb_build_object('promo_end', p_promo_end)
  );
end;
$$;

revoke all on function public.reviewer_set_promo_end(uuid, date) from public, anon;
grant execute on function public.reviewer_set_promo_end(uuid, date) to authenticated;

comment on function public.reviewer_set_promo_end(uuid, date) is
  'Koreksi tanggal berakhir (promo_end) oleh reviewer/moderator/admin. '
  'NULL berarti program tidak memiliki batas waktu. Tercatat di '
  'contribution_history dan audit log.';
