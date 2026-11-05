/**
 * Logo AksesAI.
 *
 * Mark: huruf "A" putih di atas kartu teal membulat, dengan batang tengah yang
 * sekaligus membaca sebagai huruf "I" (mint) — merepresentasikan
 * "A"I tanpa perlu dua glyph terpisah. Lengkung mint di belakang huruf
 * menggambarkan "gerbang akses" (Akses + AI).
 *
 * Sengaja inline SVG (bukan file gambar) agar:
 *  - tajam di semua ukuran termasuk 16px favicon,
 *  - ikut warna token (`currentColor` untuk varian monokrom),
 *  - tidak ada request jaringan tambahan.
 */

type LogoMarkProps = {
  className?: string;
  /** `brand` = kartu teal penuh (default), `mono` = mengikuti currentColor. */
  variant?: "brand" | "mono";
  title?: string;
};

export function LogoMark({
  className = "size-8",
  variant = "brand",
  title,
}: LogoMarkProps) {
  const isMono = variant === "mono";

  return (
    <svg
      viewBox="0 0 32 32"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="32"
        height="32"
        rx="9"
        fill={isMono ? "currentColor" : "var(--color-logo-bg, var(--color-primary))"}
      />
      {/* Lengkung "gerbang akses" */}
      <path
        d="M6.2 24.4c1.9-6.6 6.6-11.2 13.4-12.6"
        stroke={isMono ? "var(--color-background)" : "var(--color-primary-soft)"}
        strokeOpacity={isMono ? 0.35 : 0.55}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Huruf A */}
      <path
        d="M10.1 23.1 15.05 8.9a1.02 1.02 0 0 1 1.9 0l4.95 14.2h-2.72l-1.06-3.2h-4.24l-1.06 3.2h-2.72Z"
        fill={isMono ? "var(--color-background)" : "#ffffff"}
      />
      {/* Batang I (mint) */}
      <rect
        x="21.3"
        y="8.9"
        width="2.2"
        height="9.4"
        rx="1.1"
        fill={isMono ? "var(--color-background)" : "var(--color-accent)"}
      />
    </svg>
  );
}

/**
 * Logo lengkap: mark + wordmark. `APP_NAME` dipecah agar "AI" mendapat
 * penekanan warna tanpa mengubah teks yang dibaca screen reader.
 */
export function LogoLockup({
  appName = "AksesAI",
  className,
  size = "md",
}: {
  appName?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const base = appName.replace(/AI$/, "");
  const markSize = size === "sm" ? "size-7" : "size-8";
  const textSize = size === "sm" ? "text-base" : "text-lg";

  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className={`${markSize} shrink-0`} />
      <span
        className={`font-heading font-bold tracking-tight text-foreground ${textSize}`}
      >
        {base}
        <span className="text-primary">AI</span>
      </span>
    </span>
  );
}
