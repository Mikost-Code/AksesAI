import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "AksesAI adalah direktori info gratis & murah seputar AI berbasis kontribusi komunitas. Kami bukan afiliasi provider AI mana pun dan tidak menjual token.",
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

      <h1 className="text-3xl font-bold sm:text-4xl">Tentang AksesAI</h1>

      <div className="prose-readable mt-6 flex flex-col gap-5 text-foreground/90">
        <p className="text-lg text-foreground">
          AksesAI adalah platform untuk membantu kamu menemukan info{" "}
          <strong>gratis dan murah seputar AI</strong> — API/token gratis dari
          provider, free tier, harga per token, model open-weight, tool gratis,
          dan hosting gratis — yang bersumber jelas, dapat diperiksa, dan
          terverifikasi oleh manusia.
        </p>

        <section>
          <h2 className="text-xl font-semibold">Apa yang kami lakukan</h2>
          <p className="mt-2">
            Kami mengumpulkan info dari kontribusi komunitas. Setiap info wajib
            menyertakan sumber yang dapat dibuka. Reviewer kami memeriksa info
            tersebut secara manual terhadap sumbernya sebelum ditandai{" "}
            <strong className="font-semibold">Terverifikasi</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Apa yang tidak kami lakukan</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Kami <strong>tidak</strong> menjual token/kredit dan bukan
              afiliasi provider AI mana pun.
            </li>
            <li>
              Kami <strong>tidak</strong> menerima bayaran dari provider untuk
              urutan tampil atau label.
            </li>
            <li>
              Kami <strong>tidak</strong> menjamin kuota gratis atau harga masih
              tersedia — kuota dan promo bisa berubah sewaktu-waktu.
            </li>
            <li>
              Kami <strong>tidak</strong> mengumpulkan data pribadi seperti API
              key, token akses, NIK, atau nomor rekening.
            </li>
            <li>
              Kami <strong>tidak</strong> meminta biaya apa pun dalam bentuk apa
              pun.
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-warning/25 bg-warning-soft p-4">
          <h2 className="text-lg font-semibold">Tentang status Terverifikasi</h2>
          <p className="mt-2 text-sm">
            Status Terverifikasi berarti info telah diperiksa oleh reviewer
            berdasarkan sumber yang tersedia pada saat pemeriksaan. Ini bukan
            jaminan kuota masih tersedia, bukan jaminan harga tidak berubah, dan
            bukan jaminan kamu akan mendapatkan akses. Selalu periksa dokumentasi
            atau halaman resmi provider sebelum mendaftar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Waspada penipuan</h2>
          <p className="mt-2">
            Awas terhadap pihak yang menjual &quot;token murah&quot; lewat kontak
            pribadi, meminta kode OTP, meminta kredensial akun, atau mengarahkan
            kamu ke situs tiruan provider. Laporkan info mencurigakan melalui
            tombol laporan pada halaman entri.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Kontak</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bantuan, pertanyaan, atau laporan masalah: lihat halaman{" "}
            <Link href="/kebijakan-privasi" className="text-primary underline">
              kebijakan privasi
            </Link>{" "}
            untuk info kontak dan pengelolaan data.
          </p>
        </section>
      </div>
    </div>
  );
}
