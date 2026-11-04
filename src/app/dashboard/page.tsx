import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FilePen,
  FilePlus2,
  Files,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { listOwnPrograms } from "@/lib/programs/own-programs";
import { formatDateID } from "@/lib/utils";

export const metadata: Metadata = { title: "Dasbor", robots: { index: false } };

export default async function DashboardHome() {
  const user = await getCurrentUser();
  if (!user) return null; // layout sudah redirect

  const programs = await listOwnPrograms(user.id);
  const verified = programs.filter((p) => p.status === "verified").length;
  const inReview = programs.filter((p) => p.status === "pending").length;
  const needsAction = programs.filter((p) => p.status === "needs_changes").length;
  const recent = programs.slice(0, 4);

  const stats = [
    { label: "Terverifikasi", value: verified, icon: CheckCircle2 },
    { label: "Dalam peninjauan", value: inReview, icon: Files },
    { label: "Perlu revisi", value: needsAction, icon: FilePen },
    { label: "Total kontribusi", value: programs.length, icon: Files },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, {user.githubUsername}</h1>
        <p className="mt-1 text-muted-foreground">
          Ringkasan kontribusi Anda. Setiap informasi diperiksa manusia sebelum
          diterbitkan.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <li key={stat.label}>
              <Card>
                <CardContent className="flex items-center gap-3 pt-5">
                  <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icon className="size-5" aria-hidden={true} />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold leading-none">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {needsAction > 0 ? (
        <div className="rounded-lg border border-warning/25 bg-warning-soft p-4 text-sm">
          <p className="font-medium">
            {needsAction} kontribusi memerlukan perbaikan dari Anda.
          </p>
          <Link
            href="/dashboard/kontribusi"
            className="mt-1 inline-flex items-center gap-1 text-primary underline"
          >
            Lihat dan perbaiki
            <ArrowRight className="size-3.5" aria-hidden={true} />
          </Link>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Kontribusi terbaru</CardTitle>
          <Link href="/dashboard/kontribusi" className="text-sm text-primary hover:underline">
            Lihat semua
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length > 0 ? (
            <ul className="divide-y divide-border">
              {recent.map((program) => (
                <li key={program.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/kontribusi/${program.id}`}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {program.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {program.categoryName} · {program.accessTypeLabel} · diperbarui{" "}
                      {formatDateID(program.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={program.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                Anda belum membagikan informasi apa pun. Temukan pengumuman resmi
                dan bagikan dengan sumbernya.
              </p>
              <Link href="/dashboard/kontribusi/baru" className={buttonVariants({ size: "sm" })}>
                <FilePlus2 className="size-4" aria-hidden={true} />
                Bagikan informasi pertama
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
