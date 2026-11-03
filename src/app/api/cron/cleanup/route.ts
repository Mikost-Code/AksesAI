import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/admin";
import { timingSafeEqualString } from "@/lib/security/timing-safe";

/**
 * Cron mingguan: menghapus hash IP laporan lama, melepas klaim yang
 * kedaluwarsa, dan membersihkan bucket rate-limit (retensi privasi).
 *
 * RPC `cleanup_expired_data` menulis ringkasan ke audit log.
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
    const { data, error } = await admin.rpc("cleanup_expired_data");
    if (error) {
      console.error("[cron/cleanup] RPC gagal:", error.message);
      return NextResponse.json({ error: "rpc_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (error) {
    console.error(
      "[cron/cleanup] exception:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
