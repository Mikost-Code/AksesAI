import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, BadgeCheck, CheckCircle2, ExternalLink, FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ProgramCard } from "@/components/program-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getContributor } from "@/lib/programs/contributors";
import { formatDateID } from "@/lib/utils";

const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  if (!USERNAME_PATTERN.test(username)) return { title: "Kontributor tidak ditemukan" };
  const profile = await getContributor(username);
  if (!profile) {
    return { title: "Kontributor tidak ditemukan", robots: { index: false } };
  }
  return {
    title: `Kontributor ${profile.username}`,
    description: `Profil publik ${profile.username}: ${profile.totalVerified} info AI gratis & murah terverifikasi di AksesAI.`,
  };
}

export default async function ContributorPage({ params }: PageProps) {
  const { username } = await params;
  if (!USERNAME_PATTERN.test(username)) notFound();

  const profile = await getContributor(username);
  if (!profile) notFound();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start">
          {profile.avatar ? (
            <Image
              src={profile.avatar}
              alt={`Avatar ${profile.username}`}
              width={72}
              height={72}
              className="size-16 rounded-full sm:size-[72px]"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
              {profile.username.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.username}</h1>
              <Badge
                variant={profile.badge.key === "baru" ? "neutral" : "success"}
                title={
                  profile.badge.nextThreshold
                    ? `Terverifikasi ${profile.totalVerified} dari ${profile.badge.nextThreshold} untuk jenjang berikutnya`
                    : "Jenjang tertinggi"
                }
              >
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {profile.badge.label}
              </Badge>
              {profile.url ? (
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="inline-flex items-center gap-1 text-sm text-primary underline"
                >
                  Profil GitHub
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(membuka tab baru)</span>
                </a>
              ) : null}
            </div>
            {profile.bio ? (
              <p className="mt-2 max-w-2xl text-sm text-foreground/85">{profile.bio}</p>
            ) : null}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Bergabung {formatDateID(profile.joinedAt)}
            </p>
          </div>
          <dl className="flex gap-6 sm:flex-col sm:gap-3">
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="size-3.5" aria-hidden="true" />
                Total kontribusi
              </dt>
              <dd className="text-xl font-semibold">{profile.totalContributions}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Terverifikasi
              </dt>
              <dd className="text-xl font-semibold">{profile.totalVerified}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Kontribusi publik</h2>
        <Badge variant="neutral">Hanya status publik</Badge>
      </div>

      {profile.programs.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.programs.map((program) => (
            <li key={program.id}>
              <ProgramCard program={program} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="Belum ada kontribusi publik"
            description="Kontribusi yang sudah terverifikasi atau kedaluwarsa akan tampil di sini. Kontribusi yang masih dalam peninjauan bersifat privat."
          />
        </div>
      )}
    </div>
  );
}
