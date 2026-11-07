"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  FilePlus2,
  Files,
  Flag,
  Gauge,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveActiveHref } from "@/lib/nav";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  exact?: boolean;
};

/**
 * Kunci grup navigasi. Dulu grup dibedakan lewat `heading` (teks), sehingga
 * dua grup yang judulnya sama akan bertabrakan di React.
 */
type NavGroup = { key: string; heading: string; items: NavItem[] };

/**
 * Navigasi dasbor.
 *
 * Item staf hanya dirender bila role dimiliki — ini murni UX; akses sebenarnya
 * tetap ditegakkan di layout area staf + RPC.
 *
 * TATA LETAK MOBILE (diperbaiki):
 * Sebelumnya semua item dirender sebagai satu baris yang bisa digeser
 * horizontal. Akibatnya di ponsel hanya "Ringkasan / Kontribusi saya /
 * Bagikan…" yang terlihat, sisanya — termasuk Laporan, Notifikasi, dan seluruh
 * area staf — tersembunyi di luar layar tanpa petunjuk apa pun bahwa masih ada
 * menu lagi. Pengguna harus menebak untuk menggeser.
 *
 * Sekarang:
 * - Ponsel  : daftar vertikal penuh, dikelompokkan dengan judul, tanpa geser.
 * - Tablet  : pita tab horizontal yang membungkus (wrap), jadi semua terlihat.
 * - Desktop : sidebar tetap seperti sebelumnya.
 *
 * Grup "Staf" hanya muncul bila pengguna punya role, sehingga pengguna biasa
 * tidak melihat blok kosong.
 */
export function DashboardNav({
  canReview,
  canModerate,
  isAdmin,
  pendingReview = 0,
  openReports = 0,
  unreadNotifications = 0,
}: {
  canReview: boolean;
  canModerate: boolean;
  isAdmin: boolean;
  /** Jumlah antrean untuk badge (dihitung di layout server). */
  pendingReview?: number;
  openReports?: number;
  /** Notifikasi belum dibaca (lonceng di item "Notifikasi"). */
  unreadNotifications?: number;
}) {
  const pathname = usePathname();

  const groups: NavGroup[] = [
    {
      key: "kontribusi",
      heading: "Kontribusi",
      items: [
        { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true },
        { href: "/dashboard/kontribusi", label: "Kontribusi saya", icon: Files },
        {
          href: "/dashboard/kontribusi/baru",
          label: "Bagikan informasi",
          icon: FilePlus2,
        },
        { href: "/dashboard/laporan", label: "Laporan saya", icon: Flag },
        { href: "/dashboard/notifikasi", label: "Notifikasi", icon: Bell },
      ],
    },
  ];

  if (canReview || canModerate || isAdmin) {
    const staff: NavItem[] = [];
    if (canReview) staff.push({ href: "/review", label: "Antrean review", icon: ShieldAlert });
    if (canModerate) staff.push({ href: "/moderation/reports", label: "Laporan masuk", icon: Flag });
    if (isAdmin) {
      staff.push({ href: "/admin", label: "Panel admin", icon: Gauge });
      staff.push({ href: "/admin/program", label: "Program & masa berlaku", icon: CalendarClock });
      staff.push({ href: "/admin/pengguna", label: "Pengguna & role", icon: Users });
      staff.push({ href: "/admin/kategori", label: "Kategori", icon: Settings });
      staff.push({ href: "/admin/audit", label: "Audit log", icon: ScrollText });
    }
    groups.push({ key: "staf", heading: "Staf", items: staff });
  }

  // Hanya item paling spesifik yang aktif (lihat resolveActiveHref) —
  // mencegah induk + anak menyala bersamaan di halaman anak.
  const activeHref = resolveActiveHref(
    pathname,
    groups.flatMap((group) => group.items),
  );

  function badgeFor(href: string): number {
    if (href === "/review") return pendingReview;
    if (href === "/moderation/reports") return openReports;
    if (href === "/dashboard/notifikasi") return unreadNotifications;
    return 0;
  }

  return (
    <nav
      aria-label="Navigasi dasbor"
      className="rounded-xl border border-border bg-background lg:w-56 lg:shrink-0 lg:border-0 lg:bg-transparent"
    >
      {groups.map((group, index) => (
        <div
          key={group.key}
          className={cn(
            // Ponsel: blok bertumpuk dengan judul. Desktop: blok sidebar.
            "p-2 lg:p-0",
            index > 0 && "border-t border-border lg:mt-4 lg:border-0",
          )}
        >
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:px-2 lg:pb-1">
            {group.heading}
          </p>
          <ul
            className={cn(
              // Mobile/tablet: grid two-up + wrap sehingga TIDAK ada geser
              // horizontal. Desktop: tumpuk vertikal.
              "grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col lg:gap-1",
            )}
          >
            {group.items.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              const badge = badgeFor(item.href);
              return (
                <li key={item.href} className="min-w-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-full select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                      // Fokus inset (bukan outline mengambang) agar tidak
                      // terlihat "kotak dobel" di atas status aktif.
                      "outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-primary/40",
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden={true} />
                    {/* `min-w-0` + `truncate` mencegah label panjang mendorong
                        badge keluar sel pada kolom sempit. */}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge > 0 ? (
                      <span
                        aria-label={`${badge} menunggu tindakan`}
                        className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground tabular-nums"
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
