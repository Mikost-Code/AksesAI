/**
 * Seed konten awal direktori AksesAI (data nyata, bukan data uji).
 *
 * Menulis ke Supabase CLOUD memakai `service_role` dari `.env.local`
 * (server-only, tidak pernah dicetak). Aman dijalankan berulang: baris
 * dicocokkan lewat `slug` sehingga tidak menghasilkan duplikat.
 *
 * Setiap entri WAJIB punya minimal satu sumber resmi — itu inti nilai produk.
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
 * Data konten. Semua tautan mengarah ke halaman resmi provider.
 * `freeTier`/harga bersifat indikatif dan WAJIB dicek ulang ke sumber —
 * disclaimer situs sudah menyatakan hal ini.
 */
const ENTRIES = [
  {
    slug: "google-ai-studio-gemini-api-free-tier",
    title: "Google AI Studio — Gemini API free tier",
    category: "free-tier-model",
    accessType: "api",
    provider: "Google",
    summary:
      "Gemini API punya kuota gratis harian untuk beberapa model, cukup untuk prototipe dan eksperimen tanpa kartu kredit. Batas dihitung per menit dan per hari.",
    description:
      "Google AI Studio menyediakan akses Gemini API dengan tier gratis yang dibatasi rate limit (RPM/TPM/RPD). Cocok untuk prototyping, chatbot internal, atau eksperimen RAG skala kecil. Kuota gratis dapat berubah dan tidak menjamin ketersediaan untuk produksi — untuk beban produksi gunakan tier berbayar.",
    freeTier: "Kuota harian gratis untuk beberapa model Gemini (cek batas terbaru)",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 15,
    contextWindow: 1000000,
    sources: [
      { title: "Gemini API Pricing (free tier)", url: "https://ai.google.dev/pricing" },
      { title: "Gemini API Rate Limits", url: "https://ai.google.dev/gemini-api/docs/rate-limits" },
    ],
  },
  {
    slug: "groq-api-free-tier",
    title: "Groq API — inferensi cepat dengan free tier",
    category: "free-api",
    accessType: "api",
    provider: "Groq",
    summary:
      "API inferensi berbasis LPU dengan kecepatan token tinggi. Tersedia tier gratis berbatas rate untuk model open-weight populer.",
    description:
      "Groq menyediakan endpoint kompatibel OpenAI sehingga mudah dipakai dengan SDK yang sudah ada. Free tier dibatasi berdasarkan permintaan per menit dan token per menit per model. Untuk aplikasi produksi, periksa halaman rate limit karena batas dapat berubah tanpa pemberitahuan.",
    freeTier: "Kuota gratis dengan rate limit per model",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 30,
    contextWindow: 131072,
    sources: [
      { title: "Groq Pricing", url: "https://groq.com/pricing/" },
      { title: "Groq Rate Limits", url: "https://console.groq.com/docs/rate-limits" },
    ],
  },
  {
    slug: "openrouter-free-models",
    title: "OpenRouter — model gratis dari banyak provider",
    category: "free-tier-model",
    accessType: "api",
    provider: "OpenRouter",
    summary:
      "Satu API untuk puluhan model dari berbagai provider. Sebagian model berlabel `:free` dapat dipakai tanpa biaya dengan batas harian.",
    description:
      "OpenRouter menyatukan banyak provider lewat API kompatibel OpenAI. Model dengan akhiran `:free` tersedia tanpa biaya namun memiliki batas permintaan harian dan dapat berubah/berhenti kapan saja. Berguna untuk membandingkan model tanpa komitmen biaya.",
    freeTier: "Model bertanda :free dengan batas permintaan harian",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 20,
    contextWindow: null,
    sources: [
      { title: "OpenRouter Models", url: "https://openrouter.ai/models" },
      { title: "OpenRouter FAQ — free models", url: "https://openrouter.ai/docs/faq" },
    ],
  },
  {
    slug: "huggingface-inference-free-credits",
    title: "Hugging Face Inference — kredit gratis bulanan",
    category: "free-api",
    accessType: "api",
    provider: "Hugging Face",
    summary:
      "Inference Providers memberi kredit gratis terbatas per bulan untuk mencoba banyak model open-weight lewat satu antarmuka.",
    description:
      "Hugging Face Inference Providers meneruskan permintaan ke penyedia inferensi pihak ketiga. Akun gratis mendapat kredit bulanan terbatas; setelah habis, permintaan ditolak atau ditagihkan sesuai kebijakan akun. Cocok untuk eksperimen model open-weight.",
    freeTier: "Kredit gratis bulanan untuk akun gratis",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Hugging Face Inference Providers", url: "https://huggingface.co/docs/inference-providers" },
      { title: "Hugging Face Pricing", url: "https://huggingface.co/pricing" },
    ],
  },
  {
    slug: "mistral-la-plateforme-free-tier",
    title: "Mistral AI — free tier La Plateforme",
    category: "free-tier-model",
    accessType: "api",
    provider: "Mistral AI",
    summary:
      "Akses API model Mistral (termasuk model open-weight) dengan tier gratis berbatas rate untuk pengembangan.",
    description:
      "La Plateforme menyediakan akses API ke model Mistral. Tier gratis ditujukan untuk eksperimen dan dibatasi rate per detik/menit. Model seperti Mistral Small/Large tersedia, begitu pula model open-weight yang dapat dijalankan sendiri bila ingin tanpa batas pihak ketiga.",
    freeTier: "Tier gratis berbatas rate untuk pengembangan",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Mistral AI Pricing", url: "https://mistral.ai/pricing" },
      { title: "Mistral Docs", url: "https://docs.mistral.ai/" },
    ],
  },
  {
    slug: "ollama-lokal-gratis",
    title: "Ollama — jalankan LLM open-weight di komputer sendiri",
    category: "open-weight",
    accessType: "lokal",
    provider: "Ollama",
    summary:
      "Menjalankan model open-weight secara lokal tanpa biaya API. Butuh RAM/VRAM memadai; tidak ada batas kuota karena berjalan di perangkat Anda.",
    description:
      "Ollama mempermudah mengunduh dan menjalankan model open-weight (mis. Llama, Qwen, Gemma, Mistral) secara lokal dengan satu perintah. Tidak ada biaya per token dan data tidak keluar dari perangkat — cocok untuk privasi. Konsekuensinya: kualitas dan kecepatan bergantung pada perangkat keras Anda.",
    freeTier: "Sepenuhnya gratis (berjalan lokal)",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Ollama — Library model", url: "https://ollama.com/library" },
      { title: "Ollama GitHub", url: "https://github.com/ollama/ollama" },
    ],
  },
  {
    slug: "lm-studio-lokal-gratis",
    title: "LM Studio — GUI untuk LLM lokal",
    category: "open-weight",
    accessType: "lokal",
    provider: "LM Studio",
    summary:
      "Antarmuka desktop untuk mengunduh dan menjalankan model GGUF secara lokal, lengkap dengan server API kompatibel OpenAI.",
    description:
      "LM Studio menyediakan GUI untuk mencari, mengunduh, dan menjalankan model open-weight di Windows/macOS/Linux. Ada server lokal kompatibel OpenAI sehingga aplikasi Anda dapat memakai model lokal tanpa biaya per token. Periksa lisensi tiap model sebelum pemakaian komersial.",
    freeTier: "Gratis untuk penggunaan pribadi",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "LM Studio", url: "https://lmstudio.ai/" },
      { title: "LM Studio Docs", url: "https://lmstudio.ai/docs" },
    ],
  },
  {
    slug: "cloudflare-workers-ai-free-allocation",
    title: "Cloudflare Workers AI — alokasi gratis harian",
    category: "hosting-gratis",
    accessType: "api",
    provider: "Cloudflare",
    summary:
      "Menjalankan model (teks, gambar, embedding) di edge Cloudflare dengan alokasi neuron gratis harian.",
    description:
      "Workers AI memberi alokasi gratis harian berbasis 'neuron' untuk inferensi di jaringan edge. Integrasinya dekat dengan Workers/KV/R2 sehingga cocok untuk aplikasi ringan tanpa server sendiri. Alokasi gratis dapat berubah; periksa halaman pricing untuk angka terbaru.",
    freeTier: "Alokasi neuron gratis harian",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Cloudflare Workers AI Pricing", url: "https://developers.cloudflare.com/workers-ai/platform/pricing/" },
      { title: "Workers AI Models", url: "https://developers.cloudflare.com/workers-ai/models/" },
    ],
  },
  {
    slug: "github-models-free-tier",
    title: "GitHub Models — akses model dengan kuota gratis",
    category: "free-tier-model",
    accessType: "api",
    provider: "GitHub",
    summary:
      "Katalog model dari beberapa provider yang dapat dicoba lewat GitHub dengan batas permintaan gratis per akun.",
    description:
      "GitHub Models menyediakan playground dan endpoint API untuk model populer dengan kuota gratis terbatas per tingkat akun GitHub. Berguna untuk eksperimen cepat tanpa mendaftar ke tiap provider. Batas dan katalog model dapat berubah.",
    freeTier: "Kuota permintaan gratis per akun GitHub",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "GitHub Models", url: "https://docs.github.com/en/github-models" },
      { title: "GitHub Models — rate limits", url: "https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models" },
    ],
  },
  {
    slug: "deepseek-api-harga-murah",
    title: "DeepSeek API — harga per token sangat rendah",
    category: "murah-hemat",
    accessType: "api",
    provider: "DeepSeek",
    summary:
      "Model DeepSeek menawarkan harga per juta token yang jauh di bawah model frontier, dengan kualitas kompetitif untuk banyak tugas teks.",
    description:
      "API DeepSeek berkompatibel dengan format OpenAI. Biayanya jauh lebih murah dibanding model tertutup kelas atas, sehingga cocok untuk beban besar seperti klasifikasi, ringkasan, atau ekstraksi. Perhatikan kebijakan penyimpanan data dan ketersediaan layanan sebelum dipakai untuk data sensitif.",
    freeTier: null,
    freeTierAvailable: false,
    requiresCard: false,
    contextWindow: 64000,
    sources: [
      { title: "DeepSeek API Pricing", url: "https://api-docs.deepseek.com/quick_start/pricing" },
      { title: "DeepSeek Platform", url: "https://platform.deepseek.com/" },
    ],
  },
  {
    slug: "gemini-flash-harga-murah",
    title: "Gemini Flash — kelas cepat dengan harga rendah",
    category: "murah-hemat",
    accessType: "api",
    provider: "Google",
    summary:
      "Model Gemini Flash dirancang untuk latensi rendah dan biaya rendah, cocok untuk volume besar dan aplikasi interaktif.",
    description:
      "Gemini Flash berada di kelas 'cepat & murah' dengan harga per juta token yang rendah dibanding model Pro. Ideal untuk chatbot, ringkasan, dan pemrosesan dokumen berskala. Periksa halaman harga resmi untuk angka terbaru karena penawaran sering diperbarui.",
    freeTier: null,
    freeTierAvailable: false,
    requiresCard: true,
    contextWindow: 1000000,
    priceInput: 0.075,
    priceOutput: 0.3,
    sources: [
      { title: "Gemini API Pricing", url: "https://ai.google.dev/pricing" },
    ],
  },
  {
    slug: "openrouter-free-tool-terbaik",
    title: "Chatbot web gratis untuk membandingkan model AI",
    category: "tool-ai-gratis",
    accessType: "tool",
    provider: "OpenRouter",
    summary:
      "Antarmuka web untuk mencoba banyak model sekaligus tanpa instalasi, termasuk model gratis — berguna untuk memilih model sebelum menulis kode.",
    description:
      "Selain API, OpenRouter menyediakan chat web untuk menguji model yang berbeda. Cocok untuk membandingkan jawaban antar model sebelum memutuskan mana yang dipakai di aplikasi. Batas penggunaan mengikuti kebijakan akun.",
    freeTier: "Model :free dapat dipakai tanpa biaya",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "OpenRouter Chat", url: "https://openrouter.ai/chat" },
      { title: "OpenRouter Models", url: "https://openrouter.ai/models" },
    ],
  },
  {
    slug: "huggingface-spaces-gratis",
    title: "Hugging Face Spaces — hosting demo AI gratis",
    category: "hosting-gratis",
    accessType: "hosting",
    provider: "Hugging Face",
    summary:
      "Hosting aplikasi demo (Gradio/Streamlit/Docker) secara gratis untuk proyek publik, dengan resource CPU terbatas.",
    description:
      "Spaces memungkinkan publikasi demo AI tanpa mengurus server. Tier gratis memakai perangkat CPU dan 'sleep' saat tidak ada akses; untuk GPU atau uptime terus-menerus perlu upgrade. Baik untuk portofolio dan demo komunitas.",
    freeTier: "CPU dasar gratis untuk space publik",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Hugging Face Spaces", url: "https://huggingface.co/docs/hub/spaces" },
      { title: "HF Spaces Hardware", url: "https://huggingface.co/pricing#spaces" },
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
      "Vercel Hobby cocok untuk proyek open-source dan eksperimen. Batasannya antara lain kuota bandwidth/eksekusi fungsi, cron hanya sekali sehari per job, dan larangan penggunaan komersial. Untuk produk komersial perlu plan Pro.",
    freeTier: "Kuota bulanan untuk penggunaan non-komersial",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Vercel Pricing", url: "https://vercel.com/pricing" },
      { title: "Vercel Hobby Plan", url: "https://vercel.com/docs/limits" },
    ],
  },
  {
    slug: "supabase-free-tier",
    title: "Supabase Free — Postgres + Auth + Storage gratis",
    category: "hosting-gratis",
    accessType: "hosting",
    provider: "Supabase",
    summary:
      "Database Postgres, autentikasi, dan storage dengan kuota gratis; proyek akan dijeda bila lama tidak aktif.",
    description:
      "Supabase Free memberi dua proyek gratis dengan batas database, bandwidth, dan storage. Proyek dapat dijeda otomatis setelah periode tidak aktif — perlu perhatian bila dipakai untuk produksi kecil. Upgrade ke Pro menghilangkan pause dan menambah kuota.",
    freeTier: "2 proyek gratis dengan kuota terbatas",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Supabase Pricing", url: "https://supabase.com/pricing" },
      { title: "Supabase Free Plan Limits", url: "https://supabase.com/docs/guides/platform/billing-on-supabase" },
    ],
  },
  {
    slug: "together-ai-free-tier",
    title: "Together AI — model open-weight dengan kredit awal",
    category: "free-api",
    accessType: "api",
    provider: "Together AI",
    summary:
      "Menjalankan model open-weight lewat API dengan kredit awal gratis untuk mencoba berbagai model.",
    description:
      "Together AI menyediakan endpoint kompatibel OpenAI untuk model open-weight (Llama, Qwen, Mixtral, dan lainnya). Akun baru biasanya mendapat kredit percobaan; setelah habis, penggunaan ditagihkan. Harga per token umumnya lebih rendah daripada model tertutup kelas atas.",
    freeTier: "Kredit percobaan untuk akun baru (periode terbatas)",
    freeTierAvailable: true,
    requiresCard: true,
    contextWindow: null,
    sources: [
      { title: "Together AI Pricing", url: "https://www.together.ai/pricing" },
    ],
  },
  {
    slug: "cerebras-inference-free-tier",
    title: "Cerebras Inference — free tier kecepatan tinggi",
    category: "free-api",
    accessType: "api",
    provider: "Cerebras",
    summary:
      "Inferensi model open-weight pada perangkat wafer-scale dengan tier gratis berbatas permintaan harian.",
    description:
      "Cerebras menyediakan API kompatibel OpenAI dengan fokus kecepatan token tinggi. Tier gratis dibatasi jumlah permintaan/token per hari. Periksa halaman resmi untuk katalog model dan batas terbaru.",
    freeTier: "Batas permintaan harian gratis",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    sources: [
      { title: "Cerebras Inference Pricing", url: "https://www.cerebras.ai/pricing" },
      { title: "Cerebras Docs", url: "https://inference-docs.cerebras.ai/" },
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
  // "lokal" (Ollama/LM Studio) paling tepat ke model open-weight.
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
    context_window: entry.contextWindow,
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
  `selesai — ditambah: ${inserted}, diperbarui: ${updated}, gagal: ${failed}, total entri: ${ENTRIES.length}`,
);
