import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { reportInputSchema } from "@/lib/validation/report";
import { scanSensitiveText, sensitiveScanUserMessage } from "@/lib/security/sensitive-scan";
import { hashIpAddress, getClientIp } from "@/lib/security/ip-hash";
import { rateLimitUpstash, RATE_LIMITS } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = serverEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Turnstile opsional; rate limit tetap berlaku.
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, signal: AbortSignal.timeout(8000) },
    );
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * POST /api/reports — laporan publik (login maupun anonim).
 *
 * Alur: origin check → validasi Zod → pemindaian data sensitif → Turnstile →
 * rate limit (IP hash) → insert (sesi pengguna, atau service_role untuk anonim).
 * IP mentah tidak disimpan; hanya hash bergaram.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const parsed = reportInputSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Data laporan tidak valid." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const findings = scanSensitiveText(input.description, "description");
  if (findings.length > 0) {
    return NextResponse.json(
      { error: sensitiveScanUserMessage(findings) },
      { status: 422 },
    );
  }

  const ip = getClientIp(request.headers);

  const turnstileOk = await verifyTurnstile(input.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json(
      { error: "Verifikasi anti-bot gagal. Muat ulang halaman dan coba lagi." },
      { status: 400 },
    );
  }

  let ipHash: string;
  try {
    ipHash = hashIpAddress(ip);
  } catch (error) {
    console.error("[reports] IP_HASH_SALT tidak dikonfigurasi:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Layanan laporan belum siap. Hubungi pengelola." },
      { status: 503 },
    );
  }

  const limit = await rateLimitUpstash(
    { name: "reports-ip", ...RATE_LIMITS.reportsPerIp },
    ipHash,
  );
  if (limit && !limit.success) {
    return NextResponse.json(
      { error: "Terlalu banyak laporan dari jaringan ini. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const perProgram = await rateLimitUpstash(
    { name: "reports-program", ...RATE_LIMITS.reportPerProgramPerIp },
    `${ipHash}:${input.programId}`,
  );
  if (perProgram && !perProgram.success) {
    return NextResponse.json(
      { error: "Anda sudah melaporkan informasi ini. Terima kasih." },
      { status: 429 },
    );
  }

  // Pengguna login: simpan reporter_id. Anonim: reporter_id null via service_role.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const record = {
    program_id: input.programId,
    reason: input.reason,
    description: input.description,
    reporter_id: user?.id ?? null,
    reporter_ip_hash: ipHash,
  };

  if (user) {
    const { error } = await supabase.from("reports").insert(record);
    if (error) {
      console.error("[reports] Insert gagal:", error.message);
      return NextResponse.json(
        { error: "Laporan gagal disimpan. Silakan coba lagi." },
        { status: 500 },
      );
    }
  } else {
    // SERVICE_ROLE: laporan anonim tidak memiliki sesi; RLS memblokir insert
    // anonim sehingga dipakai route handler terproteksi + rate limit + Turnstile.
    if (!hasServiceRoleEnv()) {
      return NextResponse.json(
        { error: "Laporan anonim belum dikonfigurasi. Silakan masuk untuk melapor." },
        { status: 503 },
      );
    }
    const admin = createServiceRoleClient();
    const { error } = await admin.from("reports").insert(record);
    if (error) {
      console.error("[reports] Insert anonim gagal:", error.message);
      return NextResponse.json(
        { error: "Laporan gagal disimpan. Silakan coba lagi." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
