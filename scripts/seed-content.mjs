/**
 * Seed konten direktori AksesAI (data nyata, terverifikasi 6 November 2026).
 *
 * Menulis ke Supabase CLOUD memakai `service_role` dari `.env.local`
 * (server-only, tidak pernah dicetak). Aman dijalankan berulang: baris
 * dicocokkan lewat `slug` sehingga tidak menghasilkan duplikat.
 *
 * CATATAN URUTAN: entri di-seed berurutan dari atas ke bawah — `verified_at`
 * mengikuti urutan penulisan, dan halaman direktori mengurutkan "Terbaru"
 * berdasarkan kolom itu. Karena itu entri PALING BARU diletakkan di AKHIR
 * daftar agar tampil di halaman depan.
 *
 * PENTING — sinkronisasi katalog: entri yang slug-nya TIDAK ada di daftar
 * di bawah akan DIHAPUS dari database (cascade ke sumber & riwayat).
 * Setiap entri WAJIB punya minimal satu sumber resmi — itu inti nilai
 * produk. Kuota/harga berubah cepat: verifikasi ulang tiap kali memperbarui.
 *
 * Jalankan: node scripts/seed-content.mjs
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Env Supabase tidak lengkap di .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

/**
 * Data konten — TERVERIFIKASI 6 NOV 2026 terhadap halaman resmi provider.
 * Urutan: entri lama/stabil dulu, entri TERBARU di akhir (tampil di depan).
 * `freeTier`/harga bersifat indikatif dan WAJIB dicek ulang ke sumber.
 */
