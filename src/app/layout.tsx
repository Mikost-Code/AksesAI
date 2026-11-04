import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";

import { NavigationProgress } from "@/components/layout/navigation-progress";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants/labels";
import { clientEnv } from "@/lib/env";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv().NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${APP_NAME} — Direktori Info Gratis & Murah Seputar AI`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: APP_NAME,
    title: `${APP_NAME} — Direktori Info Gratis & Murah Seputar AI`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Direktori Info Gratis & Murah Seputar AI`,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    // Satu URL kanonik per halaman. Domain alternatif (mis. alias deployment
    // Vercel) tidak boleh terindeks ganda agar tidak terjadi konten duplikat.
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
