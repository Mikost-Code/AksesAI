import { ImageResponse } from "next/og";

import { APP_NAME } from "@/lib/constants/labels";

/**
 * Kartu Open Graph situs (dipakai saat beranda/halaman umum dibagikan).
 * Warna hardcoded agar identik di semua tema; ImageResponse (satori)
 * mensyaratkan flexbox eksplisit pada elemen bertumpuk.
 */

export const alt = `${APP_NAME} — Direktori Info Gratis & Murah Seputar AI`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #062E2B 0%, #0D6E66 55%, #0A8074 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 36,
            background: "rgba(255, 255, 255, 0.12)",
            border: "2px solid rgba(255, 255, 255, 0.25)",
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          A
        </div>

        <div style={{ display: "flex", marginTop: 44, fontSize: 108, fontWeight: 700, letterSpacing: -4 }}>
          Akses
          <span style={{ color: "#5EEAD4" }}>AI</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 40,
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          Info AI gratis &amp; murah, dengan sumber yang jelas
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 48 }}>
          {["Free API & Token", "Free Tier Model", "Tool AI Gratis", "Hosting Gratis"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "12px 28px",
                  borderRadius: 999,
                  border: "1.5px solid rgba(255, 255, 255, 0.35)",
                  background: "rgba(255, 255, 255, 0.1)",
                  fontSize: 26,
                  color: "rgba(255, 255, 255, 0.92)",
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
