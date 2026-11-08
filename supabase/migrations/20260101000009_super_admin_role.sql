-- =============================================================================
-- 0009 — Role `super_admin` (pemilik)
-- =============================================================================
-- super_admin adalah pemilik platform (satu orang). Ia mewarisi SEMUA
-- kemampuan admin — implikasinya diterapkan pada helper has_role/has_any_role
-- di migrasi 0010 (body fungsi `language sql` diparse saat CREATE, sehingga
-- tidak boleh berada dalam transaksi yang sama dengan penambahan nilai enum).
--
-- Role super_admin TIDAK dapat diberikan lewat aplikasi (anti eskalasi
-- privilege); hanya lewat konsol database oleh operator tepercaya.
-- =============================================================================

alter type public.app_role add value if not exists 'super_admin' after 'admin';
