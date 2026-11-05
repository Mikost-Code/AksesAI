import { ImageResponse } from "next/og";

import { clientEnv } from "@/lib/env";
import { APP_NAME } from "@/lib/constants/labels";
import { getProgramForOg } from "@/lib/programs/seo";

/**
 * Kartu Open Graph per entri direktori (dipakai saat tautan entri
 * dibagikan ke WhatsApp/X/dll). Bila entri tidak ditemukan, kartu brand
 * generik tetap tampil — permintaan tidak pernah gagal.
 */

export const alt = `${APP_NAME} — detail info AI`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [program, siteHost] = await Promise.all([
    getProgramForOg(slug),
    Promise.resolve(
      new URL(clientEnv().NEXT_PUBLIC_SITE_URL).hostname.replace(/^www\./, ""),
    ),
  ]);

  const title = program?.title ?? "Info AI gratis & murah";
  // Satori tidak melakukan word-wrap otomatis pada teks panjang; pecah manual.
  const chars = title.slice(0, 90);
  const lines: string[] = [];
  let current = "";
  for (const word of chars.split(/\s+/)) {
    if ((current + " " + word).trim().length > 38) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current.trim()) lines.push(current.trim());
  const displayLines = lines.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #062E2B 0%, #0D6E66 58%, #0A8074 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: 72,
        }}
      >
        {/* Header brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(255, 255, 255, 0.14)",
              border: "2px solid rgba(255, 255, 255, 0.28)",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            Akses
            <span style={{ color: "#5EEAD4" }}>AI</span>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 28,
              padding: "8px 22px",
              borderRadius: 999,
              background: "rgba(94, 234, 212, 0.18)",
              border: "1.5px solid rgba(94, 234, 212, 0.5)",
              fontSize: 24,
              color: "#5EEAD4",
            }}
          >
            Terverifikasi manual
          </div>
        </div>

        {/* Judul entri */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayLines.map((line, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1.15,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Footer: provider */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {program?.provider ? (
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.12)",
                border: "1.5px solid rgba(255, 255, 255, 0.3)",
                fontSize: 28,
              }}
            >
              {program.provider}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255, 255, 255, 0.7)" }}>
            {siteHost}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
