import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env-server";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/admin";
import { timingSafeEqualString } from "@/lib/security/timing-safe";

/**
 * Cron: menandai program terverifikasi yang sudah lewat `end_date` menjadi
 * `expired` (FR-DIR/FR-REV). Dijalankan terjadwal (Vercel Cron) dengan header
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * Keamanan:
 *  - Wajib `CRON_SECRET` (dibandingkan konstanta-waktu).
 *  - Memakai service_role DI SERVER SAJA (tidak pernah ke browser).
 *  - RPC `expire_due_programs` menulis riwayat & audit log.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const env = serverEnv();
  const secret = env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!timingSafeEqualString(token, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc("expire_due_programs");
    if (error) {
      console.error("[cron/expire] RPC gagal:", error.message);
      return NextResponse.json({ error: "rpc_failed" }, { status: 500 });
    }
    const expired = typeof data === "number" ? data : 0;
    return NextResponse.json({ ok: true, expired }, { status: 200 });
  } catch (error) {
    console.error(
      "[cron/expire] exception:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
