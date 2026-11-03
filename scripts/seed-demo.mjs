import { createClient } from "@supabase/supabase-js";

/** Seed satu program VERIFIED ke Supabase lokal untuk smoke test. */
const url = "http://127.0.0.1:54321";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(url, key, { auth: { persistSession: false } });

const username = `kontributor-demo-${Date.now().toString(36)}`;
const { data: created, error: userError } = await admin.auth.admin.createUser({
  email: `${username}@example.test`,
  password: "Test-Password-123!",
  email_confirm: true,
  user_metadata: { user_name: username, avatar_url: null },
});
if (userError) throw userError;
await new Promise((r) => setTimeout(r, 300));

const { data: cat } = await admin.from("categories").select("id, name").eq("slug", "pendidikan").single();

const slug = `beasiswa-contoh-${Date.now().toString(36)}`;
const { data: program, error } = await admin
  .from("assistance_programs")
  .insert({
    title: "Beasiswa Contoh untuk Pelajar SMA",
    slug,
    description:
      "Program beasiswa contoh untuk pelajar SMA berprestasi. Informasi ini hanya contoh pengembangan lokal dan bukan program nyata.",
    category_id: cat.id,
    region_scope: "nasional",
    organizer: "Organisasi Contoh (data uji)",
    requirements: "Siswa SMA aktif; informasi ini data uji.",
    published_at: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "verified",
    contributor_id: created.user.id,
    verified_at: new Date().toISOString(),
  })
  .select("id, slug")
  .single();
if (error) throw error;

await admin.from("sources").insert({
  program_id: program.id,
  source_url: "https://contoh.go.id/pengumuman-beasiswa",
  source_url_normalized: "https://contoh.go.id/pengumuman-beasiswa",
  source_title: "Pengumuman resmi (contoh)",
  source_type: "situs_resmi",
  is_primary: true,
});

console.log("seeded slug:", program.slug);

