import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Data layer notifikasi in-app.
 *
 * Notifikasi ditulis oleh RPC `security definer` (migrasi 0013: `verify_program`,
 * `request_changes`, `reject_program`, `notify_ending_promos`) sehingga tidak
 * ada jalur insert dari klien. Di sisi baca, RLS `notifications_read_own`
 * membatasi baris ke `user_id = auth.uid()`; query di sini tetap menyaring
 * `user_id` secara eksplisit sebagai pertahanan berlapis.
 *
 * Keputusan desain: tidak ada email/push. Notifikasi hidup di database dan
 * ditampilkan di dalam aplikasi (lonceng + halaman `/dashboard/notifikasi`).
 * Bila kelak dibutuhkan pengiriman email, cukup tambahkan worker yang membaca
 * tabel yang sama — tidak ada perubahan skema.
 */

export type NotificationKind =
  | "program_verified"
  | "needs_changes"
  | "rejected"
  | "promo_ending"
  | (string & {});

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationList = {
  items: NotificationItem[];
  unreadCount: number;
  configured: boolean;
};

type RawNotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

const NOTIFICATION_COLUMNS = "id, kind, title, body, href, read_at, created_at";

/** Batas jumlah notifikasi yang ditampilkan di halaman penuh. */
const NOTIFICATION_PAGE_SIZE = 50;

function toItem(row: RawNotificationRow): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    isRead: row.read_at !== null,
    createdAt: row.created_at,
  };
}

/**
 * Jumlah notifikasi belum dibaca — dipakai lonceng di navbar.
 *
 * Dipanggil di setiap layout sehingga harus murah: `head: true` + `count`
 * hanya mengirim header, bukan baris. Indeks parsial
 * `notifications_user_unread_idx` (migrasi 0013) membuat ini O(log n).
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    // Tabel belum ada (migrasi 0013 belum dijalankan): jangan rusak navbar.
    if (!/does not exist|schema cache/i.test(error.message)) {
      console.error("[notifications] Gagal menghitung belum dibaca:", error.message);
    }
    return 0;
  }
  return count ?? 0;
}

/** Daftar notifikasi terbaru milik pengguna + jumlah belum dibaca. */
export async function listNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationList> {
  const supabase = await createSupabaseServerClient();
  const limit = Math.min(options.limit ?? NOTIFICATION_PAGE_SIZE, 100);

  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.unreadOnly) {
    query = query.is("read_at", null);
  }

  const [{ data, error }, unreadCount] = await Promise.all([
    query,
    getUnreadNotificationCount(userId),
  ]);

  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) {
      console.error("[notifications] Gagal membaca daftar:", error.message);
    }
    return { items: [], unreadCount: 0, configured: false };
  }

  return {
    items: ((data ?? []) as RawNotificationRow[]).map(toItem),
    unreadCount,
    configured: true,
  };
}

/**
 * Menandai notifikasi sebagai dibaca.
 *
 * RLS `notifications_mark_read` membatasi UPDATE ke baris milik sendiri, dan
 * trigger `notifications_guard_columns` menolak perubahan kolom selain
 * `read_at` — jadi query ini tidak dapat dipakai untuk mengubah isi notifikasi.
 * `ids` kosong berarti "tandai semua": pemanggil yang memutuskan, di sini kita
 * mengikuti `.is("read_at", null)` agar tidak menyentuh baris yang sudah dibaca.
 */
export async function markNotificationsRead(
  userId: string,
  ids?: string[],
): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error, count } = await query;
  if (error) {
    console.error("[notifications] Gagal menandai dibaca:", error.message);
    return { ok: false, message: "Gagal memperbarui notifikasi. Coba lagi." };
  }
  return { ok: true, updated: count ?? 0 };
}
