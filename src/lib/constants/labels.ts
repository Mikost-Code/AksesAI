/**
 * Konstanta domain & label UI Bahasa Indonesia — AksesAI.
 * Direktori info "gratisan & murah" seputar AI.
 * Semua teks status/reason dipusatkan di sini (NFR i18n-ready).
 */

export const APP_NAME = "AksesAI";

export const APP_DESCRIPTION =
  "Direktori info gratis dan murah seputar AI: token/API gratis dari provider, free tier, harga per token, model open-weight, tool gratis, dan hosting gratis — dikontribusikan komunitas dan diverifikasi manual.";

export const PROGRAM_STATUSES = [
  "draft",
  "pending",
  "needs_changes",
  "verified",
  "rejected",
  "expired",
  "archived",
] as const;

export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

/** Status entri yang terlihat publik di direktori & detail. */
export const PUBLIC_PROGRAM_STATUSES = ["verified", "expired"] as const satisfies ReadonlyArray<ProgramStatus>;

export type PublicProgramStatus = (typeof PUBLIC_PROGRAM_STATUSES)[number];

/** Status yang boleh dikembalikan ke Pending oleh cron/moderator. */
export const REVIEWABLE_STATUSES = ["pending"] as const;

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  draft: "Draf",
  pending: "Menunggu Peninjauan",
  needs_changes: "Perlu Revisi",
  rejected: "Ditolak",
  verified: "Terverifikasi",
  expired: "Kedaluwarsa",
  archived: "Diarsipkan",
};

export const PROGRAM_STATUS_DESCRIPTION: Record<ProgramStatus, string> = {
  draft: "Belum dikirim; hanya Anda yang dapat melihat.",
  pending: "Menunggu pemeriksaan reviewer.",
  needs_changes: "Reviewer meminta perbaikan sebelum dapat diterbitkan.",
  rejected: "Tidak dapat diterbitkan; lihat alasan reviewer.",
  verified: "Sudah diperiksa reviewer terhadap sumber resmi provider.",
  expired: "Masa promo/kuota kemungkinan sudah lewat; cek halaman resmi provider.",
  archived: "Disembunyikan dari direktori.",
};

/** Jenis akses AI. Menggantikan konsep wilayah pada domain lama. */
export const ACCESS_TYPES = ["api", "chat", "tool", "hosting", "model"] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const ACCESS_TYPE_LABEL: Record<AccessType, string> = {
  api: "API / Endpoint",
  chat: "Chat / Playground",
  tool: "Tool AI",
  hosting: "Hosting",
  model: "Model (open-weight)",
};

export const ACCESS_TYPE_DESCRIPTION: Record<AccessType, string> = {
  api: "Dipakai lewat API — cocok untuk developer yang memanggil model dari kode.",
  chat: "Antarmuka chat atau playground yang bisa langsung dipakai di browser.",
  tool: "Aplikasi jadi (coding assistant, generator gambar, dsb.).",
  hosting: "Tempat menjalankan/menghosting model atau aplikasi AI secara gratis.",
  model: "Bobot model terbuka yang bisa diunduh dan dijalankan sendiri.",
};

export const SOURCE_TYPES = [
  "dokumentasi_resmi",
  "halaman_harga",
  "blog_provider",
  "repo_resmi",
  "media_tepercaya",
  "lainnya",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  dokumentasi_resmi: "Dokumentasi resmi",
  halaman_harga: "Halaman harga",
  blog_provider: "Blog/pengumuman provider",
  repo_resmi: "Repositori resmi",
  media_tepercaya: "Media tepercaya",
  lainnya: "Lainnya",
};

export const REPORT_REASONS = [
  "kuota_berubah",
  "tidak_lagi_gratis",
  "harga_salah",
  "kedaluwarsa",
  "link_mati",
  "tidak_akurat",
  "duplikat",
  "dugaan_penipuan",
  "spam",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  kuota_berubah: "Kuota gratis berubah",
  tidak_lagi_gratis: "Sudah tidak gratis",
  harga_salah: "Harga per token tidak sesuai",
  kedaluwarsa: "Promo sudah berakhir",
  link_mati: "Tautan sumber tidak tersedia",
  tidak_akurat: "Informasi tidak akurat",
  duplikat: "Duplikat entri lain",
  dugaan_penipuan: "Dugaan penipuan",
  spam: "Spam/penyalahgunaan",
};

/** Urutan prioritas moderasi: info menyesatkan soal gratis lebih dulu. */
export const REPORT_REASON_PRIORITY: Record<ReportReason, number> = {
  dugaan_penipuan: 0,
  tidak_lagi_gratis: 1,
  harga_salah: 2,
  kuota_berubah: 3,
  tidak_akurat: 4,
  link_mati: 5,
  kedaluwarsa: 6,
  duplikat: 7,
  spam: 8,
};

