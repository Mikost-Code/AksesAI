"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge } from "@/components/admin/role-badge";
import { ADMIN_REASON_MIN, APP_ROLE_LABEL, type AppRole } from "@/lib/constants/labels";
import {
  grantUserRole,
  revokeUserRole,
  setUserBanned,
  type AdminResult,
} from "@/app/admin/actions";

const GRANTABLE_ROLES = ["reviewer", "moderator", "admin"] as const;

/**
 * Kontrol per pengguna: kelola role & blokir.
 *
 * - Mengubah role hanya untuk pemilik (`canManageRoles`) — pantulan gate
 *   Server Action + RPC; admin biasa melihat badge tanpa kontrol.
 * - Blokir untuk moderator/admin/pemilik (`canBan`), dengan batasan target
 *   yang mencerminkan RPC: admin hanya oleh pemilik, pemilik (super_admin)
 *   tidak dapat diblokir oleh siapa pun — UI menyembunyikan alih-alih
 *   menampilkan tombol yang pasti ditolak.
 * - Semua otorisasi dan perubahan terjadi di Server Action → RPC; komponen
 *   ini hanya memicu dan menampilkan hasilnya.
 */
export function UserActions({
  userId,
  username,
  roles,
  isBanned,
  isSelf,
  canManageRoles,
  canBan,
}: {
  userId: string;
  username: string;
  roles: AppRole[];
  isBanned: boolean;
  isSelf: boolean;
  canManageRoles: boolean;
  canBan: boolean;
}) {
  const targetIsSuperAdmin = roles.includes("super_admin");
  const targetIsAdmin = roles.includes("admin");
  // Blokir terlihat hanya bila viewer berwenang DAN target boleh diblokir:
  // target pemilik → tidak seorang pun; target admin → hanya pemilik.
  const showBanControls =
    canBan && !isSelf && !targetIsSuperAdmin && (!targetIsAdmin || canManageRoles);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [banMode, setBanMode] = useState(false);
  const [reason, setReason] = useState("");

  const staffRoles = roles.filter((r): r is (typeof GRANTABLE_ROLES)[number] =>
    (GRANTABLE_ROLES as readonly string[]).includes(r),
  );
  const grantable = GRANTABLE_ROLES.filter((r) => !roles.includes(r));

  function run(key: string, action: () => Promise<AdminResult>) {
    setError(null);
    setNotice(null);
    setBusyKey(key);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setNotice(result.message);
        setBanMode(false);
        setReason("");
        router.refresh();
      } else {
        setError(result.message);
      }
      setBusyKey(null);
    });
  }

  const disabled = pending;

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      {notice ? (
        <p role="status" className="rounded-md border border-accent/25 bg-accent-soft p-2 text-xs">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft p-2 text-xs">
          {error}
        </p>
      ) : null}

      {isSelf ? (
        <p className="text-xs text-muted-foreground">
          {targetIsSuperAdmin
            ? "Ini akun Anda (pemilik). Role Super Admin tidak dapat dicabut dan akun ini tidak dapat diblokir — akses pemulihan selalu tersedia."
            : "Ini akun Anda. Role dan blokir akun sendiri tidak dapat diubah dari sini untuk mencegah terkunci."}
        </p>
      ) : null}

      {/* Role saat ini */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Peran:</span>
        {staffRoles.length > 0 ? (
          staffRoles.map((role) => (
            <RoleBadge
              key={role}
              role={role}
              onRemove={
                canManageRoles && !isSelf
                  ? () => run(`revoke-${role}`, () => revokeUserRole(userId, role))
                  : undefined
              }
              removeLabel={`Cabut role ${APP_ROLE_LABEL[role]} dari ${username}`}
              disabled={disabled || isSelf}
            />
          ))
        ) : (
          <span className="text-xs text-muted-foreground">member saja</span>
        )}
        {targetIsSuperAdmin ? (
          <RoleBadge role="super_admin" className="shadow-[var(--shadow-card)]" />
        ) : null}
      </div>

      {/* Beri role baru — hanya pemilik */}
      {canManageRoles && !isSelf && grantable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Beri:</span>
          {grantable.map((role) => (
            <Button
              key={role}
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => run(`grant-${role}`, () => grantUserRole(userId, role))}
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {busyKey === `grant-${role}` ? "…" : APP_ROLE_LABEL[role]}
            </Button>
          ))}
        </div>
      ) : null}
      {!canManageRoles && !isSelf ? (
        <p className="text-xs text-muted-foreground">
          Pengelolaan role hanya oleh pemilik (Super Admin).
        </p>
      ) : null}

      {/* Penjelasan saat blokir disembunyikan karena proteksi target */}
      {canBan && !isSelf && !showBanControls ? (
        <p className="text-xs text-muted-foreground">
          {targetIsSuperAdmin
            ? "Pemilik (Super Admin) tidak dapat diblokir."
            : "Hanya pemilik (Super Admin) yang dapat memblokir admin."}
        </p>
      ) : null}

      {/* Blokir / buka blokir */}
      {showBanControls ? (
        isBanned ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`unban-${userId}`}>Buka blokir (alasan wajib)</Label>
            <Textarea
              id={`unban-${userId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Alasan pembukaan blokir, tercatat pada audit log."
            />
            <FieldHint>Minimal {ADMIN_REASON_MIN} karakter.</FieldHint>
            <FieldError
              message={
                reason.length > 0 && reason.trim().length < ADMIN_REASON_MIN
                  ? `Minimal ${ADMIN_REASON_MIN} karakter.`
                  : undefined
              }
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled || reason.trim().length < ADMIN_REASON_MIN}
              onClick={() => run("unban", () => setUserBanned(userId, false, reason))}
            >
              Buka blokir
            </Button>
          </div>
        ) : banMode ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ban-${userId}`}>Blokir pengguna (alasan wajib)</Label>
            <Textarea
              id={`ban-${userId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Contoh: mengirim kontribusi palsu berulang."
            />
            <FieldHint>Minimal {ADMIN_REASON_MIN} karakter. Tercatat permanen.</FieldHint>
            <FieldError
              message={
                reason.length > 0 && reason.trim().length < ADMIN_REASON_MIN
                  ? `Minimal ${ADMIN_REASON_MIN} karakter.`
                  : undefined
              }
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                disabled={disabled || reason.trim().length < ADMIN_REASON_MIN}
                onClick={() => run("ban", () => setUserBanned(userId, true, reason))}
              >
                <Ban className="size-3.5" aria-hidden="true" />
                Konfirmasi blokir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => {
                  setBanMode(false);
                  setReason("");
                  setError(null);
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="self-start text-danger"
            disabled={disabled}
            onClick={() => {
              setBanMode(true);
              setError(null);
            }}
          >
            <Ban className="size-3.5" aria-hidden="true" />
            Blokir pengguna
          </Button>
        )
      ) : null}
    </div>
  );
}
