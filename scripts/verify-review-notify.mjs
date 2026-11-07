// Uji end-to-end notifikasi antrean review (migrasi 0014).
//
// Skenario nyata: seorang member (bukan staf) mengirim kontribusi, lalu staf
// harus menerima notifikasi `review_queue_new`. Yang diuji lewat jalur
// sesungguhnya — RPC `submit_program` dipanggil sebagai user tersebut — bukan
// dengan menulis baris notifikasi langsung.
//
// Setelah uji, kontribusi uji DIHAPUS kembali agar katalog tidak tercemar.
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const problems = [];

// ── Siapkan pelaku ─────────────────────────────────────────────────────────
const KONTRIBUTOR = process.env.KONTRIBUTOR ?? "keyyjuya";
const PEMILIK = "zann06";

async function idDari(username) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("github_username", username)
    .maybeSingle();
  if (error || !data) throw new Error(`profil ${username} tidak ditemukan`);
  return data.id;
}

async function sesiUntuk(userId) {
  const { data: akun, error } = await admin.auth.admin.getUserById(userId);
  if (error || !akun?.user?.email) throw new Error("email tidak terbaca");
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: akun.user.email,
  });
  if (linkErr) throw new Error(linkErr.message);
  const { data: verif, error: verifErr } = await admin.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (verifErr) throw new Error(verifErr.message);
  return verif.session;
}

const idKontributor = await idDari(KONTRIBUTOR);
const idPemilik = await idDari(PEMILIK);

// Pembersihan sisa uji sebelumnya SENGAJA tidak dilakukan di awal, karena
// notifikasi tidak dihapus bersama program (tidak ada FK cascade dari
// program ke notifikasi) sehingga sisa notifikasi lama akan mengacaukan
// hitungan. Semua pembersihan dilakukan di akhir skrip.

// Kategori & kebutuhan minimal untuk satu program.
const { data: kategori } = await admin
  .from("categories")
  .select("id")
  .eq("slug", "free-api")
  .single();

const slugUji = `uji-notif-review-${Date.now()}`;
const { data: program, error: programErr } = await admin
  .from("assistance_programs")
  .insert({
    slug: slugUji,
    title: "Uji notifikasi antrean review",
    category_id: kategori.id,
    access_type: "api",
    organizer: "Uji internal",
    provider: "Uji",
    description:
      "Entri sementara untuk menguji notifikasi antrean review. Dibuat otomatis oleh skrip verifikasi dan dihapus kembali setelah pengujian selesai.",
    contributor_id: idKontributor,
    status: "draft",
  })
  .select("id")
  .single();

if (programErr || !program) {
  console.error("GAGAL: gagal membuat program uji:", programErr?.message);
  process.exit(1);
}

await admin.from("sources").insert({
  program_id: program.id,
  source_url: "https://example.com/uji-notif",
  source_url_normalized: "https://example.com/uji-notif",
  source_title: "Sumber uji",
  is_primary: true,
  source_type: "dokumentasi_resmi",
  link_status: "ok",
});

// ── Panggil RPC sebagai kontributor (jalur sesungguhnya) ───────────────────
const sesiKontributor = await sesiUntuk(idKontributor);
const klienKontributor = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${sesiKontributor.access_token}` } },
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: statusBaru, error: submitErr } = await klienKontributor.rpc("submit_program", {
  p_program_id: program.id,
});
if (submitErr) {
  console.error("GAGAL: submit_program:", submitErr.message);
  await admin.from("assistance_programs").delete().eq("id", program.id);
  process.exit(1);
}
console.log(`submit_program -> ${statusBaru}`);
if (statusBaru !== "pending") problems.push(`status setelah submit: ${statusBaru}`);

// ── Periksa notifikasi ─────────────────────────────────────────────────────
// Disaring langsung dari database berdasarkan slug program uji ini (tercatat
// di metadata), bukan dari judul, agar tidak bergantung pada tebakan teks.
//
// Dibaca dengan sedikit percobaan ulang: RPC `submit_program` mengembalikan
// hasil lebih dulu, sementara pembacaan lewat koneksi lain (PostgREST) kadang
// belum melihat baris yang baru ditulis. Tanpa retry, tes bisa melaporkan 0
// padahal notifikasinya ada — persis yang sempat terjadi.
async function bacaNotifikasi() {
  // Klien baru setiap percobaan memaksa koneksi baru ke PostgREST, agar tidak
  // terbaca dari cache/saluran lama yang belum melihat baris terbaru.
  for (let percobaan = 1; percobaan <= 10; percobaan += 1) {
    const klien = createClient(url, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "Cache-Control": "no-cache" } },
    });
    const { data, error } = await klien
      .from("notifications")
      .select("user_id, kind, title, href, metadata, created_at")
      .eq("kind", "review_queue_new")
      .eq("metadata->>slug", slugUji);
    if (error) throw new Error(`gagal membaca notifikasi: ${error.message}`);
    if ((data ?? []).length > 0) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  return [];
}
const notif = await bacaNotifikasi();

const penerima = [...new Set(notif.map((n) => n.user_id))];
console.log(`notifikasi ditulis untuk ${slugUji}: ${notif.length}`);
console.log(`penerima unik: ${penerima.length}`);
if (notif.length === 0) {
  problems.push("tidak ada notifikasi review_queue_new yang ditulis");
}
if (penerima.includes(idPemilik)) {
  console.log("OK   pemilik (zann06) menerima notifikasi");
} else {
  problems.push("pemilik (zann06) TIDAK menerima notifikasi");
}
if (penerima.includes(idKontributor)) {
  problems.push("kontributor menerima notifikasi untuk kirimannya sendiri (seharusnya tidak)");
} else {
  console.log("OK   kontributor tidak dinotifikasi untuk kirimannya sendiri");
}

const contoh = (notif ?? [])[0];
if (contoh) {
  if (contoh.href !== "/review") problems.push(`href notifikasi salah: ${contoh.href}`);
  if (!contoh.title?.startsWith("Kontribusi baru:")) {
    problems.push(`judul notifikasi tidak sesuai: ${contoh.title}`);
  }
  console.log(`     judul: ${contoh.title}`);
}

// ── Bersihkan ──────────────────────────────────────────────────────────────
// Dijalankan PALING AKHIR, setelah semua pemeriksaan selesai — kalau tidak,
// notifikasi yang seharusnya dihitung akan terhapus lebih dulu dan tes selalu
// melaporkan 0.
//
// Notifikasi disaring dengan slug program uji ini (tersimpan di metadata),
// bukan berdasarkan judul, agar tidak menyentuh notifikasi asli pengguna.
// `contribution_history` bersifat append-only: cascade delete program akan
// memicu trigger `forbid_mutation`, sehingga program uji dibiarkan apa adanya
// bila pembersihan ditolak — lebih baik menyisakannya daripada mematikan
// trigger append-only dari dalam skrip tes.
await admin.from("notifications").delete().eq("metadata->>slug", slugUji);

const { error: hapusErr } = await admin
  .from("assistance_programs")
  .delete()
  .eq("id", program.id);
if (hapusErr) {
  console.warn(
    `catatan: program uji ${slugUji} belum terhapus (${hapusErr.message}). ` +
      "Hapus manual lewat migrasi pembersihan.",
  );
} else {
  console.log("OK   data uji dibersihkan");
}

if (problems.length > 0) {
  console.error("GAGAL:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("\nLULUS: submit kontribusi menotifikasi staf peninjau, bukan kontributornya");
