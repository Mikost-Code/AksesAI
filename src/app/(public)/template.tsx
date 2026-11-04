/**
 * Template halaman publik.
 *
 * Berbeda dengan `layout`, `template` di-mount ulang setiap kali rute berubah.
 * Itu membuat animasi masuk diputar ulang pada setiap navigasi sehingga
 * perpindahan halaman terasa halus, bukan "patah".
 *
 * Animasi memakai `--animate-fade-up` (opacity + translateY kecil) yang halus
 * dan singkat, serta otomatis dinonaktifkan bagi pengguna dengan setelan
 * `prefers-reduced-motion` (lihat globals.css).
 */
export default function PublicTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-[var(--animate-page-in)]">{children}</div>;
}
