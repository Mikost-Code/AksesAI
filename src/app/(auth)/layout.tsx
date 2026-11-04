import Link from "next/link";

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
            className="flex items-center gap-2 font-heading text-lg font-bold transition-opacity hover:opacity-80"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)]"
            >
              AI
            </span>
            AksesAI
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col">{children}</main>
    </div>
  );
}
