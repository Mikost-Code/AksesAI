import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Data apa yang disimpan BantuWarga, tujuannya, pihak ketiga yang digunakan, masa retensi, dan cara menghubungi kami.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">Kebijakan Privasi</span>
      </nav>

      <h1 className="text-3xl font-bold sm:text-4xl">Kebijakan Privasi</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Kebijakan ini berlaku untuk seluruh penggunaan BantuWarga dan dapat
        diperbarui sewaktu-waktu; perubahan material akan diumumkan di repositori
        resmi.
      </p>

      <div className="prose-readable mt-8 flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-semibold">Data yang kami simpan</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Dari akun GitHub: username, URL profil, avatar, dan bio publik (jika ada). <strong>Alamat email tidak disalin</strong> ke profil aplikasi dan tidak ditampilkan.</li>
            <li>Kontribusi informasi yang Anda kirim beserta riwayat perubahannya.</li>
            <li>Laporan yang Anda kirim, dan untuk laporan anonim hanya berupa <em>hash</em> dari alamat IP bergaram (bukan IP mentah).</li>
            <li>Peran (role) akun dan catatan aktivitas penting untuk audit.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Data yang tidak kami kumpulkan</h2>
          <p className="mt-2 rounded-lg border border-danger/25 bg-danger-soft p-4 text-sm">
            NIK, nomor KK, foto KTP, nomor rekening, identitas penerima bantuan,
            atau daftar penerima bantuan. Aplikasi memindai isian dan menolak
            pengiriman yang terindikasi memuat data tersebut.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Tujuan penggunaan</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Menampilkan atribusi kontributor secara transparan.</li>
            <li>Memverifikasi dan memoderasi informasi secara manual.</li>
            <li>Mencegah penyalahgunaan (spam, penipuan) melalui pembatasan laju permintaan.</li>
            <li>Menyimpan jejak audit untuk tindakan moderator dan admin.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Pihak ketiga</h2>
          <p className="mt-2">
            BantuWarga menggunakan layanan berikut yang dapat memproses data
            minimal (mis. log permintaan): <strong>Supabase</strong> (database
            & autentikasi), <strong>Vercel</strong> (hosting),{" "}
            <strong>GitHub</strong> (login), <strong>Upstash</strong>{" "}
            (pembatasan laju), dan <strong>Cloudflare Turnstile</strong>{" "}
            (anti-bot untuk laporan anonim). Data tidak dijual.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Masa penyimpanan</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Hash IP untuk laporan dihapus setelah 90 hari.</li>
            <li>Log audit disimpan minimal 1 tahun.</li>
            <li>Kontribusi yang sudah Terverifikasi tetap tersimpan walau akun dihapus, dengan atribusi dianonimkan.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Penghapusan akun</h2>
          <p className="mt-2">
            Anda dapat meminta penghapusan akun. Profil akan dianonimkan
            (username diganti menjadi “kontributor-dihapus-xxxx”, avatar dan bio
            dihapus). Kontribusi yang sudah Terverifikasi tetap ada demi
            integritas informasi publik.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Menghubungi kami</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Untuk permintaan penghapusan, pertanyaan privasi, atau laporan
            kerentanan keamanan, silakan hubungi pengelola proyek melalui
            halaman issue pada repositori GitHub resmi. Kami tidak meminta data
            pribadi tambahan di luar yang tercantum di halaman ini.
          </p>
        </section>
      </div>
    </div>
  );
}
