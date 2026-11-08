import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "@/lib/security/json-ld";

/**
 * Regresi XSS pada JSON-LD.
 *
 * `JSON.stringify` tidak meng-escape `<`, sehingga teks kiriman pengguna yang
 * mengandung `</script>` bisa menutup tag `<script type="application/ld+json">`
 * lebih awal dan menyisipkan markup yang dieksekusi browser. Tes ini mengunci
 * perbaikan tersebut agar tidak kembali saat kode dirapikan.
 */

describe("serializeJsonLd", () => {
  it("tidak membiarkan penutup tag script muncul di dalam hasil", () => {
    const payload = { name: 'Gratis </script><img src=x onerror="alert(1)">' };
    const html = serializeJsonLd(payload);

    // Tidak boleh ada `</script` mentah (satu-satunya penutup adalah milik JSX).
    expect(html.toLowerCase()).not.toContain("</script");
    expect(html).not.toContain("<");
    // Versi berbahaya juga tidak boleh lolos dalam bentuk huruf besar.
    expect(serializeJsonLd({ name: "</SCRIPT >" }).toLowerCase()).not.toContain("</script");
  });

  it("menetralkan pembuka komentar HTML yang mengubah mode parser", () => {
    expect(serializeJsonLd({ name: "<!--" })).not.toContain("<!--");
  });

  it("hasil tetap dapat di-parse dan isinya setara", () => {
    const payload = {
      "@context": "https://schema.org",
      title: "Akses </script> gratis & murah",
      nested: { list: ["a<b", "c>d", "e&f"] },
    };
    expect(JSON.parse(serializeJsonLd(payload))).toEqual(payload);
  });

  it("tidak mengubah objek tanpa karakter berbahaya", () => {
    const payload = { "@type": "WebSite", name: "AksesAI", url: "https://contoh.id/" };
    expect(serializeJsonLd(payload)).toBe(JSON.stringify(payload));
  });
});
