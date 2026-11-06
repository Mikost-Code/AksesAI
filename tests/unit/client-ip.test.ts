import { describe, expect, it } from "vitest";

import { normalizeIp, parseClientIp } from "@/lib/security/client-ip";

/**
 * Regresi anti-spoofing.
 *
 * Entri PERTAMA `X-Forwarded-For` sepenuhnya dikendalikan klien: penyerang
 * cukup mengirim `X-Forwarded-For: 1.2.3.4` untuk mendapat identitas baru pada
 * setiap permintaan dan melewati rate limit. Header proxy tepercaya harus
 * menang, dan bila tidak ada, entri TERAKHIR XFF yang dipakai.
 */

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("parseClientIp", () => {
  it("mengutamakan cf-connecting-ip di atas x-forwarded-for", () => {
    const result = parseClientIp(
      headers({
        "cf-connecting-ip": "203.0.113.9",
        "x-forwarded-for": "1.2.3.4, 198.51.100.1",
      }),
    );
    expect(result).toBe("203.0.113.9");
  });

  it("mengutamakan x-vercel-forwarded-for di atas x-forwarded-for", () => {
    const result = parseClientIp(
      headers({
        "x-vercel-forwarded-for": "198.51.100.7",
        "x-forwarded-for": "1.2.3.4, 198.51.100.1",
      }),
    );
    expect(result).toBe("198.51.100.7");
  });

  it("memakai entri TERAKHIR x-forwarded-for, bukan entri kiriman klien", () => {
    // Klien memalsukan "1.2.3.4"; proxy menambahkan 198.51.100.1 di kanan.
    const result = parseClientIp(
      headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.1" }),
    );
    expect(result).toBe("198.51.100.1");
  });

  it("tidak dapat dipalsukan lewat x-forwarded-for berisi satu nilai", () => {
    // Satu nilai = ditulis proxy itu sendiri (klien tidak mengirim header ini
    // melalui infrastruktur yang benar). Tetap dipakai, tetapi bukan dari
    // header yang dapat diisi bebas dari browser biasa.
    expect(parseClientIp(headers({ "x-forwarded-for": "203.0.113.5" }))).toBe(
      "203.0.113.5",
    );
  });

  it("jatuh ke x-real-ip bila tidak ada x-forwarded-for", () => {
    expect(parseClientIp(headers({ "x-real-ip": "192.0.2.4" }))).toBe("192.0.2.4");
  });

  it("mengembalikan placeholder bila tidak ada header IP sama sekali", () => {
    expect(parseClientIp(headers({}))).toBe("0.0.0.0");
  });

  it("mengabaikan header kosong", () => {
    expect(
      parseClientIp(headers({ "cf-connecting-ip": "  ", "x-real-ip": "192.0.2.9" })),
    ).toBe("192.0.2.9");
  });

  it("membuang spasi di sekitar nilai", () => {
    expect(parseClientIp(headers({ "cf-connecting-ip": " 203.0.113.9 " }))).toBe(
      "203.0.113.9",
    );
  });
});

describe("normalizeIp", () => {
  it("membuang port IPv4", () => {
    expect(normalizeIp("203.0.113.9:5678")).toBe("203.0.113.9");
  });

  it("membuang kurung IPv6", () => {
    expect(normalizeIp("[2001:db8::1]")).toBe("2001:db8::1");
  });

  it("membiarkan IPv4 tanpa port apa adanya", () => {
    expect(normalizeIp("203.0.113.9")).toBe("203.0.113.9");
  });

  it("membiarkan IPv6 tanpa kurung apa adanya", () => {
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
  });

  it("tidak salah mengira IPv6 berkurung sebagai ber-port", () => {
    expect(normalizeIp("[::1]:443")).toBe("::1");
  });
});
