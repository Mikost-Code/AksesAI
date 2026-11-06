"use server";

/**
 * Server Action: pasang/lepas pengingat pada satu entri direktori.
 *
 * Kontrak keamanan:
 *  - Identitas dari sesi server; RPC `toggle_program_watch` (migrasi 0013)
 *    `security definer` memverifikasi ulang bahwa pemanggil login dan entri
 *    berstatus publik. Tabel `program_watchlist` TIDAK punya policy insert/
 *    delete untuk klien — satu-satunya jalur adalah RPC ini.
 *  - Input divalidasi Zod sebelum menyentuh RPC.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WatchResult =
  | { ok: true; watching: boolean; message: string }
  | { ok: false; message: string };

const programIdSchema = z.uuid({ error: "ID entri tidak valid." });

export async function toggleProgramWatch(programId: string): Promise<WatchResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Masuk dulu untuk menyimpan pengingat." };
  }

  const parsed = programIdSchema.safeParse(programId);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "ID entri tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("toggle_program_watch", {
    p_program_id: parsed.data,
  });

  if (error) {
    if (/tidak ditemukan/i.test(error.message)) {
      return { ok: false, message: "Entri tidak ditemukan atau sudah tidak tayang." };
    }
    if (/harus masuk/i.test(error.message)) {
      return { ok: false, message: "Masuk dulu untuk menyimpan pengingat." };
    }
    console.error("[watchlist] RPC toggle_program_watch gagal:", error.message);
    return { ok: false, message: "Gagal menyimpan pengingat. Coba lagi." };
  }

  revalidatePath("/dashboard/notifikasi");
  return {
    ok: true,
    watching: data === true,
    message:
      data === true
        ? "Kami akan mengingatkan Anda sebelum promo ini berakhir."
        : "Pengingat dihapus.",
  };
}
