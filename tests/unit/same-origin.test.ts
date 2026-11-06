import { afterEach, describe, expect, it, vi } from "vitest";

import { isSameOrigin } from "@/lib/security/same-origin";

function req(entries: Record<string, string>): { headers: Headers } {
  return { headers: new Headers(entries) };
}

describe("isSameOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("menerima origin yang sama dengan host", () => {
    expect(
      isSameOrigin(req({ origin: "https://aksesai.id", host: "aksesai.id" })),
    ).toBe(true);
  });

  it("menerima origin sama beserta port yang cocok", () => {
    expect(
      isSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" })),
    ).toBe(true);
  });

  it("menolak origin berbeda domain", () => {
    expect(
      isSameOrigin(req({ origin: "https://evil.example", host: "aksesai.id" })),
    ).toBe(false);
  });

  it("menolak domain sama dengan port berbeda", () => {
    // Port adalah bagian dari origin; port lain harus ditolak.
    expect(
      isSameOrigin(req({ origin: "http://localhost:4000", host: "localhost:3000" })),
    ).toBe(false);
  });

  it("menerima skema apa pun bila host:port cocok (proxy yang menangani TLS)", () => {
    // Di balik reverse proxy, Origin bisa http:// sementara Host tanpa skema;
    // yang dibandingkan hanya host:port — itu batas yang benar untuk CSRF.
    expect(
      isSameOrigin(req({ origin: "http://aksesai.id", host: "aksesai.id" })),
    ).toBe(true);
  });

  it("menolak Origin: null (iframe sandbox)", () => {
    expect(isSameOrigin(req({ origin: "null", host: "aksesai.id" }))).toBe(false);
  });

  it("menolak Origin yang rusak", () => {
    expect(isSameOrigin(req({ origin: "bukan url", host: "aksesai.id" }))).toBe(false);
  });

  it("menolak tanpa Origin di production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isSameOrigin(req({ host: "aksesai.id" }))).toBe(false);
  });

  it("mengizinkan tanpa Origin di luar production (curl/seed lokal)", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isSameOrigin(req({ host: "localhost:3000" }))).toBe(true);
  });
});
