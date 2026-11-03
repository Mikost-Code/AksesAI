import { AccountNav } from "@/components/layout/account-nav";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

/**
 * Layout publik. Navbar memuat status akun (Server Component yang membaca
 * cookie sesi), sehingga halaman-halaman publik dirender dinamis per request.
 * Cache data berat dilakukan di lapisan query (unstable_cache + revalidateTag),
 * bukan dengan membuat halaman statis yang menampilkan status login salah.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Lewati ke konten utama
      </a>
      <Navbar accountSlot={<AccountNav />} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
