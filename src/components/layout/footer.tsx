import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";
import { APP_NAME, PLATFORM_DISCLAIMER_SHORT } from "@/lib/constants/labels";

const FOOTER_LINKS = [
  {
    heading: "Jelajahi",
    links: [
      { href: "/info", label: "Direktori info AI" },
      { href: "/panduan", label: "Panduan penggunaan" },
    ],
  },
  {
    heading: "Tentang",
    links: [
      { href: "/tentang", label: "Tentang AksesAI" },
      { href: "/kebijakan-privasi", label: "Kebijakan privasi" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="md:col-span-1">
          <Link
            href="/"
            aria-label={`${APP_NAME} — beranda`}
            className="inline-flex rounded-lg outline-none"
          >
            <LogoLockup />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Direktori info gratis &amp; murah seputar AI berbasis kontribusi
            komunitas, dengan sumber yang dapat diperiksa dan verifikasi manual.
          </p>
        </div>

        {FOOTER_LINKS.map((section) => (
          <div key={section.heading}>
            <p className="text-sm font-semibold">{section.heading}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-[1200px] px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>{PLATFORM_DISCLAIMER_SHORT}</p>
          <p className="mt-2">
            © {new Date().getFullYear()} {APP_NAME}. Proyek sumber terbuka
            berlisensi MIT —{" "}
            <a
              href="https://github.com/zann06/AksesAI"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              zann06/AksesAI
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