const ENTRIES = [
  {
    slug: "supabase-free-tier",
    title: "Supabase Free — Postgres + Auth + Storage gratis",
    category: "hosting-gratis",
    accessType: "hosting",
    provider: "Supabase",
    summary:
      "Dua proyek gratis dengan Postgres, Auth, dan Storage; proyek dijeda otomatis bila seminggu tidak aktif.",
    description:
      "Supabase Free memberi dua proyek gratis dengan batas database, bandwidth, dan storage. Proyek dapat dijeda otomatis setelah periode tidak aktif — perlu perhatian bila dipakai untuk produksi kecil. Upgrade ke Pro menghilangkan pause dan menambah kuota. AksesAI sendiri memakai Supabase untuk database dan autentikasi.",
    freeTier: "2 proyek gratis dengan kuota terbatas",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Supabase — Pricing", url: "https://supabase.com/pricing" },
      { title: "Supabase — Free Plan Limits", url: "https://supabase.com/docs/guides/platform/billing-on-supabase" },
    ],
  },
  {
    slug: "vercel-hobby-gratis",
    title: "Vercel Hobby — deploy frontend & serverless gratis",
    category: "hosting-gratis",
    accessType: "hosting",
    provider: "Vercel",
    summary:
      "Plan Hobby gratis untuk proyek non-komersial: hosting Next.js, preview per PR, dan fungsi serverless dengan kuota bulanan.",
    description:
      "Vercel Hobby cocok untuk proyek open-source dan eksperimen. Batasannya antara lain kuota bandwidth/eksekusi fungsi, cron sekali sehari per job, dan larangan penggunaan komersial. Untuk produk komersial perlu plan Pro. AksesAI sendiri di-host di sini.",
    freeTier: "Kuota bulanan untuk penggunaan non-komersial",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Vercel — Pricing", url: "https://vercel.com/pricing" },
      { title: "Vercel — Limits", url: "https://vercel.com/docs/limits" },
    ],
  },
  {
    slug: "huggingface-spaces-gratis",
    title: "Hugging Face Spaces — hosting demo AI gratis",
    category: "hosting-gratis",
    accessType: "hosting",
    provider: "Hugging Face",
    summary:
      "Hosting aplikasi demo (Gradio/Streamlit/Docker) gratis untuk proyek publik, dengan resource CPU terbatas dan sleep saat idle.",
    description:
      "Spaces memungkinkan publikasi demo AI tanpa mengurus server. Tier gratis memakai perangkat CPU (ZeroGPU quota untuk akun tertentu) dan 'sleep' saat tidak ada akses; untuk GPU atau uptime terus-menerus perlu upgrade berbayar. Baik untuk portofolio dan demo komunitas.",
    freeTier: "CPU dasar gratis untuk space publik",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "HF Spaces — Docs", url: "https://huggingface.co/docs/hub/spaces" },
      { title: "HF — Hardware & Pricing", url: "https://huggingface.co/pricing#spaces" },
    ],
  },
  {
    slug: "ollama-lokal-gratis",
    title: "Ollama — jalankan LLM open-weight di komputer sendiri",
    category: "open-weight",
    accessType: "tool",
    provider: "Ollama",
    summary:
      "Menjalankan model open-weight (Llama, Qwen, Gemma, Mistral, DeepSeek) secara lokal tanpa biaya API. Tidak ada batas kuota karena berjalan di perangkat Anda.",
    description:
      "Ollama mempermudah mengunduh dan menjalankan model open-weight secara lokal dengan satu perintah. Tidak ada biaya per token dan data tidak keluar dari perangkat — cocok untuk privasi dan pemakaian tanpa batas. Konsekuensinya: kualitas dan kecepatan bergantung pada RAM/VRAM perangkat Anda. Gratis dan open-source.",
    freeTier: "Sepenuhnya gratis (berjalan lokal)",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Ollama — Library model", url: "https://ollama.com/library" },
      { title: "Ollama — GitHub", url: "https://github.com/ollama/ollama" },
    ],
  },
  {
    slug: "lm-studio-lokal-gratis",
    title: "LM Studio — GUI untuk LLM lokal",
    category: "open-weight",
    accessType: "tool",
    provider: "LM Studio",
    summary:
      "Antarmuka desktop untuk mengunduh dan menjalankan model GGUF secara lokal, lengkap dengan server API kompatibel OpenAI.",
    description:
      "LM Studio menyediakan GUI untuk mencari, mengunduh, dan menjalankan model open-weight di Windows/macOS/Linux. Ada server lokal kompatibel OpenAI sehingga aplikasi Anda dapat memakai model lokal tanpa biaya per token. Gratis untuk penggunaan pribadi. Periksa lisensi tiap model sebelum pemakaian komersial.",
    freeTier: "Gratis untuk penggunaan pribadi",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "LM Studio", url: "https://lmstudio.ai/" },
      { title: "LM Studio — Docs", url: "https://lmstudio.ai/docs" },
    ],
  },
  {
    slug: "huggingface-inference-payg",
    title: "Hugging Face Inference Providers — pay-as-you-go tanpa markup",
    category: "murah-hemat",
    accessType: "api",
    provider: "Hugging Face",
    summary:
      "Akses ratusan model open-weight lewat satu akun HF dengan tarif pay-as-you-go mengikuti rate provider (tanpa markup). Kredit gratis akun free kini sangat kecil ($0,10/bulan).",
    description:
      "Inference Providers meneruskan permintaan ke provider inferensi pihak ketiga dengan tarif sama seperti rate resmi provider (tanpa markup HF). PENTING: kredit bulanan gratis untuk akun free kini hanya $0,10 per bulan (sebelumnya lebih besar, dan sempat diumumkan berakhir Oktober 2026) — untuk pemakaian berarti gunakan kredit dibeli atau PRO ($9/bulan, termasuk $2 kredit + kuota ZeroGPU 8x). Tetap praktis untuk eksperimen model open-weight sekali-sekali.",
    freeTier: "Kredit free $0,10/bulan; PRO $9/bulan termasuk $2 kredit",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "HF Inference Providers — Pricing", url: "https://huggingface.co/docs/inference-providers/en/pricing" },
      { title: "Hugging Face — Pricing", url: "https://huggingface.co/pricing" },
    ],
  },
  {
    slug: "openrouter-free-models",
    title: "OpenRouter — model gratis dari banyak provider (:free)",
    category: "free-tier-model",
    accessType: "api",
    provider: "OpenRouter",
    summary:
      "Satu API untuk ratusan model. Model berlabel `:free` bisa dipakai tanpa biaya: 20 request/menit dan 50 request/hari — naik ke 1.000/hari setelah top-up kredit $10 (sekali saja).",
    description:
      "OpenRouter menyatukan banyak provider lewat API kompatibel OpenAI. Model berakhiran `:free` gratis dengan batas platform: 20 request per menit dan 50 request per hari untuk akun tanpa kredit; begitu pernah top-up $10 (kredit tidak kedaluwarsa), batas harian naik menjadi 1.000 request per hari. Katalog model `:free` dapat berubah kapan saja dan beberapa hanya tersedia terbatas. Berguna untuk membandingkan banyak model tanpa komitmen biaya.",
    freeTier: "Model `:free`: 20 req/menit, 50 req/hari (1.000/hari dengan $10 kredit)",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 20,
    contextWindow: null,
    sources: [
      { title: "OpenRouter — API Rate Limits", url: "https://openrouter.ai/docs/api_reference/limits" },
      { title: "OpenRouter — Model gratis", url: "https://openrouter.ai/models?max_price=0" },
    ],
  },
  {
    slug: "groq-api-free-tier",
    title: "Groq — inferensi cepat dengan free tier",
    category: "free-api",
    accessType: "api",
    provider: "Groq",
    summary:
      "API inferensi berbasis LPU dengan kecepatan tinggi. Free tier tanpa kartu kredit: sekitar 30 request/menit dan ratusan ribu token per hari, bervariasi per model.",
    description:
      "Groq menyediakan endpoint kompatibel OpenAI dengan kecepatan token tinggi. Free tier tanpa kartu kredit: sekitar 30 request/menit dan 14.400 request/hari untuk model kecil (Llama 8B), dengan kuota sekitar 500 ribu token per hari — angka pastinya per model dan dapat disesuaikan dinamis oleh Groq. Model besar (70B+) punya batas lebih ketat. Batas terkini untuk model tertentu tercantum di halaman rate limit resmi; melampaui batas mengembalikan HTTP 429.",
    freeTier: "~30 req/menit; ~14.400 req/hari (model kecil); ~500 ribu token/hari",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 30,
    contextWindow: null,
    sources: [
      { title: "Groq — Rate Limits", url: "https://console.groq.com/docs/rate-limits" },
      { title: "Groq — Pricing", url: "https://groq.com/pricing/" },
    ],
  },
  {
    slug: "google-ai-studio-gemini-free-tier",
    title: "Google AI Studio — free tier Gemini (kini lebih kecil)",
    category: "free-tier-model",
    accessType: "api",
    provider: "Google",
    summary:
      "Free tier masih ada tetapi menyusut: sejak Oktober 2026 model Flash/Pro ditarik dari free tier — fokus ke Flash-Lite (~250 request/hari) dan ~5.000 request/bulan untuk model Gemini 3+.",
    description:
      "Google AI Studio menyediakan akses Gemini API dengan tier gratis — namun sejak 9 Oktober 2026 model Flash dan Pro ditarik dari free tier; kuota gratis kini terpusat di varian Flash-Lite (sekitar 250 request per hari dengan API key gratis) dan alokasi sekitar 5.000 request per bulan untuk model Gemini 3+. Gemini CLI memberi 1.000 request per hari dengan akun Google yang login. Angka pasti per model ada di halaman rate limit resmi dan dapat berubah. Untuk produksi gunakan tier berbayar.",
    freeTier: "Flash-Lite ~250 req/hari; ~5.000 req/bulan untuk Gemini 3+",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Gemini API — Rate Limits", url: "https://aistudio.google.com/docs/rate-limits" },
      { title: "Google AI Studio — Pricing", url: "https://ai.google.dev/pricing" },
    ],
  },
  {
    slug: "cerebras-free-trial",
    title: "Cerebras Inference — Free Trial kredit $5",
    category: "free-api",
    accessType: "api",
    provider: "Cerebras",
    summary:
      "Inferensi ultra-cepat (ribuan token per detik). Sejak Juli 2026 free tier menjadi Free Trial: kredit $5 dengan limit 5 request/menit dan 30 ribu token/menit.",
    description:
      "Cerebras menyediakan API kompatibel OpenAI dengan fokus kecepatan ekstrem. Sejak 21 Juli 2026, tier gratis diubah menjadi Free Trial berbasis kredit $5 (tanpa kartu kredit) dengan rate limit 5 request per menit dan 30 ribu token per menit, berlaku untuk model seperti Llama 4 Scout, Qwen3, dan gpt-oss-120b. Menambahkan dana $10 membuka limit 10x lebih tinggi. Cek halaman resmi untuk katalog dan angka terkini.",
    freeTier: "Kredit Free Trial $5; 5 req/menit, 30 ribu token/menit",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 5,
    contextWindow: null,
    sources: [
      { title: "Cerebras — Rate Limits", url: "https://inference-docs.cerebras.ai/support/rate-limits" },
      { title: "Cerebras — Pricing", url: "https://www.cerebras.ai/pricing" },
    ],
  },
  {
    slug: "cloudflare-workers-ai-free-allocation",
    title: "Cloudflare Workers AI — 10.000 neuron gratis per hari",
    category: "hosting-gratis",
    accessType: "api",
    provider: "Cloudflare",
    summary:
      "Alokasi 10.000 Neuron gratis setiap hari (reset 00:00 UTC) untuk menjalankan model teks, gambar, dan embedding di edge Cloudflare.",
    description:
      "Workers AI memberi setiap akun 10.000 Neuron per hari tanpa biaya (reset harian 00:00 UTC) — unit tagihan inferensi Cloudflare yang berlaku untuk semua model. Sejak Juli 2026 sebagian model besar mensyaratkan plan berbayar ($5/bulan, tetap termasuk 10.000 neuron gratis/hari); di luar alokasi, biaya $0,011 per 1.000 neuron. Integrasinya dekat dengan Workers/KV/R2 sehingga cocok untuk aplikasi ringan tanpa server sendiri.",
    freeTier: "10.000 Neuron/hari, reset 00:00 UTC",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Cloudflare Workers AI — Pricing", url: "https://developers.cloudflare.com/workers-ai/platform/pricing/" },
      { title: "Cloudflare Workers AI — Models", url: "https://developers.cloudflare.com/workers-ai/models/" },
    ],
  },
  {
    slug: "mistral-experiment-free-tier",
    title: "Mistral La Plateforme — tier Experiment gratis",
    category: "free-tier-model",
    accessType: "api",
    provider: "Mistral AI",
    summary:
      "Tier Experiment gratis untuk eksperimen (sekitar 2.000 request/hari, bervariasi) — dengan catatan penting: data gratis dipakai untuk pelatihan kecuali Anda menonaktifkannya di pengaturan.",
    description:
      "La Plateforme menyediakan tier Experiment gratis untuk pengembangan dan evaluasi dengan rate limit per model (sekitar 2.000 request per hari, dapat berubah; struktur terbaru memakai kuota/kredit bulanan). CATATAN PRIVASI: pada tier gratis, input dan output secara bawaan dipakai untuk program pelatihan Mistral — nonaktifkan lewat pengaturan data bila ingin ikut serta (opt-out). Model open-weight Mistral juga bisa dijalankan sendiri tanpa batas pihak ketiga.",
    freeTier: "Tier Experiment ~2.000 req/hari (opt-out pelatihan data)",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Mistral — Usage Limits", url: "https://docs.mistral.ai/admin/billing-usage/usage-limits" },
      { title: "Mistral — Pricing", url: "https://mistral.ai/pricing" },
    ],
  },
  // ── Entri TERBARU (tampil paling depan di urutan "Terbaru") ──────────────
  {
    slug: "opencode-deepseek-free",
    title: "OpenCode CLI — DeepSeek V4.1 Flash gratis (kampanye)",
    category: "tool-ai-gratis",
    accessType: "tool",
    provider: "OpenCode",
    summary:
      "CLI coding berbasis terminal yang menjadikan DeepSeek V4.1 Flash gratis selama kampanye berlangsung — model paling banyak dipakai di platform mereka belakangan ini.",
    description:
      "OpenCode adalah CLI coding agent yang berjalan di terminal. Selama kampanye, model DeepSeek V4.1 Flash dapat dipakai gratis di dalam OpenCode (tanpa biaya per token untuk model tersebut); bila kampanye berakhir, tarifnya kembali ke $0,30/juta token input. Batas waktu kampanye belum diumumkan resmi — cek halaman resmi OpenCode untuk status terbaru. Gratis tidak mengubah kebijakan data OpenCode yang mengikuti zero-retention dari provider. Cocok untuk eksperimen coding agent tanpa biaya.",
    freeTier: "Model DeepSeek V4.1 Flash gratis selama kampanye",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: 1000000,
    sources: [
      { title: "OpenCode — Docs", url: "https://opencode.ai/docs" },
      { title: "OpenCode", url: "https://opencode.ai" },
    ],
  },
  {
    slug: "tokenharbor-free-tier",
    title: "Token Harbor — free tier $0 dengan reset 7 hari",
    category: "free-api",
    accessType: "api",
    provider: "Token Harbor",
    summary:
      "Agregator API dengan tier gratis $0/bulan yang alokasinya di-reset pada periode 7 hari bergulir, mencakup model gratis pilihan seperti DeepSeek V4.1 Flash.",
    description:
      "Token Harbor menyatukan banyak provider (Anthropic, OpenAI, Gemini, Zhipu, Kimi) dalam satu API. Free tier $0/bulan punya alokasi gratis yang di-reset pada periode 7 hari bergulir (rolling), dan model gratis (DeepSeek V4.1 Flash, MiMo V2.6 Flash, TH-Rudder) perlu diaktifkan manual di dashboard. PERHATIAN PRIVASI: pada model gratis, prompt dan respons dapat disimpan untuk diagnostik dan dapat dibaca staf; provider pihak ketiga boleh memakainya sesuai ketentuan mereka (termasuk melatih model). Jangan kirim data sensitif lewat jalur gratis. Ada paket berbayar (mulai $1,99/bulan) bila butuh alokasi lebih besar.",
    freeTier: "Alokasi gratis $0/bulan, reset 7 hari bergulir",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Token Harbor — Pricing", url: "https://tokenharbor.ai/pricing" },
      { title: "Token Harbor", url: "https://tokenharbor.ai" },
    ],
  },
  {
    slug: "deepseek-v41-flash-api",
    title: "DeepSeek V4.1 Flash — API super murah (gratis via OpenCode)",
    category: "murah-hemat",
    accessType: "api",
    provider: "DeepSeek",
    summary:
      "Harga input mulai $0,15/juta token (off-peak, cache-hit jauh lebih murah); bobot model terbuka lisensi MIT dan sedang gratis dipakai lewat OpenCode selama kampanye berlangsung.",
    description:
      "DeepSeek V4.1 Flash (versi 1017) menawarkan harga sangat rendah: input $0,15/juta token off-peak ($0,30 saat jam sibuk), output $0,60/juta (peak $1,20), dan input cache-hit mulai ~$0,003/juta. Konteks hingga 1 juta token. Bobot model terbuka di Hugging Face dengan lisensi MIT sehingga bisa dijalankan sendiri. Saat ini juga GRATIS melalui OpenCode (kampanye berlangsung; batas waktu belum diumumkan resmi — pantau halaman OpenCode). Cocok untuk volume besar seperti klasifikasi dan ringkasan; perhatikan kebijakan penyimpanan data untuk kasus sensitif.",
    freeTier: "Gratis via OpenCode (kampanye); bobot terbuka MIT di Hugging Face",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: 1000000,
    priceInput: 0.15,
    priceOutput: 0.6,
    sources: [
      { title: "DeepSeek — Models & Pricing", url: "https://api-docs.deepseek.com/quick_start/pricing" },
      { title: "DeepSeek-V4.1-Flash di Hugging Face (MIT)", url: "https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash" },
    ],
  },
];

