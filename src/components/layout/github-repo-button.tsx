import { Eye, GitFork, Star } from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";

/**
 * Badge statistik repo GitHub untuk navbar: bintang, fork, dan watcher —
 * diambil dari REST API publik GitHub saat render server, di-cache Data
 * Cache Next.js (`revalidate` 3600 detik) agar tidak menyentuh rate limit.
 *
 * Bila API gagal (rate limit/offline), badge dirender sebagai tautan polos
 * tanpa angka — lebih jujur daripada menampilkan nol palsu.
 */

const REPO_OWNER = "zann06";
const REPO_NAME = "AksesAI";
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

type GithubRepo = {
  stargazers_count?: number;
  forks_count?: number;
  subscribers_count?: number;
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

  const stats = repo
    ? [
        { icon: Star, label: "bintang", value: repo.stargazers_count ?? 0 },
        { icon: GitFork, label: "fork", value: repo.forks_count ?? 0 },
        { icon: Eye, label: "watcher", value: repo.subscribers_count ?? 0 },
      ]
    : null;

  const base =
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground";

  const statsMarkup = stats ? (
    <span className="flex items-center gap-2.5 border-l border-border pl-2.5 text-xs tabular-nums">
      {stats.map(({ icon: Icon, label, value }) => (
        <span key={label} className="flex items-center gap-1" title={`${value.toLocaleString("id-ID")} ${label}`}>
          <Icon className="size-3.5" aria-hidden="true" />
          {formatCount(value)}
          <span className="sr-only">{label}</span>
        </span>
      ))}
    </span>
  ) : null;

  const summary = repo
    ? `${repo.stargazers_count ?? 0} bintang, ${repo.forks_count ?? 0} fork, ${repo.subscribers_count ?? 0} watcher`
    : "buka di tab baru";

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Repo GitHub ${REPO_OWNER}/${REPO_NAME} — ${summary}`}
      title={`${summary} — buka di tab baru`}
      className={cn(base, "transition-colors hover:bg-surface hover:text-foreground", className)}
    >
      <GitHubIcon className="size-4 shrink-0" />
      <span className="hidden lg:inline">GitHub</span>
      {statsMarkup}
    </a>
  );
}
