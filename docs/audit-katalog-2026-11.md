# Audit Katalog AksesAI — 6 November 2026

Metode: setiap klaim kuota/harga dibandingkan dengan halaman resmi provider pada
tanggal audit. Tautan diperiksa otomatis lewat `scripts/audit-sources.mjs`
(34 URL, 33 OK, 1 bermasalah).

Kesimpulan singkat: **dari 17 entri, 5 masih akurat, 9 perlu dikoreksi, dan 3
klaim gratisnya sudah tidak berlaku.**

---

## 1. Entri yang klaimnya SALAH (perlu koreksi mendesak)

### Groq — model yang dicantumkan sudah tidak ada

| Klaim lama | Fakta (console.groq.com/docs/rate-limits) |
|---|---|
| "~14.400 req/hari untuk model kecil (Llama 8B)" | Llama 3.1 8B **tidak ada lagi** di tabel free |
| "Model besar (70B+) punya batas lebih ketat" | Llama 3.3 70B **tidak ada lagi** di tabel free |
| "~500 ribu token/hari" | 200K TPD untuk model teks utama |

Tabel free plan Groq hari ini (per 6 Nov 2026):

| Model | RPM | RPD | TPM | TPD |
|---|---|---|---|---|
| `openai/gpt-oss-120b` | 30 | 1.000 | 8K | 200K |
| `openai/gpt-oss-20b` | 30 | 1.000 | 8K | 200K |
| `openai/gpt-oss-safeguard-20b` | 3 | 1.000 | 2K | 200K |
| `qwen/qwen3.8-27b` | 30 | 1.000 | 8K | 200K |
| `meta-llama/llama-prompt-guard-2-22m` | 30 | 14.400 | 15K | 500K |
| `meta-llama/llama-prompt-guard-2-86m` | 30 | 14.400 | 15K | 500K |
| `whisper-large-v3` | 20 | 2.000 | — | — (audio) |
| `whisper-large-v3-turbo` | 20 | 2.000 | — | — (audio) |

Catatan: TPD untuk model `llama-prompt-guard` memang 500K, tetapi itu model
*classifier* keamanan — bukan model chat. Angka 500K di katalog lama tampaknya
berasal dari situ.

### Cerebras — `requiresCard` salah

| Klaim lama | Fakta |
|---|---|
| "kredit $5 tanpa kartu kredit" | **"New accounts receive $5 in free credits after adding a verified payment method"** |
| "model seperti Llama 4 Scout, Qwen3, gpt-oss-120b" | Free Trial hanya `gpt-oss-120b` dan `qwen-3.8-27b` |

Kutipan langsung dari FAQ resmi: *"API and Playground access remain inactive
until you do"* (sampai metode pembayaran ditambahkan). Ini kebalikan total dari
klaim katalog — pengguna bisa mendaftar, lalu menemukan dirinya tidak bisa
memakai apa pun.

Juga dikonfirmasi: *"Is there a permanently free tier? **No.**"* — jadi
`freeTierAvailable: true` menyesatkan.

### ZCode (z.ai) — kuota turun dari 8 juta ke 5 juta token/hari

| Klaim lama | Fakta (zcode.z.ai/en/docs/welcome) |
|---|---|
| 8 juta token/hari | **5 juta token/hari** |
| 3M GLM-5.3 + 5M GLM-5.3-Flash | **3M GLM-5.3 + 2M GLM-5-turbo** |

Teks resmi: *"the daily quotas below are granted only during these 5 days —
they expire afterwards and are not an ongoing daily allowance."* Durasi trial
5 hari tetap benar.

### Mistral — tier Experiment gratis untuk API tidak ada lagi

Kutipan dari docs.mistral.ai/admin/billing-usage/usage-limits:

> **Free mode** includes a monthly usage budget for trying Vibe and Studio.
> **It doesn't include API access.** Creating API keys and using the API require
> billing activation and pay-as-you-go.

Klaim "tier Experiment gratis ~2.000 req/hari" sudah tidak berlaku untuk API.
Free mode yang tersisa adalah untuk produk Vibe/Studio (chat), bukan API key.

### Hugging Face Inference Providers — pengguna gratis tidak dapat kredit

| Klaim lama | Fakta (huggingface.co/docs/inference-providers/en/pricing) |
|---|---|
| Ada kredit bulanan gratis | **Free Users: "None"** |
| — | PRO $2,00/bulan; Team/Enterprise $2,00 per seat |

Kutipan tabel resmi: baris *Free Users* pada kolom *Monthly Credits* berisi
**None**, dan *"credits purchase required"* untuk pay-as-you-go. Jadi entri
`huggingface-inference-payg` (kategori murah-hemat) tetap valid sebagai
"tanpa markup", tetapi **bukan** jalur gratis. Klaim gratisnya harus dihapus.

