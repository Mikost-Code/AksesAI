import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Export CSV untuk kebutuhan operasional admin (analisis offline/backup
 * ringan). Otorisasi: role admin/super_admin diperiksa di sini DAN tetap
 * dibatasi RLS saat query berjalan. Batas 5000 baris per export.
 */

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Kutip bila mengandung karakter spesial CSV; gandakan kutip di dalamnya.
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  // \r\n + BOM agar Excel membaca UTF-8 dengan benar.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("tipe") === "pengguna" ? "pengguna" : "program";
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  if (type === "pengguna") {
    const { data, error } = await supabase
      .from("profiles")
      .select("github_username, is_banned, created_at, user_roles!user_id(role)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("[export] pengguna gagal:", error.message);
      return NextResponse.json({ error: "Export gagal." }, { status: 500 });
    }
    const rows = ((data ?? []) as Array<{
      github_username: string;
      is_banned: boolean;
      created_at: string;
      user_roles: Array<{ role: string }> | null;
    }>).map((row) => [
      row.github_username,
      (row.user_roles ?? []).map((r) => r.role).join("|"),
      row.is_banned ? "ya" : "tidak",
      row.created_at,
    ]);
    const csv = toCsv(["username", "roles", "diblokir", "bergabung"], rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aksesai-pengguna-${today}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const { data, error } = await supabase
    .from("assistance_programs")
    .select(
      `slug, title, provider, status, access_type, free_tier_available, requires_card,
       price_input_per_mtok, price_output_per_mtok, rate_limit_rpm, context_window, verified_at,
       categories(name), contributor:profiles!assistance_programs_contributor_id_fkey(github_username)`,
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("[export] program gagal:", error.message);
    return NextResponse.json({ error: "Export gagal." }, { status: 500 });
  }

  const rows = ((data ?? []) as Array<{
    slug: string;
    title: string;
    provider: string | null;
    status: string;
    access_type: string;
    free_tier_available: boolean;
    requires_card: boolean;
    price_input_per_mtok: number | null;
    price_output_per_mtok: number | null;
    rate_limit_rpm: number | null;
    context_window: number | null;
    verified_at: string | null;
    categories: Array<{ name: string }> | null;
    contributor: Array<{ github_username: string }> | null;
  }>).map((row) => [
    row.slug,
    row.title,
    row.provider,
    row.status,
    row.access_type,
    row.categories?.[0]?.name ?? "",
    row.free_tier_available ? "ya" : "tidak",
    row.requires_card ? "ya" : "tidak",
    row.price_input_per_mtok ?? "",
    row.price_output_per_mtok ?? "",
    row.rate_limit_rpm ?? "",
    row.context_window ?? "",
    row.contributor?.[0]?.github_username ?? "",
    row.verified_at ?? "",
  ]);

  const csv = toCsv(
    [
      "slug", "judul", "provider", "status", "jenis_akses", "kategori",
      "free_tier", "perlu_kartu", "harga_input_per_mtok", "harga_output_per_mtok",
      "rate_limit_rpm", "konteks_token", "kontributor", "diverifikasi",
    ],
    rows,
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aksesai-program-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
