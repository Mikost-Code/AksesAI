import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

/**
 * Helper E2E: membuat pengguna sungguhan (auth.users) + sesi, lalu menanamkan
 * cookie Supabase ke konteks browser Playwright agar alur terautentikasi dapat
 * diuji tanpa bergantung pada OAuth GitHub (yang tak bisa diotomasi lokal).
 *
 * Cookie mengikuti format @supabase/ssr: nama `sb-<ref>-auth-token`, nilai
 * `base64-` + base64url(JSON(session)). Cookie dipecah menjadi potongan
 * `<name>.0`, `<name>.1`, ... bila melebihi ~3180 byte, sama seperti library.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PASSWORD = "E2E-Password-123!";

let counter = 0;

export function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type E2EUser = { id: string; email: string; username: string; password: string };

export async function createUser(
  prefix: string,
  roles: string[] = [],
): Promise<E2EUser> {
  counter += 1;
  const unique = `${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 4)}`;
  const username = `${prefix}-${unique}`.slice(0, 30);
  const email = `${username}@example.test`;

  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { user_name: username, avatar_url: null },
  });
  if (error || !data.user) throw new Error(`Gagal membuat user E2E: ${error?.message}`);

  // Tunggu trigger handle_new_user membuat profil + role member.
  await new Promise((r) => setTimeout(r, 500));

  // Ambil username AKTUAL dari profil: trigger memberi suffix bila bentrok dan
  // memotong ke 30 karakter, jadi tebakan kita bisa meleset.
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("github_username")
    .eq("id", data.user.id)
    .single();
  if (profileErr || !profile) {
    throw new Error(`Gagal membaca profil E2E: ${profileErr?.message}`);
  }
  const githubUsername = profile.github_username as string;

  for (const role of roles) {
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: data.user.id, role });
    // 'member' sudah dibuat trigger → lewati duplikat.
    if (roleErr && role !== "member") {
      throw new Error(`Gagal memberi role ${role}: ${roleErr.message}`);
    }
  }

  return { id: data.user.id, email, username: githubUsername, password: PASSWORD };
}

export async function signInSession(email: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`Sign-in E2E gagal: ${error.message}`);
  return data.session;
}

const MAX_CHUNK_SIZE = 3180;

function projectRef(): string {
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0] ?? "127";
  } catch {
    return "127";
  }
}

/**
 * Susun cookie sesi persis seperti `createChunks` di `@supabase/ssr`:
 * nilai di-encode (`base64-` + base64url), lalu dipecah per 3180 karakter
 * dari nilai yang sudah di-URI-encode. Nama: `sb-<ref>-auth-token[.N]`.
 */
function buildCookieParts(session: unknown): Array<{ name: string; value: string }> {
  const key = `sb-${projectRef()}-auth-token`;
  const value =
    "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");

  if (encodeURIComponent(value).length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }];
  }

  // Pecah berdasarkan panjang nilai ter-encode, memotong di batas non-escape.
  const encoded = encodeURIComponent(value);
  const parts: Array<{ name: string; value: string }> = [];
  let rest = encoded;
  let index = 0;
  while (rest.length > 0) {
    let head = rest.slice(0, MAX_CHUNK_SIZE);
    const lastEscape = head.lastIndexOf("%");
    if (lastEscape > MAX_CHUNK_SIZE - 3) {
      head = rest.slice(0, lastEscape);
    }
    parts.push({ name: `${key}.${index}`, value: decodeURIComponent(head) });
    rest = rest.slice(head.length);
    index += 1;
  }
  return parts;
}

/**
 * Tanam cookie sesi pengguna ke konteks browser. Memakai `addCookies` sehingga
 * berlaku untuk semua request berikutnya di konteks tersebut.
 */
export async function authenticate(
  context: BrowserContext,
  baseURL: string,
  user: E2EUser,
): Promise<void> {
  const session = await signInSession(user.email);
  const parts = buildCookieParts(session);

  // Hapus cookie auth lama agar tidak bercampur, lalu tanam yang baru.
  const existing = await context.cookies();
  await context.clearCookies();
  const cleaned = existing.filter((c) => !c.name.includes("-auth-token"));
  if (cleaned.length > 0) await context.addCookies(cleaned);

  await context.addCookies(
    parts.map((p) => ({
      name: p.name,
      value: p.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );

  // Pastikan sesi benar-benar berlaku: muat halaman terproteksi & cek tidak
  // ter-redirect ke /login. Bila gagal, uji berikutnya akan menyesatkan.
  const res = await context.request.get(new URL("/dashboard", baseURL).toString(), {
    maxRedirects: 0,
  });
  if (res.status() >= 300 && res.status() < 400) {
    throw new Error(
      `Authenticate gagal: /dashboard → ${res.status()} ${res.headers()["location"] ?? ""}`,
    );
  }
}

export async function deleteUser(id: string): Promise<void> {
  await serviceClient().auth.admin.deleteUser(id);
}

export async function getFirstCategoryId(): Promise<string> {
  const { data, error } = await serviceClient()
    .from("categories")
    .select("id")
    .limit(1)
    .single();
  if (error || !data) throw new Error("Tidak ada kategori di DB uji.");
  return data.id as string;
}

/**
 * Membuat program `pending` milik kontributor tertentu (untuk uji reviewer).
 *
 * Insert memakai service_role agar langsung berstatus `pending` — jalur normal
 * (`submit_program`) menegakkan batas harian & larangan self-review yang tidak
 * relevan di sini. Skema tabel TIDAK punya kolom `submitted_at`; waktu kirim
 * diwakili `created_at`.
 */
export async function createPendingProgram(contributorId: string, label: string): Promise<string> {
  const categoryId = await getFirstCategoryId();
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const svc = serviceClient();
  const { data, error } = await svc
    .from("assistance_programs")
    .insert({
      title: `Program E2E ${label}`,
      slug: `e2e-${label}-${unique}`.slice(0, 90),
      description:
        "Deskripsi program untuk pengujian end-to-end yang cukup panjang melebihi lima puluh karakter.",
      category_id: categoryId,
      organizer: "Organisasi E2E",
      contributor_id: contributorId,
      region_scope: "nasional",
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Gagal membuat program E2E: ${error?.message}`);
  return data.id as string;
}
