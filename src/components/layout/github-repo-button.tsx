import { Star } from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";

/**
 * Badge statistik repo GitHub (jumlah bintang) untuk navbar.
 *
 * Repo proyek ini publik, jadi badge menjadi tautan ke repo — kecuali API
 * GitHub gagal (rate limit/offline). Dalam kondisi itu badge dirender sebagai
 * elemen statis: menautkan ke repo tetap boleh, tetapi menampilkan angka nol
 * lalu mengarahkan orang ke halaman yang mungkin tidak bisa dibuka lebih buruk
 * daripada sekadar tidak menampilkan angka.
 *
 * Angka diambil dari REST API publik GitHub saat render server dan di-cache
 * Data Cache Next.js (`revalidate` 3600 detik).
 */

const REPO_OWNER = "zann06";
const REPO_NAME = "AksesAI";
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

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

export async function GithubRepoButton({ className = "" }: { className?: string }) {
  const repo = await fetchRepoStats();

  // Angka 0 diperlakukan sama dengan "tidak tersedia". Repo baru yang benar-
  // benar belum punya bintang tetap terwakili oleh tidak adanya angka —
  // menampilkan "0" hanya menambah kebisingan tanpa memberi informasi.
  const stars = repo?.stargazers_count;
  const showStars = typeof stars === "number" && stars > 0;

  const base =
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground";

  const inner = (
    <>
      <GitHubIcon className="size-4 shrink-0" />
      <span className="hidden lg:inline">GitHub</span>
      {showStars ? (
        <span className="flex items-center gap-1 border-l border-border pl-2 text-xs tabular-nums">
          <Star className="size-3.5" aria-hidden="true" />
          {formatCount(stars)}
        </span>
      ) : null}
    </>
  );

  if (!showStars) {
    // API gagal: badge tetap boleh ditautkan, tetapi tanpa angka.
    return (
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Repo GitHub ${REPO_OWNER}/${REPO_NAME} (buka di tab baru)`}
        className={cn(base, "hover:bg-surface hover:text-foreground", className)}
      >
        {inner}
      </a>
    );
  }

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Repo GitHub ${REPO_OWNER}/${REPO_NAME}, ${stars.toLocaleString("id-ID")} bintang (buka di tab baru)`}
      title={`${stars.toLocaleString("id-ID")} bintang di GitHub — bantu tambah satu`}
      className={cn(base, "hover:bg-surface hover:text-foreground", className)}
    >
      {inner}
    </a>
  );
}