### Google AI Studio — klaim "ditarik Oktober 2026" tidak berdasar

Halaman resmi `aistudio.google.com/docs/pricing` hari ini masih menandai
**Free of charge** untuk input dan output:

| Model | Free Tier |
|---|---|
| Gemini 3.8 Flash | Free of charge |
| Gemini 3.6 Flash | Free of charge |
| Gemini 3.5 Flash-Lite | Free of charge |
| Gemini 3.1 Flash-Lite | Free of charge |
| Gemini 3.8 Live | Free of charge |
| Gemini 3.5 Transcribe | Free of charge |
| Gemini 4 Argon | **Not available** |
| Gemini 3.1 Pro Preview | **Not available** |

Jadi yang benar: model **Pro dan flagship** tidak tersedia di free tier,
tetapi **Flash dan Flash-Lite tetap gratis**. Klaim "sejak 9 Oktober 2026
Flash ditarik dari free tier" tidak bisa saya konfirmasi dan bertentangan
dengan halaman harga resmi. Angka "250 req/hari" dan "5.000 req/bulan" juga
tidak muncul di halaman rate limit resmi — halaman itu justru mengarahkan ke
console karena limit bergantung pada tier proyek.

**Perubahan penting:** free tier Gemini memakai data untuk meningkatkan produk
(*"Content used to improve our products"*). Ini harus disebut eksplisit.

### Token Harbor — angka 60/1.800 req per menit/jam tidak ada di katalog lama

Dari FAQ resmi: free account dibatasi **60 req/menit dan 1.800 req/jam** per
akun, **100 req/menit dan 3.000 req/jam** per IP, plus 10/150 untuk image
generation. Alokasi gratis berbasis **nilai**, bukan jumlah request, dan
di-reset per 7 hari bergulir — klaim lama ini sudah benar. Model gratis hari
ini: DeepSeek V4.1 Flash, MiMo V2.6 Flash, TH-Rudder. Claude Haiku 5.5
**sudah berakhir** kampanyenya.

### OpenCode — kampanye masih ada, tetapi batasnya perlu disebut

Free tier DeepSeek V4.1 Flash **masih berjalan** (belum ada pengumuman
berakhir), tetapi tiga batasan belum tercantum di katalog:

1. **Hanya di dalam aplikasi OpenCode.** Request dari client luar ditolak
   HTTP 403 `FreeTierError`.
2. **Konteks 200K**, bukan 1 juta seperti versi berbayar. Output maks 32K.
3. Model ID-nya `opencode/deepseek-v4.1-flash-free`.

Katalog lama menulis `contextWindow: 1000000` untuk entri ini — itu angka
versi berbayar, bukan versi gratis.

### LM Studio — URL sumber rusak

`https://lmstudio.ai/docs` mengembalikan 307. Halaman yang benar:
`https://lmstudio.ai/docs/app/basics`.

### Groq — URL harga tidak menuju halaman harga

`https://groq.com/pricing/` mengarah ke `https://groq.com/` (halaman depan).
Sumber ini tidak membuktikan apa pun; diganti dengan
`https://console.groq.com/docs/rate-limits` yang sudah jadi sumber pertama.

---

## 2. Entri yang klaimnya MASIH AKURAT

| Entri | Diverifikasi terhadap |
|---|---|
| **OpenRouter** | 20 RPM / 50 RPD tanpa kredit; 1.000 RPD setelah ≥10 kredit. Sesuai. |
| **DeepSeek API** | $0,15 input off-peak, $0,60 output off-peak, cache-hit $0,003. Konteks 1M, output maks 384K. Sesuai persis. |
| **Cloudflare Workers AI** | 10.000 Neuron/hari, reset 00:00 UTC, $0,011/1.000 Neuron. Sesuai. Model frontier (kimi-k2.6, glm-5.2, glm-5.3, deepseek-v4-pro) memang butuh plan berbayar — klaim lama benar. |
| **Supabase / Vercel / HF Spaces / Ollama** | Halaman hidup; klaim bersifat kualitatif dan tidak bertentangan dengan sumber. |

---

## 3. Provider BARU yang ditambahkan

Semua diverifikasi ke halaman resmi pada 6 November 2026.

### Z.AI (Zhipu, Tiongkok) — model Flash gratis permanen

`docs.z.ai/guides/overview/pricing` menandai **Free** untuk input, cached
input, dan output:

| Model | Harga |
|---|---|
| `GLM-4.7-Flash` | Free (semua kolom) |
| `GLM-4.5-Flash` | Free (semua kolom) |
| `GLM-4.6V-Flash` (vision) | Free (semua kolom) |

GLM-5.x **tidak** gratis (GLM-5.3-Flash $0,15/$0,50). Ini penting: pengguna
sering mengira seluruh keluarga GLM gratis. Halaman harga tidak mempublikasikan
RPM/TPM untuk model gratis — console yang otoritatif.

