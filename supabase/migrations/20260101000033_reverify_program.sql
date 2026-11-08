-- =============================================================================
-- 0033 — Re-verifikasi berkala: tandai entri "sudah dicek ulang"
-- =============================================================================
-- Nilai utama direktori = data segar. Entri yang tidak diverifikasi ulang
-- >90 hari dianggap perlu dicek ulang (badge + daftar khusus reviewer).
--
-- RPC ini memungkinkan reviewer menandai sebuah entri verified sebagai
-- "sudah dicek ulang": verified_at diperbarui ke now() sehingga badge
-- hilang, dan catatan masuk ke contribution_history (tampil di riwayat
-- publik) + audit log. Terpisah dari verify_program karena alurnya beda:
-- ini bukan transisi status, melainkan pengecekan ulang berkala.
-- =============================================================================

create or replace function public.reverify_program(p_program_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_row  public.assistance_programs;
  v_now  timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Harus masuk untuk mengecek ulang entri.' using errcode = '42501';
  end if;
  if not public.has_any_role(v_uid, array['reviewer', 'admin']::public.app_role[]) then
    raise exception 'Hanya reviewer yang dapat mengecek ulang entri.' using errcode = '42501';
  end if;
  if public.is_user_banned(v_uid) then
    raise exception 'Akun Anda sedang dibatasi.' using errcode = '42501';
  end if;

  select * into v_row from public.assistance_programs where id = p_program_id for update;
  if not found then
    raise exception 'Entri tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_row.status <> 'verified' then
    raise exception 'Hanya entri berstatus verified yang dapat dicek ulang.' using errcode = '22000';
  end if;

  update public.assistance_programs
  set verified_at = v_now
  where id = p_program_id;

  perform public.log_history(p_program_id, v_uid, 'reverify',
    jsonb_build_object('verified_at', v_row.verified_at),
    jsonb_build_object('verified_at', v_now));

  perform public.log_audit(v_uid, 'program', p_program_id, 'program.reverify');

  return v_now;
end;
$$;

revoke all on function public.reverify_program(uuid) from anon, public;
grant execute on function public.reverify_program(uuid) to authenticated;
