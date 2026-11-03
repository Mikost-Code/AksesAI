import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper tes RLS & otorisasi terhadap Supabase LOKAL.
 *
 * Menghubungi PostgREST (port 54321) dengan JWT per role:
 *  - anon (publishable key): meniru pengunjung
 *  - service_role: membuat user/auth & data uji
 *  - user JWT: meniru pengguna login dengan role tertentu
 *
 * Jika Supabase lokal tidak berjalan, tes akan di-skip dengan peringatan jelas.
 */

const LOCAL_URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.SUPABASE_TEST_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_TEST_SERVICE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export function serviceClient(): SupabaseClient {
  return createClient(LOCAL_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(LOCAL_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function isLocalSupabaseUp(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status === 401 || res.status === 404;
  } catch {
    return false;
  }
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  username: string;
  client: SupabaseClient;
};

let counter = 0;

/** Membuat pengguna uji nyata (auth.users) + login untuk mendapat JWT. */
export async function createTestUser(prefix: string, roles: string[] = []): Promise<TestUser> {
  counter += 1;
  const unique = `${Date.now().toString(36)}${counter}`;
  const username = `${prefix}-${unique}`.slice(0, 30);
  const email = `${username}@example.test`;
  const password = "Test-Password-123!";

  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_name: username, avatar_url: null },
  });
  if (error || !data.user) throw new Error(`Buat user gagal: ${error?.message}`);

  // Tunggu trigger handle_new_user
  await new Promise((r) => setTimeout(r, 300));

  if (roles.length > 0) {
    const rows = roles.map((role) => ({ user_id: data.user.id, role }));
    const { error: roleError } = await admin.from("user_roles").insert(rows);
    if (roleError) {
      // role 'member' sudah dibuat trigger → abaikan duplikat, sisipkan sisanya.
      for (const role of roles.filter((r) => r !== "member")) {
        await admin.from("user_roles").insert({ user_id: data.user.id, role }).then(() => undefined);
      }
    }
  }

  const client = createClient(LOCAL_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Login user uji gagal: ${signInError.message}`);

  return { id: data.user.id, email, password, username, client };
}

export async function getProfileId(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  return data?.id ?? null;
}

export { LOCAL_URL };
