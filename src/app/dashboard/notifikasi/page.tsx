import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, CircleAlert, CheckCircle2, PencilLine, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { MarkOneRead, NotificationActions } from "@/components/dashboard/notification-actions";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications";
import { cn, formatDateTimeID } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifikasi", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Ikon per jenis notifikasi.
 *
 * `kind` berasal dari RPC (migrasi 0013). Nilai tak dikenal jatuh ke ikon
 * bel netral — notifikasi baru dari DB tetap tampil tanpa perlu deploy.
 */
const KIND_ICON: Record<string, { icon: typeof Sparkles; className: string }> = {
  program_verified: { icon: CheckCircle2, className: "text-accent" },
  needs_changes: { icon: PencilLine, className: "text-warning" },
  rejected: { icon: CircleAlert, className: "text-danger" },
  promo_ending: { icon: Sparkles, className: "text-primary" },
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout sudah redirect

  const { items, unreadCount } = await listNotifications(user.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Kabar tentang kontribusi Anda (diverifikasi, perlu revisi, ditolak)
            dan pengingat promo yang Anda simpan.
          </p>
        </div>
        <NotificationActions unreadCount={unreadCount} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<BellOff className="size-6" aria-hidden="true" />}
          title="Belum ada notifikasi"
          description="Saat kontribusi Anda ditinjau atau promo yang Anda simpan hampir berakhir, kabarnya muncul di sini."
          action={{ label: "Lihat kontribusi saya", href: "/dashboard/kontribusi" }}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const meta = KIND_ICON[item.kind] ?? { icon: Sparkles, className: "text-muted-foreground" };
            const Icon = meta.icon;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border bg-background p-4",
                  // Notifikasi belum dibaca diberi latar lembut, bukan hanya
                  // warna teks, agar mudah dipindai.
                  !item.isRead && "border-primary/30 bg-primary-soft/40",
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", meta.className)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    {!item.isRead ? <Badge variant="default">Baru</Badge> : null}
                  </div>
                  {item.body ? (
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDateTimeID(item.createdAt)}</span>
                    {item.href ? (
                      // Tautan dibatasi ke path internal (nilai ditulis oleh RPC
                      // aplikasi sendiri), jadi aman sebagai `<Link>`.
                      <Link
                        href={item.href}
                        className="font-medium text-primary transition-colors hover:underline"
                      >
                        Buka
                      </Link>
                    ) : null}
                    {!item.isRead ? <MarkOneRead id={item.id} /> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