/**
 * Cermin dari normalizeSourceUrl (src/lib/security/ssrf-guard.ts):
 * host lowercase tanpa www, tanpa fragment/param pelacakan/trailing slash.
 */
function normalizeSourceUrl(url) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.replace(/\/+$/, "");
  const params = new URLSearchParams(parsed.search);
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if (lower === "ref" || lower.startsWith("utm_") || ["fbclid", "gclid", "igshid", "ref_src"].includes(lower)) {
      params.delete(key);
    }
  }
  params.sort();
  const query = params.toString();
  return `${parsed.protocol}//${host}${path}${query ? `?${query}` : ""}`;
}

function toApiType(accessType) {
  // Enum access_type di DB: api | chat | tool | hosting | model.
  return accessType === "lokal" ? "model" : accessType;
}

const contributorUsername = "zann06";

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("id")
  .eq("github_username", contributorUsername)
  .single();

if (profileError || !profile) {
  console.error("Profil kontributor tidak ditemukan:", profileError?.message);
  process.exit(1);
}

const { data: categories, error: catError } = await admin
  .from("categories")
  .select("id, slug");

if (catError) {
  console.error("Gagal memuat kategori:", catError.message);
  process.exit(1);
}

const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

// ---------------------------------------------------------------------------
// Sinkronisasi katalog: hapus entri yang slug-nya tidak ada di daftar di atas
// (cascade ke sumber, riwayat, laporan, dan feedback).
// ---------------------------------------------------------------------------
const keepSlugs = new Set(ENTRIES.map((e) => e.slug));
const { data: allRows, error: allError } = await admin
  .from("assistance_programs")
  .select("id, slug");

