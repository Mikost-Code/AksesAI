import { TrendingDown, TrendingUp } from "lucide-react";

import type { PriceHistoryEntry } from "@/lib/programs/detail";
import { formatDateID } from "@/lib/utils";

/**
 * Riwayat harga ringkas (migrasi 0013, `program_price_history`).
 *
 * Menampilkan hanya perubahan yang BERARTI: setiap baris adalah snapshot yang
 * dicatat trigger saat harga/kuota berubah (atau saat verifikasi ulang).
 * Titik pertama (terbaru) diberi label "Saat ini" agar pembaca tidak
 * mengira itu riwayat lama.
 *
 * Harga yang tidak ditampilkan provider dibiarkan kosong, bukan "—", agar
 * konsisten dengan tabel spesifikasi di halaman yang sama.
 */

/** Format USD per 1 juta token; `null` = tidak tercantum. */
function priceLabel(value: number | null): string {
  if (value === null) return "Tidak tercantum";
  if (value === 0) return "Gratis";
  return `$${value.toFixed(2)}`;
}

/** Senyap bila tidak ada riwayat (mis. migrasi belum dijalankan). */
export function PriceHistory({ history }: { history: PriceHistoryEntry[] }) {
  if (history.length === 0) return null;

  // Hanya tampilkan bila memang ada perubahan: satu baris berarti hanya
  // snapshot awal dan tidak ada gunanya sebagai "riwayat".
  if (history.length === 1) return null;

  return (
    <details className="mt-4 rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer list-inside p-3 text-sm font-medium">
        Riwayat perubahan harga ({history.length} catatan)
      </summary>
      <ol className="flex flex-col gap-2 border-t border-border p-3">
        {history.map((entry, index) => {
          const previous = history[index + 1];
          const inputDelta =
            previous && entry.priceInputPerMtok !== previous.priceInputPerMtok
              ? {
                  from: previous.priceInputPerMtok,
                  to: entry.priceInputPerMtok,
                }
              : null;
          const outputDelta =
            previous && entry.priceOutputPerMtok !== previous.priceOutputPerMtok
              ? {
                  from: previous.priceOutputPerMtok,
                  to: entry.priceOutputPerMtok,
                }
              : null;

          return (
            <li key={`${entry.recordedAt}-${index}`} className="text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">
                  {index === 0 ? "Saat ini" : (formatDateID(entry.recordedAt) ?? entry.recordedAt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Input {priceLabel(entry.priceInputPerMtok)} · Output{" "}
                  {priceLabel(entry.priceOutputPerMtok)}
                  {entry.freeTierAvailable ? " · ada free tier" : " · tanpa free tier"}
                </span>
              </div>
              {inputDelta || outputDelta ? (
                <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {inputDelta ? (
                    <DeltaLine label="Input" from={inputDelta.from} to={inputDelta.to} />
                  ) : null}
                  {outputDelta ? (
                    <DeltaLine label="Output" from={outputDelta.from} to={outputDelta.to} />
                  ) : null}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function DeltaLine({
  label,
  from,
  to,
}: {
  label: string;
  from: number | null;
  to: number | null;
}) {
  // Nilai `null` tidak dapat dibandingkan (tidak diketahui); tampilkan panah
  // netral agar tidak salah klaim harga naik/turun.
  const known = from !== null && to !== null;
  const up = known && to! > from!;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <li className="flex items-center gap-1">
      {known ? (
        <Icon
          className={`size-3 ${up ? "text-warning" : "text-accent"}`}
          aria-hidden="true"
        />
      ) : null}
      <span>
        {label}: {priceLabel(from)} → {priceLabel(to)}
      </span>
    </li>
  );
}
