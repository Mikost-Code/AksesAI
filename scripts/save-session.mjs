import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Buka browser dengan profil persisten supaya Anda bisa login GitHub manual
 * SEKALI, lalu sesinya disimpan ke ui-shots/auth-state.json.
 *
 * Jalankan: node scripts/save-session.mjs
 * Login di jendela yang terbuka, tunggu sampai kembali ke /dashboard,
 * lalu kembali ke terminal dan tekan Enter.
 */
const BASE = "http://localhost:3000";
mkdirSync("ui-shots", { recursive: true });

const ctx = await chromium.launchPersistentContext("ui-shots/.auth-profile", {
  headless: false,
  viewport: { width: 1280, height: 860 },
});

const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });

console.log("Browser terbuka. Silakan login GitHub di jendela itu.");
console.log("Setelah sampai di /dashboard, tekan Enter di terminal ini...");

await new Promise((resolve) => {
  process.stdin.resume();
  process.stdin.once("data", resolve);
});

console.log("URL saat ini:", page.url());
await ctx.storageState({ path: "ui-shots/auth-state.json" });
console.log("Sesi disimpan ke ui-shots/auth-state.json");
await ctx.close();
