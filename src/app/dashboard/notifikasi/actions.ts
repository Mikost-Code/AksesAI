"use server";

/**
 * Server Actions notifikasi.
 *
 * Kontrak keamanan:
 *  - Identitas diambil dari sesi server (`getCurrentUser`), bukan dari input.
 *  - Update dibatasi RLS `notifications_mark_read` + trigger penjaga kolom,
 *    sehingga hanya `read_at` milik sendiri yang dapat berubah.
 *  - Input id divalidasi Zod agar payload liar tidak sampai ke PostgREST.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { markNotificationsRead } from "@/lib/notifications";

export type NotificationActionResult = { ok: true; message: string } | { ok: false; message: string };

const idsSchema = z
  .array(z.uuid())
  .max(100, { error: "Terlalu banyak notifikasi sekaligus." })
  .optional();

/** Menandai satu atau beberapa notifikasi sebagai sudah dibaca. */
export async function markNotificationsAsRead(ids?: string[]): Promise<NotificationActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };

  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Permintaan tidak valid." };
  }

  const result = await markNotificationsRead(user.id, parsed.data);
  if (!result.ok) return result;

  revalidatePath("/dashboard/notifikasi");
  revalidatePath("/dashboard");
  return { ok: true, message: "Notifikasi ditandai sudah dibaca." };
}

/** Menandai SEMUA notifikasi belum dibaca sebagai sudah dibaca. */
export async function markAllNotificationsAsRead(): Promise<NotificationActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };

  const result = await markNotificationsRead(user.id);
  if (!result.ok) return result;

  revalidatePath("/dashboard/notifikasi");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message:
      result.updated > 0
        ? `${result.updated} notifikasi ditandai sudah dibaca.`
        : "Tidak ada notifikasi baru.",
  };
}
