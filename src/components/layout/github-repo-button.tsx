import { Star } from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";

/**
 * Badge statistik repo GitHub (jumlah bintang) untuk navbar.
 *
 * SENGAJA BUKAN TAUTAN — hanya penanda, bukan jalan masuk ke repo. Repo
 * proyek ini bersifat privat, sehingga tautan ke sana akan berakhir 404 dan
 * mengundang orang mengira tautannya rusak. Bila kelak repo dipublikasikan
 * lagi, badge ini bisa dijadikan `<a>` tanpa mengubah bagian lain.
 *
 * Data diambil dari REST API publik GitHub saat render server. Response
 * di-cache oleh Data Cache Next.js (`revalidate` 3600 detik), jadi request
 * berulang tidak memukul API GitHub.
 *
 * Bila API gagal/rate-limited ATAU repo privat (GitHub membalas 404), komponen
 * TIDAK menampilkan angka nol — nol akan terbaca sebagai "repo tidak punya
 * bintang", padahal artinya "angkanya tidak tersedia". Dalam kondisi itu bagian
 * statistik dihilangkan dan hanya ikon penanda yang tampil.
 */

const REPO_OWNER = "zann06";
const REPO_NAME = "AksesAI";

type GithubRepo = {
  stargazers_count?: number;
};

async function fetchRepoStats(): Promise<GithubRepo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as GithubRepo;
  } catch {
    return null;
  }
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/**
 * `div`, bukan `span`, karena badge bukan lagi elemen interaktif dan tidak
 * berada di dalam paragraf/tautan mana pun.
 */
export async function GithubRepoButton({ className = "" }: { className?: string }) {
  const repo = await fetchRepoStats();
  const stars = repo?.stargazers_count;

  return (
    <div
      // `select-none` + kursor normal menegaskan badge ini hanya informasi.
      aria-label={
        stars === undefined
          ? "Proyek sumber terbuka di GitHub"
          : `Proyek sumber terbuka di GitHub, ${stars.toLocaleString("id-ID")} bintang`
      }
      title={
        stars === undefined
          ? "Repo GitHub proyek ini tidak tersedia untuk publik"
          : `${stars.toLocaleString("id-ID")} bintang di GitHub`
      }
      className={cn(
        "inline-flex h-8 cursor-default select-none items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      <GitHubIcon className="size-4 shrink-0" />
      <span className="hidden lg:inline">GitHub</span>
      {stars !== undefined ? (
        <span className="flex items-center gap-2 border-l border-border pl-2 text-xs tabular-nums">
          <Star className="size-3.5" aria-hidden="true" />
          {formatCount(stars)}
        </span>
      ) : null}
    </div>
  );
}