if (allError) {
  console.error("Gagal membaca daftar entri:", allError.message);
  process.exit(1);
}

const stale = (allRows ?? []).filter((row) => !keepSlugs.has(row.slug));
let deleted = 0;
for (const row of stale) {
  const { error } = await admin.from("assistance_programs").delete().eq("id", row.id);
  if (error) {
    console.warn(`  gagal hapus ${row.slug}: ${error.message}`);
  } else {
    deleted += 1;
    console.log(`  dihapus: ${row.slug}`);
  }
}

let inserted = 0;
let updated = 0;
let failed = 0;

const today = new Date().toISOString().slice(0, 10);

for (const entry of ENTRIES) {
  const categoryId = catBySlug.get(entry.category);
  if (!categoryId) {
    console.warn(`  lewati ${entry.slug}: kategori "${entry.category}" tidak ada`);
    failed += 1;
    continue;
  }

  const row = {
    title: entry.title,
    slug: entry.slug,
    description: entry.description,
    category_id: categoryId,
    region_scope: "nasional",
    province: null,
    city: null,
    // `region` adalah generated column — tidak boleh diisi manual.
    organizer: entry.provider,
    requirements: null,
    published_at: today,
    start_date: null,
    end_date: null,
    status: "verified",
    contributor_id: profile.id,
    reviewer_id: profile.id,
    verified_at: new Date().toISOString(),
    contributor_note: null,
    access_type: toApiType(entry.accessType),
    provider: entry.provider,
    free_tier: entry.freeTier,
    free_tier_available: entry.freeTierAvailable,
    requires_card: entry.requiresCard,
    price_input_per_mtok: entry.priceInput ?? null,
    price_output_per_mtok: entry.priceOutput ?? null,
    rate_limit_rpm: entry.rateLimit ?? null,
    context_window: entry.contextWindow ?? null,
    promo_start: null,
    promo_end: null,
  };

  const { data: existing } = await admin
    .from("assistance_programs")
    .select("id")
    .eq("slug", entry.slug)
    .maybeSingle();

  let programId = existing?.id;

  if (programId) {
    const { error } = await admin
      .from("assistance_programs")
      .update(row)
      .eq("id", programId);
    if (error) {
      console.warn(`  gagal update ${entry.slug}: ${error.message}`);
      failed += 1;
      continue;
    }
    updated += 1;
  } else {
    const { data, error } = await admin
      .from("assistance_programs")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.warn(`  gagal insert ${entry.slug}: ${error.message}`);
      failed += 1;
      continue;
    }
    programId = data.id;
    inserted += 1;
  }

  // Sumber resmi: ganti agar tidak menumpuk duplikat.
  await admin.from("sources").delete().eq("program_id", programId);
  const { error: srcError } = await admin.from("sources").insert(
    entry.sources.map((s, index) => ({
      program_id: programId,
      source_url: s.url,
      source_url_normalized: normalizeSourceUrl(s.url),
      source_title: s.title,
      is_primary: index === 0,
      source_type: "dokumentasi_resmi",
      link_status: "ok",
      last_checked_at: new Date().toISOString(),
    })),
  );
  if (srcError) {
    console.warn(`  gagal simpan sumber ${entry.slug}: ${srcError.message}`);
    failed += 1;
  }
}

console.log(
  `selesai — dihapus: ${deleted}, ditambah: ${inserted}, diperbarui: ${updated}, gagal: ${failed}, total katalog: ${ENTRIES.length}`,
);
