import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, ShieldAlert } from "lucide-react";

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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-border bg-background p-8 shadow-[var(--shadow-elevated)] animate-[var(--animate-fade-up)]">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <GitHubIcon className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Masuk ke AksesAI</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Gunakan akun GitHub Anda untuk membagikan informasi. Kami hanya
          membaca data profil publik (username, avatar, bio). Email tidak
          ditampilkan pada profil publik.
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-5 flex gap-2 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm animate-[var(--animate-fade-in)]"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <form action="/auth/sign-in" method="post" className="mt-6">
          <input type="hidden" name="next" value={nextParam} />
          <button
            type="submit"
            className={`${buttonVariants({ size: "lg" })} w-full shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]`}
          >
            <GitHubIcon className="size-5" />
            Lanjutkan dengan GitHub
          </button>
        </form>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-surface p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p>
            Dengan masuk, Anda menyetujui{" "}
            <Link href="/tentang" className="font-medium text-primary underline underline-offset-2">
              ketentuan penggunaan
            </Link>{" "}
            dan{" "}
            <Link
              href="/kebijakan-privasi"
              className="font-medium text-primary underline underline-offset-2"
            >
              kebijakan privasi
            </Link>
            . AksesAI tidak mengumpulkan API key, token akses, NIK, nomor
            rekening, atau kredensial akun apa pun.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-sand/80">
        <Link
          href="/info"
          className="inline-flex items-center gap-1 font-medium text-sand-bright hover:underline"
        >
          Jelajahi direktori tanpa masuk
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}
