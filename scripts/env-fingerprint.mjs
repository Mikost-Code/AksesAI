import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * Verifikasi penulisan env var produksi TANPA membocorkan nilai.
 *
 * Untuk setiap variabel, cetak sidik jari (fingerprint) yaitu 6 karakter
 * pertama + 4 karakter terakhir + panjang + hash pendek. Dengan begitu nilai
 * yang tersimpan di dashboard Vercel dapat dicocokkan dengan `.env.local`
 * maupun dengan nilai yang diharapkan, tanpa pernah menampilkan rahasianya.
 *
 * Jalankan: node scripts/env-fingerprint.mjs [file-env]
 */
const file = process.argv[2] ?? ".env.local";
const lines = readFileSync(file, "utf8").split(/\r?\n/);

const values = {};
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  values[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

function fingerprint(value) {
  if (!value) return "[KOSONG]";
  const head = value.slice(0, 6);
  const tail = value.slice(-4);
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return `${head}…${tail}  panjang=${String(value.length).padEnd(3)} hash=${hash}`;
}

for (const [key, value] of Object.entries(values)) {
  console.log(key.padEnd(32) + fingerprint(value));
}
