"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FilePlus2,
  Files,
  Flag,
  Gauge,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  exact?: boolean;
};

/**
 * Navigasi dasbor. Item staf hanya dirender bila role dimiliki — ini murni
 * UX; akses sebenarnya tetap ditegakkan di layout area staf + RPC.
 */
export function DashboardNav({
  canReview,
  canModerate,
  isAdmin,
}: {
  canReview: boolean;
  canModerate: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  const groups: Array<{ heading: string; items: NavItem[] }> = [
    {
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
      ],
    },
  ];

  if (canReview || canModerate || isAdmin) {
    const staff: NavItem[] = [];
    if (canReview) staff.push({ href: "/review", label: "Antrean review", icon: ShieldAlert });
    if (canModerate) staff.push({ href: "/moderation/reports", label: "Laporan", icon: Flag });
    if (isAdmin) {
      staff.push({ href: "/admin", label: "Admin", icon: Gauge });
      staff.push({ href: "/admin/pengguna", label: "Pengguna & role", icon: Users });
      staff.push({ href: "/admin/kategori", label: "Kategori", icon: Settings });
    }
    groups.push({ heading: "Staf", items: staff });
  }

  return (
    <nav aria-label="Navigasi dasbor" className="lg:w-56 lg:shrink-0">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-background p-2 lg:flex-col lg:gap-4 lg:overflow-visible lg:p-3">
        {groups.map((group) => (
          <div key={group.heading} className="flex gap-1 lg:flex-col lg:gap-1">
            <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:block">
              {group.heading}
            </p>
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 select-none items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                    // Fokus inset (bukan outline mengambang) agar tidak terlihat
                    // "kotak dobel" di atas status aktif saat item diklik ulang.
                    "outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-primary/40",
                    active
                      ? "bg-primary-soft text-primary shadow-[var(--shadow-card)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden={true} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
