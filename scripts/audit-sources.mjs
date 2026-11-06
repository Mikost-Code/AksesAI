// Audit tautan sumber: ambil semua URL dari ENTRIES di seed-content.mjs, lalu
// periksa status HTTP-nya. Menangkap tautan mati (404) dan redirect yang
// mengarah ke halaman yang tidak relevan.
import { readFileSync } from "node:fs";

const src = readFileSync("scripts/seed-content.mjs", "utf8");
const urls = [...src.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(urls)];

// Ekstrak slug pemilik tiap URL agar laporan mudah dibaca.
const owner = new Map();
for (const block of src.split(/\n  \{\n    slug:/).slice(1)) {
  const slug = block.match(/^\s*"([^"]+)"/)?.[1];
  for (const m of block.matchAll(/url:\s*"([^"]+)"/g)) {
    owner.set(m[1], slug);
  }
}

const ua = "Mozilla/5.0 (compatible; AksesAI-audit/1.0)";
const results = [];

for (const url of unique) {
  let status = "ERR";
  let finalUrl = "";
  let note = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": ua, accept: "text/html,application/json;q=0.9,*/*;q=0.8" },
      signal: AbortSignal.timeout(25000),
    });
    status = res.status;
    finalUrl = res.url;
    if (finalUrl && finalUrl !== url) note = "redirect";
    await res.body?.cancel().catch(() => {});
  } catch (err) {
    note = String(err?.message ?? err).slice(0, 60);
  }
  results.push({ slug: owner.get(url) ?? "?", url, status, finalUrl, note });
  await new Promise((r) => setTimeout(r, 250));
}

const bad = results.filter((r) => r.status !== 200);
console.log(`total URL: ${results.length} | OK: ${results.length - bad.length} | bermasalah: ${bad.length}\n`);
for (const r of results) {
  const mark = r.status === 200 ? "OK " : "BAD";
  const extra = r.note ? ` (${r.note})` : "";
  console.log(`${mark} ${r.status}  ${r.slug.padEnd(34)} ${r.url}${extra}`);
  if (r.finalUrl && r.finalUrl !== r.url) console.log(`        -> ${r.finalUrl}`);
}
