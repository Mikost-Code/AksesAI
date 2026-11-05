import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hero-forest relative flex min-h-dvh flex-col">
      <header className="relative z-10">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="AksesAI — beranda"
            className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-forest transition-opacity hover:opacity-80"
          >
            <LogoLockup tone="sand" />
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col">{children}</main>
    </div>
  );
}
