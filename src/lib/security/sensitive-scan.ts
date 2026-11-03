/**
 * Pemindai data sensitif (docs/SECURITY.md §1, PRD FR-CON-7).
 *
 * Ini LAPIS TAMBAHAN, bukan pengganti strategi privasi:
 * - UI mendidik pengguna untuk tidak menulis data pribadi.
 * - Reviewer tetap memeriksa manual (MODERATION_GUIDE checklist).
 *
 * Pesan hasil TIDAK pernah mengulang nilai yang terdeteksi.
 */

export type SensitiveFinding = {
  kind: "nik" | "kk" | "rekening" | "telepon_pribadi";
  message: string;
  /** Potongan field yang perlu diperbaiki (untuk memberi konteks, bukan nilai). */
  field?: string;
};

const DIGIT_RUN = /\d[\d\s.-]{8,}\d/g;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Mendeteksi pola nomor identitas & rekening pada teks bebas.
 * 16 digit dengan/tanpa pemisah → indikasi NIK/KK.
 * 10–16 digit berurutan → indikasi nomor rekening.
 */
export function scanSensitiveText(
  text: string,
  field?: string,
): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];
  if (!text) return findings;

  const matches = text.match(DIGIT_RUN) ?? [];
  let flaggedNik = false;
  let flaggedRekening = false;

  for (const match of matches) {
    const digits = digitsOnly(match);
    // Abaikan tahun tunggal / angka pendek yang ikut tertangkap regex.
    if (digits.length === 16) {
      if (!flaggedNik) {
        findings.push({
          kind: "nik",
          message:
            "Teks mengandung angka 16 digit yang menyerupai NIK/KK. Hapus nomor tersebut — BantuWarga tidak boleh menyimpan data pribadi.",
          field,
        });
        flaggedNik = true;
      }
      continue;
    }
    if (digits.length >= 10 && digits.length <= 16) {
      // Hindari positif palsu pada nominal rupiah (mis. "1.000.000") dan tanggal.
      const looksLikeNominal = /^\d{1,3}([.,]\d{3})+$/.test(match.trim()) && digits.length <= 9;
      if (!looksLikeNominal && !flaggedRekening) {
        findings.push({
          kind: "rekening",
          message:
            "Teks mengandung deretan angka 10–16 digit yang menyerupai nomor rekening/kartu. Hapus nomor tersebut.",
          field,
        });
        flaggedRekening = true;
      }
    }
  }

  return findings;
}

export type SensitiveScanField = { name: string; value: string | null | undefined };

/**
 * Memindai beberapa field sekaligus. Mengembalikan daftar temuan unik.
 */
export function scanSensitiveFields(
  fields: SensitiveScanField[],
): SensitiveFinding[] {
  const results: SensitiveFinding[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    if (!field.value) continue;
    for (const finding of scanSensitiveText(field.value, field.name)) {
      const key = `${finding.kind}:${finding.field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(finding);
    }
  }
  return results;
}

/** Pesan edukatif gabungan untuk ditampilkan pada UI/form. */
export function sensitiveScanUserMessage(findings: SensitiveFinding[]): string {
  if (findings.length === 0) return "";
  const kinds = new Set(findings.map((f) => f.kind));
  const parts: string[] = [];
  if (kinds.has("nik")) parts.push("nomor identitas (NIK/KK)");
  if (kinds.has("rekening")) parts.push("nomor rekening/kartu");
  if (kinds.has("telepon_pribadi")) parts.push("nomor telepon pribadi");
  return `Mohon periksa kembali isian Anda: terdeteksi ${parts.join(
    " dan ",
  )}. BantuWarga tidak boleh menyimpan data pribadi. Hapus angka tersebut dan jelaskan informasi secara umum saja.`;
}
