import { APP_ROLE_LABEL, type AppRole } from "@/lib/constants/labels";

import { cn } from "@/lib/utils";

/**
 * Badge role dengan warna per tingkat kewenangan. Urutan warna konsisten
 * di seluruh aplikasi: pemilik ungu, admin teal, moderator biru, reviewer
 * amber, anggota abu — agar hierarki terbaca sekilas tanpa membaca teks.
 */
const ROLE_BADGE_STYLE: Record<AppRole, string> = {
  super_admin: "bg-violet-soft text-violet",
  admin: "bg-primary-soft text-primary",
  moderator: "bg-info-soft text-info",
  reviewer: "bg-warm-soft text-warm",
  member: "bg-muted text-muted-foreground",
};

export function RoleBadge({
  role,
  onRemove,
  removeLabel,
  disabled,
  className,
}: {
  role: AppRole;
  /** Bila diisi, badge menampilkan tombol cabut (×). */
  onRemove?: () => void;
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        ROLE_BADGE_STYLE[role],
        className,
      )}
    >
      {APP_ROLE_LABEL[role]}
      {onRemove ? (
        <button
          type="button"
          disabled={disabled}
          aria-label={removeLabel}
          onClick={onRemove}
          className="ml-0.5 rounded-full px-1 opacity-70 hover:bg-black/10 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
