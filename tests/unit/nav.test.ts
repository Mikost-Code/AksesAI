import { describe, expect, it } from "vitest";

import { resolveActiveHref } from "@/lib/nav";

describe("resolveActiveHref", () => {
  const DASHBOARD_NAV = [
    { href: "/dashboard", exact: true },
    { href: "/dashboard/kontribusi" },
    { href: "/dashboard/kontribusi/baru" },
    { href: "/dashboard/laporan" },
    { href: "/admin" },
    { href: "/admin/pengguna" },
    { href: "/admin/kategori" },
  ] as const;

  it("halaman anak memilih item paling spesifik, bukan induknya", () => {
    // Bug nyata: dulu /dashboard/kontribusi DAN /dashboard/kontribusi/baru
    // sama-sama aktif di halaman "Bagikan informasi".
    expect(
      resolveActiveHref("/dashboard/kontribusi/baru", DASHBOARD_NAV),
    ).toBe("/dashboard/kontribusi/baru");
    expect(resolveActiveHref("/admin/pengguna", DASHBOARD_NAV)).toBe(
      "/admin/pengguna",
    );
  });

  it("halaman induk tetap mengaktifkan item induk", () => {
    expect(resolveActiveHref("/dashboard/kontribusi", DASHBOARD_NAV)).toBe(
      "/dashboard/kontribusi",
    );
    expect(resolveActiveHref("/admin", DASHBOARD_NAV)).toBe("/admin");
  });

  it("exact mencegah item ringkasan menyala di sub-halaman", () => {
    expect(resolveActiveHref("/dashboard/kontribusi", DASHBOARD_NAV)).not.toBe(
      "/dashboard",
    );
    expect(resolveActiveHref("/dashboard", DASHBOARD_NAV)).toBe("/dashboard");
  });

  it("halaman detail ikut mengaktifkan item induknya saja", () => {
    expect(
      resolveActiveHref("/dashboard/kontribusi/abc-123", DASHBOARD_NAV),
    ).toBe("/dashboard/kontribusi");
  });

  it("prefix harus berada di batas segmen", () => {
    // /dashboard-xyz tidak boleh mengaktifkan /dashboard.
    expect(resolveActiveHref("/dashboard-xyz", DASHBOARD_NAV)).toBeUndefined();
  });

  it("tidak ada yang cocok → undefined", () => {
    expect(resolveActiveHref("/info", DASHBOARD_NAV)).toBeUndefined();
    expect(resolveActiveHref("/", [])).toBeUndefined();
  });

  it("nav publik tanpa nesting tetap bekerja", () => {
    const links = [
      { href: "/info" },
      { href: "/panduan" },
      { href: "/tentang" },
    ] as const;
    expect(resolveActiveHref("/info", links)).toBe("/info");
    expect(resolveActiveHref("/info/model-baru", links)).toBe("/info");
    expect(resolveActiveHref("/panduan", links)).toBe("/panduan");
  });
});
