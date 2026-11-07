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
    category: "tool-ai-gratis",
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
    category: "tool-ai-gratis",
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
    category: "tool-ai-gratis",
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
      { title: "HF — Hardware & Pricing", url: "https://huggingface.co/pricing" },
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
    integrationNotes: "Base URL : http://localhost:11434/v1 (OpenAI-compatible, lokal)\nModel    : sesuai yang di-pull, mis. llama3.1, qwen2.5\n9Router/OpenCode: arahkan ke localhost — tidak butuh API key.",
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
    integrationNotes: "Base URL : http://localhost:1234/v1 (OpenAI-compatible, lokal)\nModel    : model GGUF yang dimuat di tab Developer/Server\n9Router/OpenCode: arahkan ke localhost — tidak butuh API key.",
    sources: [
      { title: "LM Studio", url: "https://lmstudio.ai/" },
      { title: "LM Studio — Docs: Get started", url: "https://lmstudio.ai/docs/app/basics" },
    ],
  },
  {
    slug: "huggingface-inference-payg",
    title: "Hugging Face Inference Providers — pay-as-you-go tanpa markup",
    category: "murah-hemat",
    accessType: "api",
    provider: "Hugging Face",
    summary:
      "Akses ratusan model open-weight lewat satu akun HF dengan tarif pay-as-you-go mengikuti rate provider (tanpa markup). KOREKSI: akun gratis TIDAK mendapat kredit bulanan sama sekali.",
    description:
      "Inference Providers meneruskan permintaan ke provider inferensi pihak ketiga dengan tarif sama seperti rate resmi provider (tanpa markup HF). KOREKSI PENTING: tabel resmi HF mencantumkan 'Monthly Credits: None' untuk Free Users — pengguna gratis harus membeli kredit lebih dulu. Klaim lama di katalog ini tentang kredit gratis $0,10/bulan sudah tidak berlaku. Yang tersedia: PRO $2,00 kredit/bulan (langganan $9/bulan), dan Team/Enterprise $2,00 per seat. Kredit itu bersifat umum — bisa dipakai untuk Inference Providers, Inference Endpoints, upgrade hardware Spaces, dan Jobs. Jalur 'Custom Provider Key' tidak memakai kredit HF, tetapi ditagih langsung oleh provider. Entri ini tetap berguna sebagai acuan harga bila Anda memang sudah berlangganan PRO atau butuh akses ke ratusan model dari satu API.",
    freeTier: "Tidak ada kredit untuk akun gratis; PRO $2 kredit/bulan (langganan $9/bulan)",
    freeTierAvailable: false,
    requiresCard: false,
    contextWindow: null,
    integrationNotes: "Base URL : https://router.huggingface.co/v1 (OpenAI-compatible)\nModel    : ID repo HF, mis. deepseek-ai/DeepSeek-V4.1-Flash\nAuth     : HF token (Bearer). Router meneruskan ke provider partner.",
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
    integrationNotes: "Base URL : https://openrouter.ai/api/v1 (OpenAI-compatible)\nModel    : ID berakhiran :free — daftar di openrouter.ai/models?max_price=0\n9Router/OpenCode: tambah provider custom → Base URL + API key OpenRouter.",
    sources: [
      { title: "OpenRouter — API Rate Limits", url: "https://openrouter.ai/docs/api_reference/limits" },
      { title: "OpenRouter — Model gratis", url: "https://openrouter.ai/models?max_price=0" },
    ],
  },
  {
    slug: "groq-api-free-tier",
    title: "Groq — inferensi cepat dengan free tier (gpt-oss & Qwen3.8)",
    category: "free-api",
    accessType: "api",
    provider: "Groq",
    summary:
      "API LPU berkecepatan tinggi tanpa kartu kredit. Free plan (6 Nov 2026): 30 req/menit, 1.000 req/hari, 8K token/menit, 200K token/hari untuk gpt-oss-120b/20b dan qwen3.8-27b.",
    description:
      "Groq menyediakan endpoint kompatibel OpenAI dengan kecepatan token tinggi. Free plan tanpa kartu kredit, dihitung per model untuk seluruh organisasi (bukan per pengguna atau per API key). Model teks yang tersedia di tabel gratis resmi saat ini adalah openai/gpt-oss-120b, openai/gpt-oss-20b, openai/gpt-oss-safeguard-20b, dan qwen/qwen3.8-27b — semuanya 30 RPM, 1.000 RPD, 8K TPM, 200K TPD (gpt-oss-safeguard lebih ketat: 3 RPM, 2K TPM). PENTING — Llama 3.1 8B dan Llama 3.3 70B yang dulu tercantum di tabel gratis SUDAH TIDAK ADA lagi; katalog lama yang menjanjikan '14.400 req/hari untuk model kecil' tidak lagi berlaku. Token yang kena cache tidak dihitung terhadap batas. Angka batas bisa berubah kapan saja; console.groq.com/settings/limits adalah sumber otoritatif untuk akun Anda. Melampaui batas mengembalikan HTTP 429.",
    freeTier:
      "30 req/menit, 1.000 req/hari, 8K token/menit, 200K token/hari (gpt-oss-120b, gpt-oss-20b, qwen3.8-27b)",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 30,
    contextWindow: null,
    integrationNotes: "Base URL : https://api.groq.com/openai/v1 (OpenAI-compatible)\nModel    : llama-3.1-8b-instant, llama-3.3-70b-versatile, dll.\n9Router/OpenCode: tambah provider custom → Base URL + API key Groq.",
    sources: [
      { title: "Groq — Rate Limits (tabel Free Plan)", url: "https://console.groq.com/docs/rate-limits" },
      { title: "Groq — Models", url: "https://console.groq.com/docs/models" },
    ],
  },
  {
    slug: "google-ai-studio-gemini-free-tier",
    title: "Google AI Studio — free tier Gemini (Flash & Flash-Lite)",
    category: "free-tier-model",
    accessType: "api",
    provider: "Google",
    summary:
      "Free tier tetap ada untuk keluarga Flash dan Flash-Lite (input & output gratis); model Pro dan flagship seperti Gemini 4 Argon TIDAK tersedia di free tier.",
    description:
      "Google AI Studio menyediakan akses Gemini API dengan tier gratis tanpa kartu kredit. Per 6 November 2026, halaman harga resmi menandai 'Free of charge' untuk input dan output pada Gemini 3.8 Flash, Gemini 3.6 Flash, Gemini 3.5 Flash-Lite, Gemini 3.1 Flash-Lite, Gemini 3.8 Live, serta model Transcribe/Translate — sedangkan Gemini 4 Argon dan Gemini 3.1 Pro Preview ditandai 'Not available' di kolom Free Tier. BATASAN YANG PERLU DIKETAHUI: (1) Google tidak lagi mempublikasikan angka RPM/RPD tetap di halaman dokumentasi — batas bergantung pada tier proyek dan harus dilihat di aistudio.google.com/rate-limit; katalog ini karena itu tidak mencantumkan angka req/hari yang tidak terbukti. (2) Pada tier gratis, input dan output DIPAKAI untuk meningkatkan produk Google ('Content used to improve our products'), berbeda dengan tier berbayar. (3) Batas RPD di-reset tengah malam waktu Pasifik. Untuk produksi gunakan tier berbayar.",
    freeTier: "Flash & Flash-Lite: input/output gratis (limit per proyek, cek AI Studio)",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    integrationNotes: "Base URL : https://generativelanguage.googleapis.com/v1beta/openai/\nModel    : varian Flash-Lite untuk free tier (mis. gemini-2.5-flash-lite)\nCatatan  : auth pakai Bearer API key Gemini (bukan ?key=)\n9Router/OpenCode: tambah provider custom OpenAI-compatible.",
    sources: [
      { title: "Gemini API — Pricing (kolom Free Tier)", url: "https://aistudio.google.com/docs/pricing" },
      { title: "Gemini API — Rate Limits", url: "https://aistudio.google.com/docs/rate-limits" },
    ],
  },
  {
    slug: "cerebras-free-trial",
    title: "Cerebras Inference — Free Trial $5 (WAJIB kartu kredit)",
    category: "free-api",
    accessType: "api",
    provider: "Cerebras",
    summary:
      "Inferensi ultra-cepat. Free Trial memberi kredit $5, tetapi WAJIB menambahkan metode pembayaran — tanpa kartu, API dan Playground tidak aktif. Kredit kedaluwarsa 30 hari. Tidak ada free tier permanen.",
    description:
      "Cerebras menyediakan API kompatibel OpenAI dengan fokus kecepatan ekstrem. PERHATIAN — arah persyaratannya mudah salah dibaca: Free Trial TIDAK berjalan tanpa kartu. FAQ resmi menyatakan 'New accounts receive $5 in free credits after adding a verified payment method', dan 'If you skip adding a payment method at sign-up, Playground and API access remain inactive until you do.' Kredit $5 itu juga kedaluwarsa 30 hari sejak diberikan. Cerebras menyatakan terang-terangan bahwa TIDAK ada tier gratis permanen: 'Cerebras doesn't currently offer a no-cost tier that renews automatically or a per-model always-free allowance.' Model yang tercakup di Free Trial (Shared Inference) per 6 Nov 2026: gpt-oss-120b dan qwen-3.8-27b, keduanya 5 RPM, 30K uncached TPM, 90K total TPM, 1 juta token/jam, dan 1 juta token/hari. Setelah kredit habis, akses berhenti sampai Anda membeli kredit. Cocok bila Anda memang siap memasukkan kartu; kalau tidak, pilih provider lain di katalog ini.",
    freeTier: "Kredit $5 (kedaluwarsa 30 hari, WAJIB kartu); 5 RPM, 30K TPM per model",
    freeTierAvailable: false,
    requiresCard: true,
    rateLimit: 5,
    contextWindow: null,
    integrationNotes: "Base URL : https://api.cerebras.ai/v1 (OpenAI-compatible)\nModel    : llama-4-scout-17b-16e-instruct, gpt-oss-120b, dll.\n9Router/OpenCode: tambah provider custom → Base URL + API key Cerebras.",
    sources: [
      { title: "Cerebras — Rate Limits & FAQ Free Trial", url: "https://inference-docs.cerebras.ai/support/rate-limits" },
      { title: "Cerebras — Pricing", url: "https://www.cerebras.ai/pricing" },
    ],
  },
  {
    slug: "cloudflare-workers-ai-free-allocation",
    title: "Cloudflare Workers AI — 10.000 neuron gratis per hari",
    category: "free-api",
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
    integrationNotes: "Base URL : https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1\nModel    : @cf/meta/llama-3.1-8b-instruct, dll. (ID bertanda @cf/)\nAuth     : Cloudflare API token; ACCOUNT_ID ada di dashboard Workers AI.",
    sources: [
      { title: "Cloudflare Workers AI — Pricing", url: "https://developers.cloudflare.com/workers-ai/platform/pricing/" },
      { title: "Cloudflare Workers AI — Models", url: "https://developers.cloudflare.com/workers-ai/models/" },
    ],
  },
  {
    slug: "mistral-experiment-free-tier",
    title: "Mistral La Plateforme — tidak ada akses API gratis",
    category: "free-tier-model",
    accessType: "api",
    provider: "Mistral AI",
    summary:
      "KOREKSI: tier 'Experiment' gratis untuk API sudah tidak ada. Mode gratis Mistral hanya untuk produk Vibe/Studio; membuat API key dan memakai API kini WAJIB mengaktifkan billing (pay-as-you-go).",
    description:
      "Entri ini sebelumnya menyatakan La Plateforme punya tier Experiment gratis sekitar 2.000 request/hari. Itu TIDAK LAGI BENAR. Dokumentasi resmi Mistral (docs.mistral.ai/admin/billing-usage/usage-limits) menyatakan: 'Free mode includes a monthly usage budget for trying Vibe and Studio. It doesn't include API access. Creating API keys and using the API require billing activation and pay-as-you-go.' Jadi anggaran gratis bulanan memang ada, tetapi hanya untuk produk jadi Mistral (Vibe dan Studio), bukan untuk API. Bagi developer yang butuh API, Mistral sekarang adalah provider berbayar murni. Dua jalan yang tetap tanpa biaya: (1) pakai Vibe/Studio lewat antarmuka mereka dalam batas anggaran gratis bulanan, atau (2) jalankan bobot open-weight Mistral sendiri lewat Ollama/LM Studio tanpa biaya per token. CATATAN PRIVASI: mode gratis tetap memakai data untuk pelatihan secara bawaan — nonaktifkan lewat pengaturan data bila ingin opt-out.",
    freeTier: "Tidak ada untuk API; anggaran gratis hanya di produk Vibe/Studio",
    freeTierAvailable: false,
    requiresCard: true,
    contextWindow: null,
    integrationNotes: "Base URL : https://api.mistral.ai/v1 (OpenAI-compatible)\nModel    : mistral-large-latest, mistral-small-latest, open-mistral-nemo\nCatatan  : nonaktifkan opt-in pelatihan data di pengaturan privacy.",
    sources: [
      { title: "Mistral — Usage limits (Free mode tanpa akses API)", url: "https://docs.mistral.ai/admin/billing-usage/usage-limits" },
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
      "CLI coding terminal. DeepSeek V4.1 Flash (ID `opencode/deepseek-v4.1-flash-free`) gratis selama kampanye — TANPA akun dan tanpa API key, tetapi HANYA bisa dipakai dari dalam aplikasi OpenCode.",
    description:
      "OpenCode adalah coding agent open-source yang berjalan di terminal, sebagai aplikasi desktop, atau ekstensi IDE. Sejak 15 Oktober 2026 model DeepSeek V4.1 Flash digratiskan lewat OpenCode Zen dengan model ID `opencode/deepseek-v4.1-flash-free`. TIGA BATASAN YANG PERLU DIKETAHUI SEBELUM MENCOBA: (1) Hanya dari dalam OpenCode. Memanggil endpoint mereka dari client lain — curl, skrip sendiri, Cursor, Claude Code, atau router pihak ketiga — ditolak dengan HTTP 403 berkode FreeTierError. (2) Konteksnya 200.000 token dengan output maksimum 32.000, bukan 1 juta token seperti versi berbayar; sesi di monorepo besar akan lebih cepat mentok. (3) Gratisnya untuk waktu terbatas dan tanggal berakhirnya TIDAK PERNAH diumumkan. Presedennya: model gratis sebelumnya (`deepseek-v4-flash-free`) dicabut dari daftar pilihan pada 21 Agustus 2026 tanpa pemberitahuan awal. Karena itu simpan nama model di `opencode.json`, bukan di dalam skrip, supaya beralih ke model berbayar cukup satu baris. Bila kampanye berakhir, tarif DeepSeek V4.1 Flash di Zen adalah $0,30 input / $1,20 output per juta token. Jalur ini juga menyertakan model gratis lain seperti GLM-5.3-Flash Free dan MiMo-V2.6-Flash Free. Kebijakan data mengikuti provider dan bersifat zero-retention untuk model DeepSeek.",
    freeTier: "DeepSeek V4.1 Flash gratis di dalam OpenCode (200K konteks, tanpa akun)",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: 200000,
    requirements:
      "1) Pasang OpenCode: `curl -fsSL https://opencode.ai/install | bash`, atau `npm install -g opencode-ai`. 2) Jalankan `opencode` di folder proyek. 3) Ketik `/models`, pilih DeepSeek V4.1 Flash Free dari provider OpenCode. 4) Opsional, jadikan bawaan lewat `opencode.json`: { \"$schema\": \"https://opencode.ai/config.json\", \"model\": \"opencode/deepseek-v4.1-flash-free\" }. Tidak perlu login atau API key untuk model gratis ini.",
    integrationNotes: "OpenCode adalah klien, bukan API: unduh CLI → login → pilih model\nDeepSeek V4.1 Flash di dalam aplikasi (gratis selama kampanye).\nTidak perlu Base URL tambahan.",
    sources: [
      { title: "OpenCode — Docs", url: "https://opencode.ai/docs" },
      { title: "OpenCode — Console & model", url: "https://opencode.ai/v2/docs/console/" },
    ],
  },
  {
    slug: "tokenharbor-free-tier",
    title: "Token Harbor — free tier $0 dengan reset 7 hari",
    category: "free-api",
    accessType: "api",
    provider: "Token Harbor",
    summary:
      "Agregator API dengan tier gratis $0/bulan: alokasi berbasis NILAI yang di-reset per 7 hari bergulir, dibatasi 60 req/menit dan 1.800 req/jam per akun. Model gratis: DeepSeek V4.1 Flash, MiMo V2.6 Flash, TH-Rudder.",
    description:
      "Token Harbor menyatukan banyak provider (Anthropic, OpenAI, Gemini, Zhipu, Kimi, DeepSeek, Qwen) dalam satu API kompatibel OpenAI. Free tier $0/bulan memberi alokasi gratis yang di-reset pada periode 7 hari bergulir yang dihitung dari request gratis pertama Anda, dan model gratisnya (ID berakhiran `:free`) harus diaktifkan manual di dashboard. Tiga model yang aktif di jalur gratis per 6 November 2026: DeepSeek V4.1 Flash (konteks ~1,05 juta), MiMo V2.6 Flash (teks/gambar/audio/video, ~1,05 juta), dan TH-Rudder (routing otomatis). Claude Haiku 5.5 `:free` sudah BERAKHIR kampanyenya. BATAS API akun gratis: 60 request/menit dan 1.800 request/jam per akun (dibagi semua API key dan semua model), serta 100 req/menit dan 3.000 req/jam per alamat IP. Tidak ada batas per-menit tambahan khusus untuk model gratis. Alokasi diukur sebagai NILAI dolar, bukan jumlah request, sehingga model mahal menghabiskan jatah lebih cepat. PERHATIAN PRIVASI: pada jalur gratis, prompt dan respons dapat disimpan untuk diagnostik, keamanan, optimasi, dan peningkatan produk; staf Token Harbor dapat membaca percakapan jalur gratis dan memakai alat AI pihak ketiga untuk menganalisisnya, dan provider yang melayani model gratis dapat memakainya sesuai ketentuan mereka, termasuk untuk melatih model. Membeli Pass TIDAK otomatis menyalakan jalur gratis maupun dianggap sebagai persetujuan. Jangan kirim data sensitif lewat jalur gratis. Paket berbayar mulai $0,99 bulan pertama lalu $1,99/bulan (Agent Pass).",
    freeTier: "Alokasi gratis $0 (basis nilai), reset 7 hari bergulir; 60 req/menit & 1.800 req/jam per akun",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 60,
    contextWindow: null,
    integrationNotes: "Base URL : https://tokenharbor.ai/v1 (OpenAI-compatible)\nModel    : lihat katalog di dashboard (GPT, Claude, Gemini, DeepSeek, dll.)\n9Router/OpenCode: tambah provider custom → tempel Base URL + API key.\nMigrasi dari OpenRouter: cukup ganti base URL, format sama.",
    sources: [
      { title: "Token Harbor — Pricing (Free allowance & model gratis)", url: "https://tokenharbor.ai/pricing" },
      { title: "Token Harbor — FAQ (batas API & kebijakan data)", url: "https://tokenharbor.ai/faq" },
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
    integrationNotes: "Base URL : https://api.deepseek.com (OpenAI-compatible)\nhttps://api.deepseek.com/anthropic (protokol Anthropic)\nModel    : deepseek-chat\n9Router/OpenCode: tambah provider custom → Base URL + API key DeepSeek.",
    sources: [
      { title: "DeepSeek — Models & Pricing", url: "https://api-docs.deepseek.com/quick_start/pricing" },
      { title: "DeepSeek-V4.1-Flash di Hugging Face (MIT)", url: "https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash" },
    ],
  },
  {
    slug: "zcode-glm-free-trial",
    title:
      "ZCode (z.ai) — 300 juta token GLM-5.3-Flash harian, 500 juta saat Weekend Build",
    category: "tool-ai-gratis",
    accessType: "tool",
    provider: "Z.ai (Zhipu)",
    summary:
      "Global Build memberi 300 juta token GLM-5.3-Flash per hari (klaim mulai 18.00 WIB, pakai 22.00–08.00 WIB); Weekend Build menaikkan jatah menjadi 500 juta token untuk jendela Jumat–Senin. Trial 5 hari 5 juta token/hari tetap tersedia untuk pengguna baru.",
    description:
      "ZCode adalah Agentic Development Environment desktop dari z.ai yang dituning khusus untuk GLM-5.3 (konteks 1 juta token). Ada dua jalur gratis yang berbeda. PERTAMA, trial pengguna baru: 5 hari, total 5 juta token per hari — 3 juta GLM-5.3 ditambah 2 juta GLM-5-turbo — yang aktif otomatis setelah menghubungkan akun BigModel atau Z.ai. Dokumentasi resmi menegaskan kuota ini hanya berlaku selama 5 hari dan bukan jatah permanen. KEDUA, kampanye Global Build yang berjalan saat ini: setiap akun ZCode, termasuk akun gratis, dapat mengklaim 300 juta token GLM-5.3-Flash per hari. Klaim dibuka 11.00 UTC (18.00 WIB); token dapat dipakai 15.00–01.00 UTC (22.00–08.00 WIB) dengan memilih channel Global Building dan model GLM-5.3-Flash. Pada akhir pekan, Weekend Build memberi kuota lebih besar: putaran 6–9 November 2026 menyediakan 500 juta token GLM-5.3-Flash per akun, aktif Jumat 22.00 WIB sampai Senin 08.00 WIB (23.00 Jumat–09.00 Senin waktu Tiongkok). Besaran, jumlah paket, dan jendela waktu tiap putaran bisa berubah tanpa pengumuman jauh hari; kartu klaim di dalam aplikasi adalah acuan terakhir, dan token yang tidak terpakai hangus saat jendela berakhir. GLM-5.3-Flash tetap berbayar lewat API z.ai — kuota ini hanya berlaku di dalam klien ZCode. Setelah trial atau kampanye berakhir, lanjut dengan plan berbayar atau manfaatkan jam off-peak.",
    freeTier:
      "300 juta token GLM-5.3-Flash/hari (Global Build) + 500 juta saat Weekend Build; trial 5 hari 5 juta token/hari untuk pengguna baru",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: 1000000,
    requirements:
      "1) Unduh/update ZCode dari zcode.z.ai, lalu masuk dengan akun Z.ai atau BigModel (gratis, tanpa kartu kredit). 2) Trial 5 hari: hubungkan akun BigModel/Z.ai di pengaturan ZCode. 3) Global Build: klaim kartu harian di dalam aplikasi mulai 18.00 WIB, lalu pilih channel Global Building dan model GLM-5.3-Flash pada 22.00–08.00 WIB. 4) Weekend Build: klaim kartu akhir pekan saat jendelanya dibuka; sisa token hangus pada Senin 08.00 WIB.",
    integrationNotes: "ZCode adalah aplikasi desktop — koneksi dikelola aplikasi:\nunduh dari zcode.z.ai → hubungkan akun BigModel → model GLM-5.3\ndan GLM-5.3-Flash langsung tersedia (tanpa Base URL manual).",
    sources: [
      {
        title: "ZCode — Docs (welcome, trial & Global Build)",
        url: "https://zcode.z.ai/en/docs/welcome",
        type: "dokumentasi_resmi",
      },
      {
        title: "ZCode di X — 300 juta token GLM-5.3-Flash setiap hari",
        url: "https://x.com/zcode_ai/status/2114762939421139426",
        // Enum source_type_v2 tidak punya "media_sosial_resmi"; "lainnya"
        // adalah kategori yang jujur untuk akun sosial resmi.
        type: "lainnya",
      },
      {
        title: "AI Promo Now — Weekend Build 500 juta token (6–9 November 2026)",
        url: "https://www.aipromonow.com/en/promos/zcode-weekend-build-glm53-flash-5e8-nov9-2026",
        type: "media_tepercaya",
      },
      {
        title: "Z.ai — Plan Update Notice",
        url: "https://docs.z.ai/devpack/notice/usage-revision",
        type: "dokumentasi_resmi",
      },
    ],
  },
  {
    slug: "codebuddy-deepseek-v41-flash",
    title: "CodeBuddy (internasional) — DeepSeek V4.1 Flash gratis",
    category: "tool-ai-gratis",
    accessType: "tool",
    provider: "CodeBuddy (Tencent)",
    summary:
      "Aplikasi coding CodeBuddy versi internasional (codebuddy.ai) menyertakan model DeepSeek V4.1 Flash tanpa biaya; batas waktu kampanye tidak pernah diumumkan, jadi status gratisnya perlu dicek ulang.",
    description:
      "CodeBuddy adalah produk coding dari Tencent, satu keluarga dengan WorkBuddy dan memakai akun yang sama. Versi internasional (domain .ai) berisi katalog model yang sama dengan versi Tiongkok (.cn), termasuk DeepSeek V4.1 Flash selain GLM-5.x, Kimi-K2.x, MiniMax-M3, dan DeepSeek V4 Pro. Nominal gratisnya berbentuk kuota akun, bukan harga per token: pemakaian ditagih ke kuota paket yang terisi ulang pada siklus tertentu (harian, mingguan, atau bulanan) dan habis sampai jadwal isi ulang berikutnya. Model DeepSeek V4.1 Flash sendiri tidak muncul di daftar harga publik saat ini, jadi tidak ada angka rupiah yang bisa dijadikan patokan. PENTING — soal tanggal berakhir: kampanye WorkBuddy Intl pernah diumumkan 'gratis sampai 31 Oktober 2026' dan jendela itu sudah lewat, sementara sebagian pengguna melaporkan DeepSeek V4.1 Flash masih bisa dipakai harian sampai sekarang. Tidak ada pengumuman resmi yang memperpanjang atau mencabut kuota ini secara tertulis, jadi perlakukan label gratis sebagai sementara: cek kuota di aplikasi sebelum memindahkan alur kerja penting, dan anggap model ini bisa berbayar atau hilang kapan saja tanpa pemberitahuan. Untuk rute API bening tanpa kuota akun, lihat entri OpenCode dan DeepSeek API kami yang terpisah.",
    freeTier: "DeepSeek V4.1 Flash dipakai dari kuota akun CodeBuddy internasional (batas waktu tidak diumumkan)",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: 1000000,
    requirements:
      "1) Unduh aplikasi CodeBuddy versi internasional dari codebuddy.ai — pakai domain .ai, bukan .cn, karena akun dan kuotanya berbeda. 2) Daftar/masuk lewat OAuth (Google, GitHub, atau X). 3) Buka pemilih model dan pilih DeepSeek V4.1 Flash. Catatan: bila memakai 9router sebagai perantara, masuk lewat OAuth CodeBuddy di dashboard 9router (provider 'codebuddy-intl', alias cbai) lalu pakai model deepseek-v4.1-flash; gateway mereka menolak permintaan tanpa header percakapan dan membalas 400 kode 11128.",
    integrationNotes: "CodeBuddy adalah IDE/agent (bukan API): unduh dari codebuddy.ai → login →\nmodel DeepSeek V4.1 Flash tersedia di dalam IDE sesuai kampanye berjalan.",
    sources: [
      { title: "CodeBuddy — situs resmi (internasional)", url: "https://www.codebuddy.ai/" },
      { title: "9router — daftar provider codebuddy-intl (katalog model & OAuth)", url: "https://github.com/decolua/9router/blob/master/open-sse/providers/registry/codebuddy-intl.js" },
    ],
  },
  // ══ DITAMBAHKAN PADA AUDIT 6 NOVEMBER 2026 ════════════════════════════════
  // Empat provider berikut diverifikasi langsung ke halaman resmi masing-masing.
  // Pola yang sama: hanya model yang benar-benar bertanda harga $0 atau gratis
  // yang dimasukkan — bukan "murah", bukan "trial sekali pakai".
  {
    slug: "zai-glm-flash-gratis",
    title: "Z.AI (Zhipu) — GLM-4.7-Flash & GLM-4.5-Flash gratis permanen",
    category: "free-api",
    accessType: "api",
    provider: "Z.AI (Zhipu AI)",
    summary:
      "Z.AI mencantumkan harga $0 untuk input, cached input, dan output pada GLM-4.7-Flash, GLM-4.5-Flash, dan GLM-4.6V-Flash (vision). Ini gratis permanen, bukan trial — tetapi seluruh keluarga GLM-5.x tetap berbayar.",
    description:
      "Z.AI adalah platform API internasional Zhipu AI (Tiongkok), penyedia keluarga model GLM. Halaman harga resmi mereka menandai kolom Input, Cached Input, Cached Input Storage, dan Output sebagai 'Free' untuk tiga model: GLM-4.7-Flash dan GLM-4.5-Flash (teks) serta GLM-4.6V-Flash (vision). Ini bukan kampanye terbatas — model Flash memang jalur gratis permanen Z.AI. YANG PERLU DIPAHAMI: (1) Gratisnya hanya berlaku untuk seri Flash. GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX, GLM-5.2, GLM-5.1, GLM-5, GLM-4.7, dan GLM-4.6 semuanya berbayar — GLM-5.3-Flash misalnya $0,15 input / $0,50 output per juta token. Banyak orang salah mengira seluruh keluarga GLM gratis. (2) Z.AI TIDAK mempublikasikan angka RPM/TPM untuk model gratis di halaman harga; dokumentasi mereka menyebut batas konkurensi diatur platform per plan, dan console (z.ai) adalah sumber otoritatif. (3) Ada dua portal berbeda: z.ai (internasional, cukup email) dan open.bigmodel.cn (Tiongkok, butuh nomor telepon Tiongkok). Pendaftaran lewat z.ai jauh lebih praktis dari luar Tiongkok, dan akunnya terpisah. (4) API-nya kompatibel OpenAI di endpoint https://api.z.ai/api/paas/v4, jadi bisa langsung dipakai di SDK OpenAI maupun di OpenCode/9router. Cocok untuk chatbot, klasifikasi, ringkasan, dan ekstraksi dokumen — termasuk OCR/vision lewat GLM-4.6V-Flash.",
    freeTier: "$0 untuk input & output: GLM-4.7-Flash, GLM-4.5-Flash, GLM-4.6V-Flash",
    freeTierAvailable: true,
    requiresCard: false,
    contextWindow: null,
    requirements:
      "1) Daftar di z.ai (portal internasional — cukup email; jangan tertukar dengan open.bigmodel.cn yang butuh nomor telepon Tiongkok dan akunnya terpisah). 2) Buat API key di console. 3) Pakai salah satu model gratis: `glm-4.7-flash`, `glm-4.5-flash`, atau `glm-4.6v-flash`. 4) Endpoint kompatibel OpenAI: base URL https://api.z.ai/api/paas/v4. Cek harga di console sebelum pindah ke model GLM-5.x — semuanya berbayar.",
    integrationNotes: "Base URL : https://api.z.ai/api/paas/v4 (OpenAI-compatible)\nModel    : varian GLM Flash — cek katalog model di docs.z.ai\n9Router/OpenCode: tambah provider custom → Base URL + API key Z.ai.",
    sources: [
      { title: "Z.AI — Pricing (model Flash bertanda Free)", url: "https://docs.z.ai/guides/overview/pricing" },
      { title: "Z.AI — Rate limits", url: "https://docs.z.ai/api-reference/rate-limit" },
    ],
  },
  {
    slug: "cohere-trial-key-gratis",
    title: "Cohere — trial key gratis: 20 req/menit, 1.000 panggilan/bulan",
    category: "free-api",
    accessType: "api",
    provider: "Cohere",
    summary:
      "Trial key tanpa biaya untuk seluruh keluarga Command (A+, A Reasoning, A Translate, A Vision, A, R+, R, R7B) dan North Mini Code: 20 request/menit per model, total 1.000 API call per bulan.",
    description:
      "Cohere (Kanada) menyediakan dua jenis kunci API: trial key yang gratis tetapi dibatasi, dan production key yang berbayar. Trial key memberi 20 request/menit untuk setiap model chat, ditambah batas menyeluruh 1.000 panggilan API per bulan. Model yang tercakup: Command A+, Command A Reasoning, Command A Translate, Command A Vision, Command A, Command R+, Command R, Command R7B, dan North Mini Code. Endpoint lain punya batas sendiri — Embed 2.000 input/menit, Rerank 10 req/menit, Tokenize 100 req/menit, Audio Transcriptions 5 req/menit, Embed (Images) 5 input/menit. BEBERAPA HAL YANG SERING TERLEWAT: (1) Cohere sendiri menyebut ini kunci EVALUASI, bukan free tier dengan kuota yang dijamin — dokumentasi resminya menulis trial key 'free but limited in usage' dan tidak dilisensikan untuk produksi. (2) Kunci production pada model terbaru seperti Command A Reasoning bekerja seperti trial key (tetap 1.000 panggilan/bulan) sampai Anda menghubungi sales. (3) Rerank adalah keunggulan Cohere yang jarang dimiliki provider lain — 10 req/menit gratis di trial bisa dipakai untuk meningkatkan kualitas pencarian/RAG tanpa biaya. Cocok untuk eksperimen, prototipe, dan evaluasi RAG; jangan dipakai sebagai fondasi produk tanpa naik ke production key.",
    freeTier: "Trial key: 20 req/menit per model chat, total 1.000 API call/bulan",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 20,
    contextWindow: null,
    requirements:
      "1) Daftar di dashboard.cohere.com (tanpa kartu kredit). 2) Buka halaman API keys dan buat TRIAL key — bukan production key. 3) Pakai model seperti `command-a-03-2025`, `command-r-plus`, atau `command-r7b`. 4) Untuk RAG, endpoint Rerank hanya 10 req/menit di trial; tetap berguna untuk menguji kualitas sebelum berlangganan.",
    integrationNotes: "Base URL : https://api.cohere.com/compatibility/v1 (OpenAI-compatible)\nModel    : command-a-03-2025, command-r-plus-08-2024, dll.\nCatatan  : compatibility layer — sebagian parameter dipetakan ke format Cohere.",
    sources: [
      { title: "Cohere — API keys & rate limits (tabel Trial)", url: "https://docs.cohere.com/docs/rate-limits" },
      { title: "Cohere — Pricing", url: "https://docs.cohere.com/v2/docs/how-does-cohere-pricing-work" },
    ],
  },
  {
    slug: "sambanova-free-tier",
    title: "SambaNova Cloud — Free Tier tanpa kartu (20 req/hari)",
    category: "free-api",
    accessType: "api",
    provider: "SambaNova",
    summary:
      "Free Tier berlaku justru ketika TIDAK ada metode pembayaran terhubung. Model: DeepSeek-V3.1, Llama-3.3-70B, dan gpt-oss-120b — masing-masing 20 req/menit, 20 req/hari, 200 ribu token/hari.",
    description:
      "SambaNova Cloud menawarkan inferensi cepat untuk model open-weight dengan API kompatibel OpenAI. Kebalikan dari Cerebras, Free Tier SambaNova didefinisikan oleh KETIADAAN metode pembayaran: dokumentasi resmi menyatakan 'Free Tier: Applied when there is no payment method linked with your account'. Tiga model produksi yang tercakup, semuanya dengan angka identik: DeepSeek-V3.1, Meta-Llama-3.3-70B-Instruct, dan gpt-oss-120b — 20 request/menit, 20 request/hari, dan 200.000 token/hari. Ada juga dua model preview (DeepSeek-V3.2 dan gemma-4-31B-it) dengan batas sama, tetapi kapasitasnya terbatas dan bisa dicabut sewaktu-waktu. BATASAN YANG HARUS DISADARI: 20 request/menit dan 20 request/hari berarti satu menit sibuk bisa menghabiskan jatah seharian. Jangan pakai untuk agen yang melakukan polling atau banyak panggilan kecil — token harian 200 ribu akan terasa lega dibanding jatah request-nya, tetapi request-lah yang lebih dulu habis. Reset harian memakai jendela tetap, bukan 24 jam sejak request terakhir. CATATAN KEJUJURAN: halaman plans di cloud.sambanova.ai menyebut 'Add a payment method and purchase credits to run your first requests', yang bertentangan dengan halaman rate limit. Saya belum bisa memastikan mana yang berlaku saat ini; periksa halaman Limits di akun Anda setelah mendaftar sebelum menyusun rencana di atasnya.",
    freeTier: "20 req/menit, 20 req/hari, 200K token/hari per model (tanpa kartu)",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 20,
    contextWindow: null,
    requirements:
      "1) Daftar di cloud.sambanova.ai. 2) Buat API key. 3) Base URL kompatibel OpenAI: https://api.sambanova.ai/v1. 4) Pilih `DeepSeek-V3.1`, `Meta-Llama-3.3-70B-Instruct`, atau `gpt-oss-120b`. 5) Buka halaman Limits untuk memastikan tier Anda benar-benar Free (tanpa metode pembayaran).",
    integrationNotes: "Base URL : https://api.sambanova.ai/v1 (OpenAI-compatible)\nModel    : katalog model SambaNova di docs.sambanova.ai",
    sources: [
      { title: "SambaNova — Model rate limits (tabel Free Tier)", url: "https://docs.sambanova.ai/docs/en/models/rate-limits" },
      { title: "SambaNova — Plans", url: "https://cloud.sambanova.ai/plans" },
    ],
  },
  {
    slug: "siliconflow-free-models",
    title: "SiliconFlow — model gratis berharga nol (Qwen, GLM, Hunyuan)",
    category: "free-tier-model",
    accessType: "api",
    provider: "SiliconFlow (Tiongkok)",
    summary:
      "Platform inferensi Tiongkok yang mencantumkan sejumlah model berharga nol: GLM-4-9B, GLM-Z1-9B, Hunyuan-MT-7B (penerjemah), PaddleOCR-VL, dan beberapa model embedding/rerank. Batas model gratis bersifat tetap dan tidak naik walau Anda berbayar.",
    description:
      "SiliconFlow (juga dipasarkan sebagai SiliconCloud) adalah platform inferensi yang menyediakan model open-weight kelas produksi dengan API kompatibel OpenAI. Model yang harganya ditandai 免费 (gratis) dapat dipanggil tanpa biaya per token selama halaman harga resmi masih menandainya demikian. Dokumentasi rate limit menyatakan: 'The Rate Limits for free models are fixed, while paid models have different Rate Limit metrics based on account usage tiers' — artinya naik tier berbayar TIDAK menambah kuota model gratis. Akun baru mulai di tier L0: 1.000 RPM dan 40.000 TPM. YANG PERLU DIKETAHUI SEBELUM MENCOBA: (1) Verifikasi identitas (KYC) diperlukan untuk memakai semua model gratis. (2) Daftar model gratis BERPUTAR dan berubah cukup cepat — model bisa dicabut dari daftar gratis kapan saja (contoh: Nex-N2-Pro dan Qwen3.5-397B-A17B dihentikan, DeepSeek-V4-Flash beralih ke harga berbasis waktu). Jangan membangun arsitektur yang bergantung pada satu model gratis tertentu. (3) Katalog gratis hari ini didominasi model kecil dan model khusus (penerjemahan, OCR, embedding, ASR), BUKAN model frontier seperti DeepSeek V4-Pro atau Kimi K2.7 yang tetap berbayar. (4) Beberapa model punya dua ID: versi gratis tanpa prefiks dan versi berbayar berprefiks `Pro/` — memakai ID yang salah adalah penyebab umum orang mengira free tier-nya hilang. (5) Sayangnya, `DeepSeek-R1` dan `DeepSeek-V3` punya batas tambahan 30 req/jam untuk semua pengguna, dan 100 req/hari bagi yang belum verifikasi identitas. Nilai terbesar platform ini adalah model embedding (BAAI/bge-m3), rerank (bge-reranker-v2-m3), dan OCR — cocok untuk membangun pipeline RAG atau ekstraksi dokumen tanpa biaya.",
    freeTier: "Model bertanda 免费: GLM-4-9B, GLM-Z1-9B, Hunyuan-MT-7B, PaddleOCR-VL, bge-m3, bge-reranker-v2-m3, Kolors",
    freeTierAvailable: true,
    requiresCard: false,
    rateLimit: 1000,
    contextWindow: null,
    requirements:
      "1) Daftar di siliconflow.com (situs internasional) atau siliconflow.cn. 2) Selesaikan verifikasi identitas — tanpa ini semua model gratis terkunci. 3) Buat API key. 4) Base URL: https://api.siliconflow.com/v1. 5) Pilih model yang di halaman harga HARI INI masih bertanda gratis; periksa per model, bukan per platform. Untuk embedding/RAG, `BAAI/bge-m3` adalah pilihan paling stabil.",
    integrationNotes: "Base URL : https://api.siliconflow.com/v1 (global) atau .cn/v1 (China)\nModel    : katalog model SiliconFlow di docs.siliconflow.com\n9Router/OpenCode: tambah provider custom → Base URL + API key.",
    sources: [
      { title: "SiliconFlow — Rate limits (model gratis bersifat tetap)", url: "https://docs.siliconflow.com/en/userguide/rate-limits/rate-limit-and-upgradation" },
      { title: "SiliconFlow — FAQ rate limits", url: "https://docs.siliconflow.com/en/faqs/misc_rate" },
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
  // Kontribusi manual (lewat form) memiliki riwayat kontribusi — JANGAN
  // dihapus oleh sinkronisasi seed. Tabel history append-only juga akan
  // menolak cascade-nya, tapi lebih jelas menolak secara eksplisit di sini.
  const { data: hist } = await admin
    .from("contribution_history")
    .select("id")
    .eq("program_id", row.id)
    .limit(1);
  if (hist && hist.length > 0) {
    console.log(`  dipertahankan (kontribusi manual): ${row.slug}`);
    continue;
  }
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
    requirements: entry.requirements ?? null,
    integration_notes: entry.integrationNotes ?? null,
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
      source_type: s.type ?? "dokumentasi_resmi",
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
