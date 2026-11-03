import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--local", "--schema", "public"],
  { encoding: "utf8", shell: true, maxBuffer: 32 * 1024 * 1024 },
);

if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}

writeFileSync("src/types/database.ts", result.stdout, "utf8");
console.log("written", result.stdout.length);
