/**
 * Transisi masuk untuk halaman area ber-login.
 * Sama seperti template publik: diputar ulang setiap navigasi.
 */
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-[var(--animate-page-in)]">{children}</div>;
}
