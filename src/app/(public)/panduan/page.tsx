import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panduan",
  description:
    "Cara mencari informasi bansos, cara berkontribusi dengan sumber yang baik, dan cara melaporkan informasi bermasalah di BantuWarga.",
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

      <h1 className="text-3xl font-bold sm:text-4xl">Panduan BantuWarga</h1>

      <div className="prose-readable mt-8 flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-semibold">1. Cara mencari informasi</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Buka{" "}
              <Link href="/bansos" className="text-primary underline">
                direktori
              </Link>{" "}
              dan masukkan kata kunci, atau pilih kategori/wilayah pada filter.
            </li>
            <li>
              Buka halaman program untuk melihat deskripsi, persyaratan, jadwal,
              dan <strong>tautan sumber</strong>.
            </li>
            <li>
              Klik tautan sumber untuk memeriksa langsung di situs resmi
              penyelenggara. Pastikan domain resmi (bukan tiruan).
            </li>
            <li>
              Perhatikan tanggal berakhir. Program yang sudah lewat akan
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
            <li>Sertakan minimal satu sumber yang dapat dibuka (utamakan situs/akun resmi penyelenggara).</li>
            <li>Jangan mengarang persyaratan atau jadwal yang tidak tercantum pada sumber.</li>
            <li>Kirim untuk ditinjau. Reviewer akan memeriksa secara manual.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Kriteria sumber yang baik</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Berasal dari penyelenggara/instansi resmi atau media kredibel.</li>
            <li>Dapat dibuka publik dan relevan dengan isi kontribusi.</li>
            <li>Tidak berasal dari pesan berantai atau tangkapan layar tanpa sumber primer.</li>
            <li>Tidak meminta pembayaran, kode OTP, atau data pribadi.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Data yang tidak boleh ditulis</h2>
          <p className="mt-2 rounded-lg border border-danger/25 bg-danger-soft p-4 text-sm">
            Jangan pernah memasukkan NIK, nomor KK, foto KTP, nomor rekening,
            atau identitas penerima bantuan ke dalam kontribusi, laporan, maupun
            catatan. BantuWarga memindai isian dan menolak pengiriman yang
            terindikasi memuat data tersebut.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Cara melaporkan informasi bermasalah</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>Buka halaman program dan klik <strong>Laporkan informasi</strong>.</li>
            <li>Pilih alasan (tidak akurat, kedaluwarsa, tautan mati, duplikat, dugaan penipuan, spam).</li>
            <li>Jelaskan singkat masalahnya. Boleh tanpa menyebut data pribadi.</li>
            <li>Moderator akan memeriksa dan menindaklanjuti.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Waspada penipuan</h2>
          <p className="mt-2">
            Jika sebuah informasi meminta biaya pendaftaran, meminta OTP, atau
            meminta Anda menghubungi kontak pribadi tanpa sumber resmi,{" "}
            <strong>jangan</strong> membayar dan laporkan. Segera tandai laporan
            dengan kategori <em>Dugaan penipuan</em>.
          </p>
        </section>
      </div>
    </div>
  );
}
