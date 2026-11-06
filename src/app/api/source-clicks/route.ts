import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp } from "@/lib/security/ip-hash";
import { checkRateLimitWithFallback } from "@/lib/security/rate-limit-server";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/same-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/source-clicks — mencatat klik pada tautan sumber.
 *
 * Desain:
 *  - Respons SELALU 204 dan segera dikirim; penghitung diperbarui di dalam
 *    `after()` sehingga latensi DB tidak terasa saat pengguna membuka tautan.
 *  - Rate limit per IP (60/menit) menahan pembengkakan angka bila ada skrip
 *    yang memanggil endpoint ini berulang. Nilai hitungan bersifat sinyal
 *    lunak, jadi rate limit longgar sudah cukup — tidak ada alasan membuat
 *    pengguna sah gagal hanya karena membuka beberapa tautan sekaligus.
 *  - Origin wajib sama (CSRF): browser mengirim `Origin` pada POST lintas
 *    asal; permintaan tanpa Origin ditolak di production.
 *  - RPC `record_source_click` memverifikasi entri berstatus publik dan
 *    menaikkan penghitung secara atomik; endpoint ini tidak pernah menulis
 *    tabel secara langsung.
 */

const bodySchema = z.object({ sourceId: z.uuid() });

export async function POST(request: NextRequest) {
  // Selalu 204: pemanggil (klien) tidak pernah perlu menangani galat.
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 204 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  // Rate limit ringan; bila backend tidak tersedia (~production tanpa
  // konfigurasi) hitungan tetap dicatat — nilai ini tidak memengaruhi hak
  // akses apa pun sehingga tidak perlu fail-closed.
  try {
    const limit = await checkRateLimitWithFallback(
      "source-clicks",
      getClientIp(request.headers),
      { name: "source-clicks", ...RATE_LIMITS.sourceClicksPerIp },
    );
    if (!limit.success) return new NextResponse(null, { status: 204 });
  } catch {
    /* abaikan; pencatatan tetap best-effort */
  }

  const sourceId = parsed.data.sourceId;
  after(async () => {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("record_source_click", {
        p_source_id: sourceId,
      });
      if (error && !/does not exist|schema cache/i.test(error.message)) {
        console.error("[source-clicks] RPC gagal:", error.message);
      }
    } catch (error) {
      console.error(
        "[source-clicks] exception:",
        error instanceof Error ? error.message : "unknown",
      );
    }
  });

  return new NextResponse(null, { status: 204 });
}
