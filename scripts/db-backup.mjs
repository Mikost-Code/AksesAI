#!/usr/bin/env node
/**
 * Backup skema & data SQL ke folder lokal (repo tidak menyimpan supabase/).
 *
 * Menjalankan `supabase db dump` (role/permission default) lalu menyimpan
 * hasil ke supabase/backups/ dengan penanda waktu. Folder itu diabaikan git
 * — inilah satu-satunya salinan skema selain mesin Anda.
 *
 * Jalankan: node scripts/db-backup.mjs          (skema + data)
 *           node scripts/db-backup.mjs --schema (skema saja)
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const schemaOnly = process.argv.includes("--schema");
const dir = join(process.cwd(), "supabase", "backups");
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = join(dir, `${schemaOnly ? "schema" : "dump"}-${stamp}.sql`);

const flags = schemaOnly ? ["--schema", "public"] : ["--use-copy", "--schema", "public", "--data-file"];

try {
  execSync(`supabase db dump ${flags.join(" ")} -f ${file}`, {
    stdio: "inherit",
  });
  console.log(`\n✅ Backup tersimpan: ${file}`);
  console.log("Simpan salinannya ke drive/penyimpanan lain secara berkala —");
  console.log("folder supabase/ tidak ada di repo publik.");
} catch {
  console.error("\n❌ Backup gagal. Pastikan `supabase login` & `supabase link` sudah dilakukan, atau jalankan manual:");
  console.error(`  supabase db dump ${flags.join(" ")} -f <file>.sql`);
  process.exit(1);
}
