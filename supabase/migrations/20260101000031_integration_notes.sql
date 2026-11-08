-- =============================================================================
-- 0012 — Catatan integrasi (cara menghubungkan) untuk entri API
-- =============================================================================
-- Entri berupa produk API (LongCat, DeepSeek, OpenRouter, dll.) sering
-- butuh info koneksi: base URL, model ID, protokol (OpenAI/Anthropic-
-- compatible). Field ini OPSIONAL, diisi kontributor/reviewer, dan
-- dirender sebagai seksi "Cara menghubungkan" di halaman detail.
-- JANGAN pernah menyimpan API key asli di kolom ini.
-- =============================================================================

alter table public.assistance_programs
  add column if not exists integration_notes text;

-- Tanpa perubahan RLS: kolom mengikuti kebijakan tabel (publik baca via
-- select verified/expired, tulis via kontributor/RPC yang sudah ada).
