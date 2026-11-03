#!/usr/bin/env node
/**
 * Secret scan sederhana sebelum publikasi.
 * Memindai file yang akan di-commit terhadap pola kunci rahasia umum.
 * Keluar dengan kode 1 bila menemukan kandidat → hentikan publikasi.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  { name: "Supabase service_role JWT", re: /eyJ[\w-]*\.[\w-]*\.[\w-]*/g, hint: "JWT panjang dapat berupa service_role", filter: (line) => line.includes("service_role") },
  { name: "Supabase anon/service key", re: /sb_(publishable|secret)_[\w-]+/g },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: "OpenAI/Anthropic key", re: /\b(sk-[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9-]{20,})/g },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "Upstash token heuristic", re: /UPSTASH_REDIS_REST_TOKEN\s*=\s*[A-Za-z0-9_\-]{20,}/g },
  { name: "Turnstile secret literal", re: /TURNSTILE_SECRET_KEY\s*=\s*[A-Za-z0-9_-]{20,}/g },
  { name: "CRON_SECRET literal", re: /CRON_SECRET\s*=\s*[A-Za-z0-9_\-]{20,}/g },
  { name: "Private key block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const IGNORE = [/^\.env\.example$/, /^pnpm-lock\.yaml$/, /^node_modules\//, /^\.next\//, /^\.git\//];

let files = [];
try {
  files = execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
} catch {
  console.error("Bukan repositori Git. Jalankan `git init` lebih dulu.");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  if (IGNORE.some((re) => re.test(file))) continue;
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = content.split("\n");
  for (const { name, re, filter } of PATTERNS) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      re.lastIndex = 0;
      if (!re.test(line)) continue;
      if (filter && !filter(line)) continue;
      // Abaikan placeholder/pemakaian kode, bukan nilai rahasia.
      if (/process\.env|placeholder|contoh|example|your-|xxx|\.\.\./.test(line.toLowerCase())) continue;
      findings.push({ file, line: i + 1, name });
    }
  }
}

if (findings.length > 0) {
  console.error("❌ Potensi secret ditemukan:");
  for (const f of findings) {
    console.error(`  - ${f.name} di ${f.file}:${f.line}`);
  }
  console.error("\nHentikan publikasi. Revoke/rotasi kunci, bersihkan riwayat, ulangi.");
  process.exit(1);
}

console.log(`✅ Tidak ditemukan pola secret pada ${files.length} file yang terlacak.`);
