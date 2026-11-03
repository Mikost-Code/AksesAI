/**
 * Konstanta domain & label UI Bahasa Indonesia.
 * Semua teks status/reason dipusatkan di sini (PRD §7 NFR — i18n-ready).
 */

export const APP_NAME = "BantuWarga";

export const APP_DESCRIPTION =
  "Direktori informasi bantuan sosial berbasis kontribusi komunitas dengan sumber yang dapat diperiksa dan verifikasi manual oleh reviewer.";

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

/** Status program yang terlihat publik di direktori & detail. */
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
  verified: "Sudah diperiksa reviewer berdasarkan sumber yang tersedia.",
  expired: "Tanggal berakhir sudah lewat; informasi mungkin tidak berlaku lagi.",
  archived: "Disembunyikan dari direktori.",
};

export const REGION_SCOPES = ["nasional", "provinsi", "kabupaten_kota"] as const;
export type RegionScope = (typeof REGION_SCOPES)[number];

export const REGION_SCOPE_LABEL: Record<RegionScope, string> = {
  nasional: "Nasional",
  provinsi: "Provinsi",
  kabupaten_kota: "Kabupaten/Kota",
};

export const SOURCE_TYPES = [
  "situs_resmi",
  "media_massa",
  "media_sosial_resmi",
  "dokumen",
  "lainnya",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  situs_resmi: "Situs resmi",
  media_massa: "Media massa",
  media_sosial_resmi: "Media sosial resmi",
  dokumen: "Dokumen",
  lainnya: "Lainnya",
};

export const REPORT_REASONS = [
  "tidak_akurat",
  "kedaluwarsa",
  "link_mati",
  "duplikat",
  "dugaan_penipuan",
  "spam",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  tidak_akurat: "Informasi tidak akurat",
  kedaluwarsa: "Sudah kedaluwarsa",
  link_mati: "Tautan sumber tidak tersedia",
  duplikat: "Duplikat informasi lain",
  dugaan_penipuan: "Dugaan penipuan",
  spam: "Spam/penyalahgunaan",
};

/** Urutan prioritas moderasi (PRD FR-MOD-1). */
export const REPORT_REASON_PRIORITY: Record<ReportReason, number> = {
  dugaan_penipuan: 0,
  tidak_akurat: 1,
  link_mati: 2,
  kedaluwarsa: 3,
  duplikat: 4,
  spam: 5,
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

export const APP_ROLES = ["member", "reviewer", "moderator", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABEL: Record<AppRole, string> = {
  member: "Anggota",
  reviewer: "Reviewer",
  moderator: "Moderator",
  admin: "Admin",
};

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
  archive_program: "Sembunyikan informasi",
  ban_contributor: "Blokir kontributor",
  resolve: "Selesaikan dengan catatan",
};

/** Batas validasi kontribusi (PRD FR-CON-2). */
export const CONTRIBUTION_LIMITS = {
  titleMin: 10,
  titleMax: 150,
  descriptionMin: 50,
  descriptionMax: 3000,
  organizerMax: 150,
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

/** Disclaimer wajib tampil di halaman detail (UI_UX §6.3). */
export const DEFAULT_DISCLAIMER_TEXT =
  "Terverifikasi berarti informasi telah diperiksa oleh reviewer berdasarkan sumber yang tersedia. Ini bukan jaminan pemerintah dan bukan jaminan bantuan masih tersedia. Selalu periksa sumber resmi.";

export const PLATFORM_DISCLAIMER_SHORT =
  "BantuWarga bukan lembaga pemerintah, bukan penyalur bansos, dan bukan penentu kelayakan penerima bantuan.";

export const SENSITIVE_DATA_WARNING =
  "Jangan menulis data pribadi seperti NIK, nomor KK, nomor rekening, foto KTP, atau identitas penerima bantuan.";

/** Daftar 38 provinsi Indonesia (label tampilan, bukan penyimpanan kode). */
export const PROVINCES = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Bengkulu",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Lampung",
  "Banten",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Selatan",
] as const;

export const PAGE_SIZE = 12;
export const EXPIRING_SOON_DAYS_DEFAULT = 14;
