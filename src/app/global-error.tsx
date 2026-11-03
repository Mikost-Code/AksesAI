"use client";

import { useEffect } from "react";

/**
 * Error boundary akar untuk kegagalan yang menggagalkan layout root.
 * Harus memuat <html> & <body> sendiri. Tidak pernah menampilkan stack trace
 * atau pesan internal — hanya `digest` yang dicatat ke console untuk korelasi
 * dengan log server.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app:global] Kesalahan kritis:", error.digest ?? "no-digest");
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Terjadi kesalahan</h1>
          <p style={{ marginTop: "0.5rem", color: "#5b6472" }}>
            Aplikasi gagal dimuat. Silakan muat ulang halaman. Jika berulang, coba lagi
            beberapa saat lagi.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Muat ulang
          </button>
        </main>
      </body>
    </html>
  );
}
