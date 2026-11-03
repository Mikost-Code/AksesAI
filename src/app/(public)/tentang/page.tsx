import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "BantuWarga adalah platform informasi bantuan sosial berbasis kontribusi komunitas. Kami bukan lembaga pemerintah dan bukan penyalur bantuan.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">Tentang</span>
      </nav>

      <h1 className="text-3xl font-bold sm:text-4xl">Tentang BantuWarga</h1>

      <div className="prose-readable mt-6 flex flex-col gap-5 text-foreground/90">
        <p className="text-lg text-foreground">
          BantuWarga adalah platform untuk membantu masyarakat menemukan
          informasi bantuan sosial (bansos) yang bersumber jelas, dapat
          diperiksa, dan terverifikasi oleh manusia.
        </p>

        <section>
          <h2 className="text-xl font-semibold">Apa yang kami lakukan</h2>
          <p className="mt-2">
            Kami mengumpulkan informasi bantuan sosial dari kontribusi
            masyarakat. Setiap informasi wajib menyertakan sumber yang dapat
            dibuka. Reviewer kami memeriksa informasi tersebut secara manual
            terhadap sumbernya sebelum ditandai{" "}
            <strong className="font-semibold">Terverifikasi</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Apa yang tidak kami lakukan</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Kami <strong>tidak</strong> menyalurkan bantuan dan{" "}
              <strong>tidak</strong> menerima pendaftaran penerima bantuan.
            </li>
            <li>
              Kami <strong>tidak</strong> menentukan kelayakan seseorang.
            </li>
            <li>
              Kami <strong>tidak</strong> mengumpulkan data pribadi seperti NIK,
              KK, foto KTP, atau nomor rekening.
            </li>
            <li>
              Kami <strong>tidak</strong> meminta biaya apa pun dalam bentuk
              apa pun.
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-warning/25 bg-warning-soft p-4">
          <h2 className="text-lg font-semibold">Tentang status Terverifikasi</h2>
          <p className="mt-2 text-sm">
            Status Terverifikasi berarti informasi telah diperiksa oleh reviewer
            berdasarkan sumber yang tersedia pada saat pemeriksaan. Ini bukan
            jaminan pemerintah, bukan jaminan bantuan masih tersedia, dan bukan
            jaminan Anda akan lolos seleksi. Selalu periksa sumber resmi
            penyelenggara sebelum mengambil tindakan apa pun.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Waspadai penipuan</h2>
          <p className="mt-2">
            Awas terhadap pihak yang meminta biaya pendaftaran, minta kode OTP,
            atau mengarahkan Anda ke kontak pribadi tanpa sumber resmi. Laporkan
            informasi mencurigakan melalui tombol laporan pada halaman program.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Kontak</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bantuan, pertanyaan, atau laporan masalah: lihat halaman{" "}
            <Link href="/kebijakan-privasi" className="text-primary underline">
              kebijakan privasi
            </Link>{" "}
            untuk informasi kontak dan pengelolaan data.
          </p>
        </section>
      </div>
    </div>
  );
}
