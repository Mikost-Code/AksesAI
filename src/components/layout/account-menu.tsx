"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  FilePlus2,
  Files,
  Flag,
  Gauge,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type AccountMenuUser = {
  githubUsername: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  isReviewer: boolean;
  unread: number;
};

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badge?: number;
};

/**
 * Menu akun (dropdown) untuk navbar.
 *
 * Mengapa dropdown dan bukan deretan tombol: navbar sebelumnya menampung
 * lonceng + Dasbor + Area staf + Keluar berdampingan dengan menu utama dan
 * badge GitHub. Pada lebar 1024–1280px itu mendorong logo dan menu saling
 * berhimpitan, dan di layar lebih kecil "Area staf" terpotong. Satu tombol
 * avatar memuat semuanya tanpa memakan lebar tambahan.
 *
 * Aksesibilitas: `aria-expanded` + `aria-controls` pada pemicu, `role="menu"`
 * pada panel, serta tutup via Escape, klik di luar, atau perpindahan rute.
 * Semua item tetap berupa tautan biasa sehingga navigasi keyboard dan klik
 * tengah tetap berfungsi seperti biasa.
 */
export function AccountMenu({
  user,
  className,
}: {
  user: AccountMenuUser;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Tutup saat rute berubah — tanpa ini panel tetap terbuka menutupi halaman
  // baru setelah pengguna memilih salah satu tautan.
  //
  // Ditutup lewat `onClick` tiap tautan, BUKAN `useEffect([pathname])`:
  // setState di dalam effect memicu render berantai dan ditolak aturan
  // react-hooks/set-state-in-effect. Klik adalah peristiwa pengguna, jadi
  // memperbarui state di sana adalah wajar dan langsung.
  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Item yang selalu ada bagi pengguna login.
  const utama: MenuItem[] = [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/dashboard/kontribusi", label: "Kontribusi saya", icon: Files },
    { href: "/dashboard/kontribusi/baru", label: "Bagikan informasi", icon: FilePlus2 },
    { href: "/dashboard/laporan", label: "Laporan saya", icon: Flag },
    {
      href: "/dashboard/notifikasi",
      label: "Notifikasi",
      icon: Bell,
      badge: user.unread,
    },
  ];

  // Item staf hanya dirender bila role dimiliki. Ini murni UX — penegakan
  // akses sebenarnya ada di layout area staf dan RPC masing-masing.
  const staf: MenuItem[] = [];
  if (user.isReviewer) {
    staf.push({ href: "/review", label: "Antrean review", icon: ShieldAlert });
  }
  if (user.isModerator) {
    staf.push({ href: "/moderation/reports", label: "Laporan masuk", icon: Flag });
  }
  if (user.isAdmin) {
    staf.push({ href: "/admin", label: "Panel admin", icon: Gauge });
    staf.push({ href: "/admin/pengguna", label: "Pengguna & role", icon: Users });
    staf.push({ href: "/admin/kategori", label: "Kategori", icon: Settings });
    staf.push({ href: "/admin/audit", label: "Audit log", icon: ScrollText });
  }

  const roleLabel = user.isAdmin
    ? "Admin"
    : user.isModerator
      ? "Moderator"
      : user.isReviewer
        ? "Reviewer"
        : "Kontributor";

  const initial = user.githubUsername.slice(0, 1).toUpperCase();

  function renderItem(item: MenuItem) {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        role="menuitem"
        onClick={closeMenu}
        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground"
      >
        <Icon className="size-4 shrink-0" aria-hidden={true} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && item.badge > 0 ? (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground tabular-nums">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu-panel"
        aria-label={`Menu akun ${user.githubUsername} (${roleLabel})`}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border border-border pl-1 pr-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors",
          "hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "bg-surface text-foreground",
        )}
      >
        {user.avatarUrl ? (
          // Avatar GitHub berukuran kecil; <img> biasa menghindari kebutuhan
          // mengonfigurasi domain gambar di next.config untuk setiap user.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 rounded-full ring-1 ring-border"
          />
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {initial}
          </span>
        )}
        <span className="hidden max-w-24 truncate lg:inline">{user.githubUsername}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id="account-menu-panel"
          role="menu"
          aria-label="Menu akun"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 origin-top-right rounded-xl border border-border bg-background p-1.5 shadow-[var(--shadow-elevated)] animate-[var(--animate-menu-in)]"
        >
          {/* Identitas: nama + peran. Peran dibaca dari database, bukan klaim klien. */}
          <div className="flex items-center gap-2.5 border-b border-border px-2.5 pb-2.5 pt-1.5">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full ring-1 ring-border"
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.githubUsername}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>

          <div className="py-1">{utama.map(renderItem)}</div>

          {staf.length > 0 ? (
            <>
              <div className="border-t border-border" />
              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Area staf
              </p>
              <div className="pb-1">{staf.map(renderItem)}</div>
            </>
          ) : null}

          <div className="border-t border-border pt-1">
            <a
              href={`https://github.com/${user.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground"
            >
              <GitHubIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">Profil GitHub</span>
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={pending}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft focus-visible:text-danger disabled:opacity-50"
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              {pending ? "Keluar…" : "Keluar"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
