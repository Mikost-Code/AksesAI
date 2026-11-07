import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ketentuan Penggunaan",
  description:
    "Ketentuan penggunaan AksesAI: layanan, akun & kontribusi, larangan, moderasi, hak konten, dan perubahan ketentuan.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">Ketentuan Penggunaan</span>
      </nav>

      <h1 className="text-3xl font-bold sm:text-4xl">Ketentuan Penggunaan</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ketentuan ini berlaku untuk seluruh penggunaan AksesAI. Dengan masuk
        atau berkontribusi, Anda dianggap menyetujuinya. Versi terbaru selalu
        ada di halaman ini.
      </p>

      <div className="prose-readable mt-8 flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-semibold">1. Apa itu AksesAI</h2>
          <p className="mt-2 leading-relaxed text-foreground/90">
            AksesAI adalah direktori informasi <strong>gratis &amp; murah
            seputar AI</strong> yang isinya dikontribusikan komunitas dan
            diverifikasi manual oleh reviewer terhadap sumber resmi provider.
            AksesAI adalah alat bantu pencarian informasi — bukan penyedia
            layanan AI, bukan afiliasi provider mana pun, dan tidak menjual
            token/kredit.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Akurasi informasi &amp; batasan</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Kuota gratis, harga per token, dan promo <strong>berubah
              sewaktu-waktu oleh provider</strong> — bukan oleh AksesAI.
            </li>
            <li>
              Label <em>Terverifikasi</em> berarti info diperiksa reviewer
              terhadap sumber resmi <strong>pada saat peninjauan</strong>,
              bukan jaminan kuota masih tersedia saat Anda membacanya.
            </li>
            <li>
              Selalu periksa dokumentasi/halaman resmi provider sebelum
              mendaftar atau membeli apa pun. AksesAI tidak bertanggung jawab
              atas kerugian akibat keputusan yang Anda ambil berdasarkan info
              di direktori.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Akun &amp; kontribusi</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Masuk menggunakan akun GitHub. Anda bertanggung jawab atas
              keamanan akun dan atas konten yang dikirim dengan akun Anda.
            </li>
            <li>
              Kontribusi <strong>wajib menyertakan minimal satu sumber
              resmi</strong> yang dapat dibuka publik. Kiriman tanpa sumber
              ditolak.
            </li>
            <li>
              Kontribusi ditinjau manual: diverifikasi, diminta revisi, atau
              ditolak dengan alasan. Keputusan reviewer dapat ditandai
              kedaluwarsa/dicek ulang seiring waktu.
            </li>
            <li>
              Kontribusi baru dibatasi jumlah per hari, dan kontributor baru
              dibatasi maksimal 3 kiriman yang masih menunggu tinjauan.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Yang dilarang</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Menyertakan <strong>API key, token akses, kredensial akun, NIK,
              nomor KK, foto KTP, atau nomor rekening</strong> — pemindaian
              otomatis akan menolak kiriman tersebut.
            </li>
            <li>Menyebarkan informasi palsu, clickbait, atau menyesatkan.</li>
            <li>
              Promosi jasa penjualan token/pembukaan akun di luar kanal resmi
              provider, spam, atau duplikasi entri yang sudah ada.
            </li>
            <li>
              Mencoba mengakses atau mengubah data pengguna/role di luar
              antarmuka yang disediakan.
            </li>
          </ul>
          <p className="mt-2 leading-relaxed text-foreground/90">
            Pelanggaran dapat berujung penolakan kiriman, pembekuan akun, atau
            pemblokiran pengguna dengan alasan yang tercatat permanen pada
            audit log.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Moderasi &amp; verifikasi</h2>
          <p className="mt-2 leading-relaxed text-foreground/90">
            Reviewer dan moderator (bukan bot) memeriksa kontribusi dan laporan
            komunitas. Setiap keputusan penting tercatat pada audit log yang
            tidak dapat diubah. Anda dapat melaporkan info bermasalah lewat
            tombol laporan pada halaman entri — dengan atau tanpa masuk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Konten &amp; atribusi</h2>
          <p className="mt-2 leading-relaxed text-foreground/90">
            Anda tetap pemilik kontribusi yang Anda kirim, dan nama GitHub Anda
            ditampilkan sebagai kontributor untuk transparansi. Dengan
            mengirimkan kontribusi, Anda mengizinkan AksesAI menampilkannya
            publik beserta riwayat perubahannya. Info mengenai provider pihak
            ketiga adalah milik provider masing-masing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Privasi</h2>
          <p className="mt-2 leading-relaxed text-foreground/90">
            AksesAI sengaja tidak mengumpulkan NIK/KK/KTP/rekening dan tidak
            menyimpan IP mentah. Rincian data yang disimpan dan masa retensinya
            ada di{" "}
            <Link href="/kebijakan-privasi" className="text-primary underline">
              kebijakan privasi
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Perubahan ketentuan</h2>
          <p className="mt-2 leading-relaxed text-foreground/90">
            Ketentuan ini dapat diperbarui seiring perkembangan platform;
            versi terbaru selalu tersedia di halaman ini. Pertanyaan, banding
            atas moderasi, atau laporan pelanggaran dapat disampaikan melalui{" "}
            <Link href="/tentang" className="text-primary underline">
              halaman tentang
            </Link>{" "}
            atau{" "}
            <Link
              href="https://github.com/zann06/AksesAI/security/advisories/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              GitHub Security Advisory
            </Link>{" "}
            untuk hal sensitif.
          </p>
        </section>
      </div>
    </div>
  );
}
