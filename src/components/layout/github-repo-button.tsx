import { Eye, GitFork, Star } from "lucide-react";
import Link from "next/link";

import { GitHubIcon } from "@/components/icons/github-icon";

/**
 * Badge statistik repo GitHub (star, fork, watch) untuk navbar.
 *
 * Data diambil dari REST API publik GitHub saat render server. Response
 * di-cache oleh Data Cache Next.js (`revalidate` 3600 detik), jadi request
 * berulang tidak memukul API GitHub. Bila API gagal/rate-limited (mis. saat
 * build statis tanpa jaringan), komponen dirender sebagai tautan polos
 * tanpa angka â€” halaman tidak pernah gagal karena badge ini.
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

function Metric({ icon, value, label }: { icon: React.ReactNode; value?: number; label: string }) {
  if (value === undefined) return null;
  return (
    <span
      className="inline-flex items-center gap-1 tabular-nums"
      title={`${label}: ${value.toLocaleString("id-ID")}`}
    >
      {icon}
      {formatCount(value)}
    </span>
  );
}

export async function GithubRepoButton({ className = "" }: { className?: string }) {
  const repo = await fetchRepoStats();

  return (
    <Link
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Repo GitHub ${REPO_OWNER}/${REPO_NAME} (buka di tab baru)`}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground ${className}`}
    >
      <GitHubIcon className="size-4 shrink-0" />
      <span className="hidden lg:inline">GitHub</span>
      {repo ? (
        <span className="flex items-center gap-2 border-l border-border pl-2 text-xs">
          <Metric
            icon={<Star className="size-3.5" aria-hidden="true" />}
            value={repo.stargazers_count}
            label="Star"
          />
          <Metric
            icon={<GitFork className="size-3.5" aria-hidden="true" />}
            value={repo.forks_count}
            label="Fork"
          />
          <Metric
            icon={<Eye className="size-3.5" aria-hidden="true" />}
            value={repo.subscribers_count}
            label="Watcher"
          />
        </span>
      ) : null}
    </Link>
  );
}
