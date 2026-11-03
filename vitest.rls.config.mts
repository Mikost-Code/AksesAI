import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Konfigurasi tes RLS & integrasi database.
 * BUTUH Supabase lokal: `supabase start` lalu `supabase db reset`.
 * Bila tidak tersedia, tes akan di-skip dengan peringatan (bukan gagal palsu).
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/rls/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // State DB global: jalankan berurutan agar tidak saling ganggu.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
