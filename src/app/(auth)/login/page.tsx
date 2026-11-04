import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  unconfigured:
    "Layanan autentikasi belum dikonfigurasi pada lingkungan ini. Silakan hubungi pengelola.",
  auth_failed:
    "Proses masuk tidak berhasil diselesaikan. Silakan coba lagi.",
  banned:
    "Akun ini sedang dibatasi. Hubungi pengelola melalui pusat bantuan.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const errorKey = params.error ?? params.reason;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : undefined;
  const nextParam = params.next && params.next.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/dashboard";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-border bg-background p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-bold">Masuk ke AksesAI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gunakan akun GitHub Anda untuk membagikan informasi. Kami hanya
          membaca data profil publik (username, avatar, bio). Email tidak
          ditampilkan pada profil publik.
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-md border border-danger/25 bg-danger-soft p-3 text-sm"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <form action="/auth/sign-in" method="post" className="mt-6">
          <input type="hidden" name="next" value={nextParam} />
          <button type="submit" className={`${buttonVariants({ size: "lg" })} w-full`}>
            <GitHubIcon className="size-5" />
            Lanjutkan dengan GitHub
          </button>
        </form>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Dengan masuk, Anda menyetujui{" "}
          <Link href="/tentang" className="text-primary underline">
            ketentuan penggunaan
          </Link>{" "}
          dan{" "}
          <Link href="/kebijakan-privasi" className="text-primary underline">
            kebijakan privasi
          </Link>
          . AksesAI tidak mengumpulkan API key, token akses, NIK, nomor
          rekening, atau kredensial akun apa pun.
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/info" className="text-primary underline">
          Jelajahi direktori tanpa masuk
        </Link>
      </p>
    </div>
  );
}
