import { History } from "lucide-react";

import type { UserModerationEntry } from "@/lib/admin/data";
import { formatDateTimeID } from "@/lib/utils";

/**
 * Riwayat tindakan moderasi untuk satu akun (ditampilkan di `/admin/pengguna`).
 *
 * Tujuannya menjelaskan "mengapa akun ini dibatasi": tanpa riwayat, moderator
 * baru hanya melihat badge "Diblokir" tanpa konteks. Alasan blokir sudah
 * tercatat sebagai `reason` pada audit log (wajib ≥ 10 karakter di RPC).
 *
 * Daftar ini dimuat per pengguna oleh halaman (server), lalu diteruskan ke
 * sini — komponen ini murni presentasi sehingga tidak ada query per baris di
 * klien.
 */

const ACTION_LABEL: Record<string, string> = {
  "user.ban": "Diblokir",
  "user.unban": "Blokir dibuka",
  "role.grant": "Role diberikan",
  "role.revoke": "Role dicabut",
};

export function UserModerationHistory({
  entries,
}: {
  entries: UserModerationEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <details className="mt-3 rounded-lg border border-border bg-surface">
      <summary className="flex cursor-pointer list-inside items-center gap-1.5 p-2.5 text-xs font-medium text-muted-foreground">
        <History className="size-3.5" aria-hidden="true" />
        Riwayat moderasi ({entries.length})
      </summary>
      <ol className="flex flex-col gap-2 border-t border-border p-3">
        {entries.map((entry) => (
          <li key={entry.id} className="text-xs">
            <p className="font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</p>
            <p className="text-muted-foreground">
              {formatDateTimeID(entry.createdAt)}
              {entry.actorUsername ? ` · oleh ${entry.actorUsername}` : ""}
            </p>
            {entry.reason ? (
              <p className="mt-0.5 whitespace-pre-line text-muted-foreground">
                {entry.reason}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}
