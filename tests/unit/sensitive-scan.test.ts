import { describe, expect, it } from "vitest";

import {
  scanSensitiveFields,
  scanSensitiveText,
  sensitiveScanUserMessage,
} from "@/lib/security/sensitive-scan";

describe("scanSensitiveText", () => {
  it("mendeteksi NIK 16 digit", () => {
    const findings = scanSensitiveText("NIK saya 3201234567890123 tolong dicatat");
    expect(findings.some((f) => f.kind === "nik")).toBe(true);
  });

  it("mendeteksi NIK dengan spasi", () => {
    const findings = scanSensitiveText("NIK: 3201 2345 6789 0123");
    expect(findings.some((f) => f.kind === "nik")).toBe(true);
  });

  it("mendeteksi nomor rekening 10-16 digit", () => {
    const findings = scanSensitiveText("Rekening BCA 1234567890 apabila lolos");
    expect(findings.some((f) => f.kind === "rekening")).toBe(true);
  });

  it("tidak menandai nominal rupiah bertitik", () => {
    const findings = scanSensitiveText("Bantuan sebesar Rp 1.000.000 per bulan");
    expect(findings).toHaveLength(0);
  });

  it("tidak menandai teks biasa", () => {
    expect(scanSensitiveText("Bantuan pendidikan untuk siswa SD tahun 2026")).toHaveLength(0);
  });

  it("tidak mengulang nilai sensitif dalam pesan", () => {
    const findings = scanSensitiveText("NIK 3201234567890123");
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.message).not.toContain("3201234567890123");
    }
  });
});

describe("scanSensitiveFields", () => {
  it("menggabungkan beberapa field & dedupe", () => {
    const findings = scanSensitiveFields([
      { name: "description", value: "NIK 3201234567890123" },
      { name: "requirements", value: "rekening 12345678901234" },
      { name: "title", value: "Bantuan biasa" },
    ]);
    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings.map((f) => f.field)).toContain("description");
    expect(findings.map((f) => f.field)).toContain("requirements");
  });
});

describe("sensitiveScanUserMessage", () => {
  it("menghasilkan pesan edukatif", () => {
    const message = sensitiveScanUserMessage([{ kind: "nik", message: "x" }]);
    expect(message).toContain("NIK");
    expect(message).toContain("data pribadi");
  });

  it("kosong jika tidak ada temuan", () => {
    expect(sensitiveScanUserMessage([])).toBe("");
  });
});
