/**
 * Audit riwayat git untuk secret yang tidak boleh menjadi publik.
 *
 * Memeriksa SETIAP blob unik di seluruh riwayat (bukan hanya HEAD) dengan
 * pola berisiko tinggi: JWT Supabase asli, kunci service_role, PAT GitHub,
 * private key, dan token provider AI.
 *
 * Nilai yang cocok hanya dicetak sebagian (prefix) agar laporan ini tidak
 * ikut menyebarkan rahasia.
 *
 * Jalankan: node scripts/audit-git-secrets.mjs
 */
import { execSync } from "node:child_process";

function git(args) {
  return execSync(`git ${args}`, { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
}

// Pola yang menandakan rahasia NYATA (bukan nama variabel / dokumentasi).
const PATTERNS = [
  { name: "Supabase service_role JWT", re: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase secret key (baru)", re: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub PAT (classic)", re: /ghp_[A-Za-z0-9]{30,}/ },
  { name: "GitHub PAT (fine-grained)", re: /github_pat_[A-Za-z0-9_]{30,}/ },
  { name: "GitHub OAuth secret", re: /ghs_[A-Za-z0-9]{30,}/ },
  { name: "Private key PEM", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Token AI provider", re: /\b(sk-[A-Za-z0-9]{32,}|sk-ant-[A-Za-z0-9_-]{20,})/ },
  { name: "Upstash token", re: /\bAX[A-Za-z0-9]{30,}/ },
  { name: "Cloudflare Turnstile secret", re: /\b0x4AAAAAAA[A-Za-z0-9_-]{15,}/ },
];

const blobs = git("rev-list --objects --all")
  .split("\n")
  .map((l) => l.split(" ")[0])
  .filter(Boolean);

const seen = new Set();
const findings = [];

for (const blob of blobs) {
  if (seen.has(blob)) continue;
  seen.add(blob);

  let type;
  try {
    type = git(`cat-file -t ${blob}`).trim();
  } catch {
    continue;
  }
  if (type !== "blob") continue;

  let content;
  try {
    content = git(`cat-file -p ${blob}`);
  } catch {
    continue;
  }

  const path =
    git(`rev-list --objects --all`).split("\n").find((l) => l.startsWith(`${blob} `))?.slice(blob.length + 1) ??
    "(tanpa nama)";

  for (const { name, re } of PATTERNS) {
    const m = content.match(re);
    if (!m) continue;

    const value = m[0];

    // Kunci contoh bawaan Supabase CLI (`iss: supabase-demo`) bukan rahasia:
    // nilainya terdokumentasi publik dan hanya berlaku pada stack lokal.
    if (name.startsWith("Supabase")) {
      const payload = value.split(".")[1];
      if (payload) {
        try {
          const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
          if (typeof json.iss === "string" && json.iss === "supabase-demo") continue;
        } catch {
          // Bukan JWT valid → tetap laporkan (mungkin format lain).
        }
      }
    }

    findings.push({
      blob: blob.slice(0, 8),
      path,
      pattern: name,
      preview: `${value.slice(0, 6)}…(${value.length} karakter)`,
    });
  }
}

console.log(`blob unik diperiksa: ${seen.size}`);
if (findings.length === 0) {
  console.log("HASIL: BERSIH — tidak ada pola rahasia di riwayat git.");
  process.exit(0);
}

console.log(`HASIL: ${findings.length} TEMUAN`);
for (const f of findings) {
  console.log(`  [${f.pattern}] ${f.path} @${f.blob} → ${f.preview}`);
}
process.exit(1);
