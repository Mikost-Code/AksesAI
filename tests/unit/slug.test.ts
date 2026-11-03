import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

/**
 * Tes `slugify` (PHASE 8). Fungsi ini harus sepadan dengan `public.slugify` di
 * SQL karena slug dipakai sebagai kunci URL publik dan untuk deteksi duplikat.
 */
describe("slugify", () => {
  it("menghasilkan slug huruf kecil dengan tanda hubung", () => {
    expect(slugify("Beasiswa Pendidikan untuk Siswa SMA")).toBe(
      "beasiswa-pendidikan-untuk-siswa-sma",
    );
  });

  it("menghapus tanda baca dan karakter non-alfanumerik", () => {
    expect(slugify("Bantuan!!! Sosial?? (2026)")).toBe("bantuan-sosial-2026");
  });

  it("merapikan tanda hubung berlebih di tepi", () => {
    expect(slugify("---Halo---Dunia---")).toBe("halo-dunia");
  });

  it("menggabungkan spasi & tanda hubung berurutan jadi satu", () => {
    expect(slugify("bantuan   -   pangan")).toBe("bantuan-pangan");
  });

  it("menghilangkan diakritik (é → e, ñ → n)", () => {
    expect(slugify("Café Señor")).toBe("cafe-senor");
  });

  it("menangani huruf beraksen hasil dekomposisi NFKD", () => {
    expect(slugify("Kébeutuhan")).toBe("kebeutuhan");
  });

  it("mempertahankan angka", () => {
    expect(slugify("Program 2026 Tahap 2")).toBe("program-2026-tahap-2");
  });

  it("mengembalikan string kosong untuk input tanpa karakter valid", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("menghasilkan keluaran idempoten", () => {
    const once = slugify("Bantuan Pendidikan");
    expect(slugify(once)).toBe(once);
  });

  it("tidak pernah menghasilkan tanda hubung di awal/akhir", () => {
    for (const input of ["  halo  ", "//halo//", "Halo Dunia!", "***"]) {
      const out = slugify(input);
      if (out.length > 0) {
        expect(out.startsWith("-")).toBe(false);
        expect(out.endsWith("-")).toBe(false);
      }
    }
  });
});
