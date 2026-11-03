"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_REASON_MIN, APP_ROLE_LABEL, type AppRole } from "@/lib/constants/labels";
import {
  grantUserRole,
  revokeUserRole,
  setUserBanned,
  type AdminResult,
} from "@/app/admin/actions";

type StaffRole = Exclude<AppRole, "member">;

const GRANTABLE_ROLES: StaffRole[] = ["reviewer", "moderator", "admin"];
const STAFF_ROLES: StaffRole[] = ["reviewer", "moderator", "admin"];

/**
 * Kontrol per pengguna: kelola role & blokir. Semua otorisasi dan perubahan
 * terjadi di Server Action → RPC; komponen ini hanya memicu dan menampilkan
 * hasilnya.
 */
export function UserActions({
  userId,
  username,
  roles,
  isBanned,
  isSelf,
}: {
  userId: string;
  username: string;
  roles: AppRole[];
  isBanned: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [banMode, setBanMode] = useState(false);
  const [reason, setReason] = useState("");

  const staffRoles = roles.filter((r): r is StaffRole =>
    (STAFF_ROLES as string[]).includes(r),
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
          Ini akun Anda. Role dan blokir akun sendiri tidak dapat diubah dari sini untuk
          mencegah terkunci.
        </p>
      ) : null}

      {/* Role saat ini */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Peran:</span>
        {staffRoles.length > 0 ? (
          staffRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary"
            >
              {APP_ROLE_LABEL[role]}
              <button
                type="button"
                disabled={disabled || isSelf}
                aria-label={`Cabut role ${APP_ROLE_LABEL[role]} dari ${username}`}
                onClick={() => run(`revoke-${role}`, () => revokeUserRole(userId, role))}
                className="ml-0.5 rounded-full px-1 text-primary/70 hover:bg-primary/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">member saja</span>
        )}
      </div>

      {/* Beri role baru */}
      {!isSelf && grantable.length > 0 ? (
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

      {/* Blokir / buka blokir */}
      {!isSelf ? (
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
