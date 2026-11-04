import { createClient } from "@supabase/supabase-js";

/**
 * Seed satu entri info AI VERIFIED ke Supabase lokal untuk smoke test.
 *
 * Key di bawah adalah kunci demo Supabase LOKAL yang terdokumentasi publik
 * (issuer `supabase-demo`) — bukan secret proyek, hanya berlaku di 127.0.0.1.
 */
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

const { data: cat } = await admin
  .from("categories")
  .select("id, name")
  .eq("slug", "free-api")
  .single();

const today = new Date().toISOString().slice(0, 10);
const promoEnd = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const slug = `contoh-api-gratis-${Date.now().toString(36)}`;
const { data: program, error } = await admin
  .from("assistance_programs")
  .insert({
    title: "Contoh Provider AI — free tier API untuk data uji",
    slug,
    description:
      "Entri contoh untuk pengembangan lokal: provider fiktif dengan free tier API. Tidak mewakili penawaran nyata mana pun dan hanya dipakai untuk smoke test.",
    category_id: cat.id,
    access_type: "api",
    provider: "Contoh Provider (data uji)",
    free_tier: "Kredit $5 selama 3 bulan, 30 request/menit",
    free_tier_available: true,
    requires_card: false,
    price_input_per_mtok: 0.15,
    price_output_per_mtok: 0.6,
    rate_limit_rpm: 30,
    context_window: 128000,
    requirements: "Daftar akun email; data uji, bukan penawaran nyata.",
    promo_start: today,
    promo_end: promoEnd,
    // Kolom lama tetap diisi agar trigger/pencarian lama konsisten.
    organizer: "Contoh Provider (data uji)",
    published_at: today,
    start_date: today,
    end_date: promoEnd,
    status: "verified",
    contributor_id: created.user.id,
    verified_at: new Date().toISOString(),
  })
  .select("id, slug")
  .single();
if (error) throw error;

await admin.from("sources").insert({
  program_id: program.id,
  source_url: "https://contoh.example/pricing",
  source_url_normalized: "https://contoh.example/pricing",
  source_title: "Halaman harga (contoh)",
  source_type: "halaman_harga",
  is_primary: true,
});

console.log("seeded slug:", program.slug);
