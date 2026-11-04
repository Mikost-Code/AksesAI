import { Eye, GitFork, Star } from "lucide-react";
import Link from "next/link";

/**
 * Badge statistik repo GitHub (star, fork, watch) untuk navbar.
 *
 * Data diambil dari REST API publik GitHub saat render server. Response
 * di-cache oleh Data Cache Next.js (`revalidate` 3600 detik), jadi request
 * berulang tidak memukul API GitHub. Bila API gagal/rate-limited (mis. saat
 * build statis tanpa jaringan), komponen dirender sebagai tautan polos
 * tanpa angka — halaman tidak pernah gagal karena badge ini.
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
      <GithubIcon className="size-4 shrink-0" />
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

function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