export const REPORT_STATUSES = [
  "open",
  "in_review",
  "resolved",
  "dismissed",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Baru",
  in_review: "Sedang ditangani",
  resolved: "Selesai",
  dismissed: "Diabaikan",
};

/**
 * Role aplikasi. `super_admin` = pemilik platform: mewarisi semua akses
 * admin ditambah kewenangan eksklusif mengatur role & memblokir admin.
 * Role ini hanya dapat diatur lewat konsol database, bukan lewat aplikasi.
 */
export const APP_ROLES = [
  "member",
  "reviewer",
  "moderator",
  "admin",
  "super_admin",
] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABEL: Record<AppRole, string> = {
  member: "Anggota",
  reviewer: "Reviewer",
  moderator: "Moderator",
  admin: "Admin",
  super_admin: "Super Admin",
};

/** Role staf yang dapat diberikan/cabut lewat UI (oleh super admin). */
export const STAFF_ROLE_KEYS = ["reviewer", "moderator", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLE_KEYS)[number];

export const REVIEW_ACTIONS = [
  "verify",
  "request_changes",
  "reject",
  "mark_expired",
] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export const MODERATION_ACTIONS = [
  "dismiss",
  "reopen_for_review",
  "archive_program",
  "ban_contributor",
  "resolve",
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const MODERATION_ACTION_LABEL: Record<ModerationAction, string> = {
  dismiss: "Abaikan laporan",
  reopen_for_review: "Kembalikan ke antrean reviewer",
  archive_program: "Sembunyikan entri",
  ban_contributor: "Blokir kontributor",
  resolve: "Selesaikan dengan catatan",
};

/** Batas validasi kontribusi. */
export const CONTRIBUTION_LIMITS = {
  titleMin: 10,
  titleMax: 150,
  descriptionMin: 50,
  descriptionMax: 3000,
  providerMax: 150,
  freeTierMax: 500,
  requirementsMax: 1500,
  noteMax: 1000,
  categoryNoteMax: 500,
  sourcesMin: 1,
  sourcesMax: 5,
  sourceTitleMax: 200,
} as const;

export const REVIEW_REASON_MIN = 20;
export const REVIEW_REASON_MAX = 1000;
export const REPORT_DESCRIPTION_MIN = 10;
export const REPORT_DESCRIPTION_MAX = 1000;

/** Batas form admin (kategori & alasan blokir) — dipakai aksi server & UI. */
export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 60;
export const CATEGORY_DESCRIPTION_MAX = 300;
export const ADMIN_REASON_MIN = 10;

/** Disclaimer wajib tampil di halaman detail. */
export const DEFAULT_DISCLAIMER_TEXT =
  "Terverifikasi berarti entri telah diperiksa reviewer terhadap dokumentasi atau halaman resmi provider pada saat peninjauan. Kuota gratis, harga, dan promo dapat berubah sewaktu-waktu tanpa pemberitahuan. Selalu periksa halaman resmi provider sebelum mendaftar.";

export const PLATFORM_DISCLAIMER_SHORT =
  "AksesAI bukan afiliasi provider AI mana pun. Kami tidak menjual token, tidak menjamin kuota gratis masih tersedia, dan tidak menerima pembayaran dari provider.";

export const SENSITIVE_DATA_WARNING =
  "Jangan menulis data pribadi seperti API key, token akses, NIK, nomor rekening, atau kredensial akun apa pun. Cukup tulis info yang memang dipublikasikan provider.";

/** Urutan tampilan pilihan jenis akses di form & filter. */
export const ACCESS_TYPE_OPTIONS = ACCESS_TYPES.map((value) => ({
  value,
  label: ACCESS_TYPE_LABEL[value],
}));

export const PAGE_SIZE = 12;
export const EXPIRING_SOON_DAYS_DEFAULT = 7;

/** Pilihan filter "jenis akses" di direktori (semua + tiap jenis). */
export const ACCESS_FILTER_OPTIONS = [
  { value: "semua", label: "Semua jenis" },
  ...ACCESS_TYPE_OPTIONS,
] as const;

/** Pilihan filter ketersediaan gratis. */
export const FREE_TIER_FILTER_OPTIONS = [
  { value: "semua", label: "Semua" },
  { value: "gratis", label: "Ada free tier" },
  { value: "tanpa_kartu", label: "Gratis tanpa kartu" },
  { value: "berbayar", label: "Berbayar murah" },
] as const;

export type FreeTierFilter = (typeof FREE_TIER_FILTER_OPTIONS)[number]["value"];
