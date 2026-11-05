import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-soft opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      />

      <header className="relative z-10">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="AksesAI — beranda"
            className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 transition-opacity hover:opacity-80"
          >
            <LogoLockup />
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col">{children}</main>
    </div>
  );
}