### Cohere (Kanada) — trial key tanpa biaya

`docs.cohere.com/docs/rate-limits`: **20 req/menit** per model chat, dan
**1.000 API calls/bulan** untuk trial key. Model yang tercakup: Command A+,
Command A Reasoning, Command A Translate, Command A Vision, Command A,
Command R+, Command R, Command R7B, North Mini Code. Trial key *"free but
limited in usage"* dan tidak dilisensikan untuk produksi.

Catatan jujur: Cohere mendefinisikan ini sebagai kunci evaluasi, bukan
"free tier" permanen dengan kuota yang dijamin.

### SambaNova (AS) — Free Tier tanpa kartu

`docs.sambanova.ai/docs/en/models/rate-limits`: Free Tier berlaku bila **tidak
ada** metode pembayaran terhubung — kebalikan dari Cerebras.

| Model | RPM | RPD | TPD |
|---|---|---|---|
| `DeepSeek-V3.1` | 20 | 20 | 200.000 |
| `Meta-Llama-3.3-70B-Instruct` | 20 | 20 | 200.000 |
| `gpt-oss-120b` | 20 | 20 | 200.000 |

Batas 20 request/hari sangat ketat — satu menit sibuk bisa menghabiskan
jatah sehari. Harus disebut terang-terangan.

**Catatan kejujuran:** halaman `cloud.sambanova.ai/plans` menyebut *"Add a
payment method and purchase credits to run your first requests"*. Dua halaman
resmi mereka saling bertentangan soal apakah signup tanpa kartu benar-benar
bisa melakukan request pertama. Saya menandai ini sebagai **tidak pasti**,
bukan mengklaim salah satunya sebagai fakta.

### SiliconFlow (Tiongkok) — model tertentu berharga nol

`docs.siliconflow.com/en/userguide/rate-limits/rate-limit-and-upgradation`:
*"The Rate Limits for free models are fixed, while paid models have different
Rate Limit metrics based on account usage tiers."* Verifikasi identitas
diperlukan untuk memakai semua model gratis. Tier L0 (akun baru):
RPM 1.000, TPM 40.000. `DeepSeek-R1` dan `DeepSeek-V3` punya batas tambahan
30 req/jam, plus 100 req/hari bagi yang belum verifikasi identitas.

Model gratis adalah himpunan yang berputar; harga nol hanya berlaku selama
halaman harga masih menandainya `免费`. Saya tidak mencantumkan daftar model
spesifik sebagai janji, karena daftar itu bergerak.

### Yang TIDAK saya tambahkan (dan alasannya)

| Provider | Alasan tidak ditambahkan |
|---|---|
| **Moonshot (Kimi)** | Tidak ada free tier. Docs: *"a minimum recharge of $1 is required to start using the API"*. Menambahkannya sebagai "gratis" akan menyesatkan. |
| **Together AI** | Tidak ada alokasi gratis tetap yang terdokumentasi; limit dinamis per model. |
| **Fireworks AI** | Hanya 10 RPM tanpa kredit — bukan alokasi gratis, sekadar throttle. |
| **GitHub Models** | **Pensiun 30 Juli 2026.** Playground, katalog, dan inference API ditutup. |
| **NVIDIA NIM** | Kredit trial, bukan free tier berulang; batas tidak dipublikasikan. |
| **Alibaba Model Studio (Qwen)** | Kuota gratis hanya di region Beijing dan berlaku 90 hari — bukan free tier berulang, dan tidak bisa dipakai dari luar Tiongkok tanpa akun lokal. |
| **Azure AI Foundry / AWS Bedrock** | Kredit trial sekali pakai; tidak dipublikasikan sebagai kuota gratis. |
| **Replicate / Novita / Nebius / Modal** | Tidak ada model berharga nol atau alokasi gratis tetap yang terdokumentasi saat audit. |
| **Pollinations** | Memang gratis tanpa akun, tetapi 4 req/menit dan bukan provider model frontier; nilai informasinya rendah untuk katalog ini. |

---

## 4. Kesalahan sistematis yang ditemukan

Empat entri (Cerebras, Mistral, HF Inference, Google) punya **klaim gratis
yang tidak lagi berlaku**. Ini bukan salah ketik — polanya adalah: kuota
gratis dicabut atau dipersempit, katalog tidak ikut diperbarui.

Karena itu `freeTierAvailable` tidak boleh lagi diisi `true` dengan asumsi.
Setiap entri yang kuotanya berubah diberi catatan eksplisit tentang apa yang
diverifikasi dan kapan.

Dua entri (Cerebras, SambaNova) juga memperlihatkan bahwa **arah persyaratan
kartu berbeda-beda**: Cerebras mewajibkan kartu, SambaNova justru mensyaratkan
tidak ada kartu. Kolom `requiresCard` harus dibaca per provider, bukan
diasumsikan.
