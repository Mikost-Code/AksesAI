#!/usr/bin/env node
/**
 * Pastikan TIDAK ada service_role key / literal sensitif di bundle KLIEN.
 *
 * Dipakai setelah `next build` (CI & lokal). Memeriksa seluruh berkas JS di
 * `.next/static` (yang diunduh browser) untuk:
 *  - nilai SUPABASE_SERVICE_ROLE_KEY (bila env tersedia)
 *  - literal "service_role" (indikasi kode server ikut terbundel)
 *  - literal "SUPABASE_SERVICE_ROLE_KEY"
 *
 * Keluar dengan kode 1 bila salah satu ditemukan.
 *
 * Catatan: nilai key dibaca dari env; di CI (tanpa secret) hanya literal yang
 * diperiksa, yang sudah cukup menangkap kesalahan struktur impor.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STATIC_DIR = ".next/static";

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (entry.endsWith(".js")) acc.push(full);
  }
  return acc;
}

const files = walk(STATIC_DIR);
if (files.length === 0) {
  console.error(`✗ Tidak ada berkas JS di ${STATIC_DIR}. Jalankan "next build" dulu.`);
  process.exit(1);
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const patterns = [
  { name: 'literal "service_role"', re: /service_role\b/ },
  { name: 'literal "SUPABASE_SERVICE_ROLE_KEY"', re: /SUPABASE_SERVICE_ROLE_KEY/ },
];
if (serviceKey && serviceKey.length >= 20) {
  patterns.push({ name: "nilai service_role key", re: new RegExp(serviceKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
}

const leaks = [];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const p of patterns) {
    if (p.re.test(content)) leaks.push(`${file} → ${p.name}`);
  }
}

if (leaks.length > 0) {
  console.error(`✗ BOCOR: pola sensitif ditemukan di bundle klien (${files.length} berkas diperiksa):`);
  for (const l of leaks) console.error(`   ${l}`);
  process.exit(1);
}

console.log(
  `✅ Bundle klien bersih: ${files.length} chunk diperiksa, tidak ada service_role key/literal.`,
);
