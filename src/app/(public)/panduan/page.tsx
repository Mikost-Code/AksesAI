import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panduan",
  description:
    "Cara mencari info AI gratis & murah, cara berkontribusi dengan sumber yang baik, dan cara melaporkan info bermasalah di AksesAI.",
};

export default function GuidePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">Panduan</span>
      </nav>

      <h1 className="text-3xl font-bold sm:text-4xl">Panduan AksesAI</h1>

      <div className="prose-readable mt-8 flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-semibold">1. Cara mencari info</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Buka{" "}
              <Link href="/info" className="text-primary underline">
                direktori
              </Link>{" "}
              dan masukkan kata kunci, atau pilih kategori/jenis akses pada
              filter.
            </li>
            <li>
              Buka halaman entri untuk melihat deskripsi, syarat akses, free
              tier, harga per token, dan <strong>tautan sumber</strong>.
            </li>
            <li>
              Klik tautan sumber untuk memeriksa langsung di dokumentasi atau
              halaman resmi provider. Pastikan domain resmi (bukan tiruan).
            </li>
            <li>
              Perhatikan masa berlaku promo/kuota. Entri yang sudah lewat akan
              berlabel <strong>Kedaluwarsa</strong>.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Cara berkontribusi</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Masuk dengan akun GitHub (tombol <strong>Masuk</strong>).
            </li>
            <li>Tulis judul yang jelas (bukan clickbait) dan deskripsi yang sesuai sumber.</li>
            <li>Sertakan minimal satu sumber yang dapat dibuka (utamakan dokumentasi/halaman harga resmi provider).</li>
            <li>Jangan mengarang kuota, harga, atau syarat yang tidak tercantum pada sumber.</li>
            <li>Kirim untuk ditinjau. Reviewer akan memeriksa secara manual.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Kriteria sumber yang baik</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Berasal dari dokumentasi, halaman harga, blog resmi provider, atau repo resmi.</li>
            <li>Dapat dibuka publik dan relevan dengan isi kontribusi.</li>
            <li>Tidak berasal dari pesan berantai atau tangkapan layar tanpa sumber primer.</li>
            <li>Tidak meminta pembayaran, kode OTP, atau data pribadi.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Data yang tidak boleh ditulis</h2>
          <p className="mt-2 rounded-lg border border-danger/25 bg-danger-soft p-4 text-sm">
            Jangan pernah memasukkan API key, token akses, kredensial akun, NIK,
            nomor KK, foto KTP, atau nomor rekening ke dalam kontribusi, laporan,
            maupun catatan. AksesAI memindai isian dan menolak pengiriman yang
            terindikasi memuat data tersebut.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Cara melaporkan info bermasalah</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>Buka halaman entri dan klik <strong>Laporkan informasi</strong>.</li>
            <li>
              Pilih alasan (kuota berubah, sudah tidak gratis, harga tidak
              sesuai, promo berakhir, tautan mati, tidak akurat, duplikat,
              dugaan penipuan, spam).
            </li>
            <li>Jelaskan singkat masalahnya. Boleh tanpa menyebut data pribadi.</li>
            <li>Moderator akan memeriksa dan menindaklanjuti.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Waspada penipuan</h2>
          <p className="mt-2">
            Jika sebuah info menawarkan &quot;token murah&quot; lewat kontak
            pribadi, meminta OTP, meminta kredensial akun, atau meminta
            pembayaran di luar kanal resmi provider,{" "}
            <strong>jangan</strong> membayar dan laporkan. Segera tandai laporan
            dengan kategori <em>Dugaan penipuan</em>.
          </p>
        </section>
      </div>
    </div>
  );
}
