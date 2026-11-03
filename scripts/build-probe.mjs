import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

/**
 * Menjalankan `next build` dan menulis keluaran tanpa kode ANSI ke build-out.log.
 * PowerShell di Windows mengacaukan karakter box-drawing sehingga log dibaca
 * dari file. File log ini di-gitignore.
 */
const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  {
    encoding: "utf8",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", FORCE_COLOR: "0", NO_COLOR: "1" },
    maxBuffer: 64 * 1024 * 1024,
  },
);

const strip = (s) => (s ?? "").replace(/\u001B\[[0-9;]*[A-Za-z]/g, "");
writeFileSync(
  "build-out.log",
  `STATUS: ${result.status}\n\nSTDOUT:\n${strip(result.stdout)}\n\nSTDERR:\n${strip(result.stderr)}`,
);
console.log("exit", result.status);
