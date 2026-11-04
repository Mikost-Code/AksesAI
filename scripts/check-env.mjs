import { readFileSync } from "node:fs";

const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  const key = t.slice(0, i);
  const val = t.slice(i + 1).trim();
  if (!val) {
    console.log(key.padEnd(34) + "= [KOSONG]");
  } else if (val.startsWith("http")) {
    console.log(key.padEnd(34) + "= " + val);
  } else {
    console.log(
      key.padEnd(34) + "= " + val.slice(0, 10) + "...  (" + val.length + " karakter, terisi)",
    );
  }
}
