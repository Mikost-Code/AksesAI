"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  Compass,
  FilePlus2,
  Files,
  Flag,
  Gauge,
  Globe,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  ShieldUser,
  Users,
} from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";
import { resolveActiveHref } from "@/lib/nav";
import { formatBadgeCount } from "@/lib/nav-badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type AccountMenuUser = {
  githubUsername: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isReviewer: boolean;
  unread: number;
};

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badge?: number;
  /**
   * `true` bila item ini HANYA boleh aktif saat path sama persis.
   *
   * Dulu properti ini bernama `nested` dan semantiknya kebalik: ia hanya
   * mematikan pencocokan turunan, sehingga induk (mis. `/dashboard`) tetap
   * ikut menyala di seluruh sub-halaman. Bersama `resolveActiveHref`,
   * `exact` kini berarti "jangan pernah cocok lewat prefix".
   */
  exact?: boolean;
  /** `true` untuk aksi utama yang ingin ditonjolkan (mis. "Bagikan informasi"). */
  emphasize?: boolean;
};

/**
 * Menu akun (dropdown) untuk navbar.
 *
 * Mengapa dropdown dan bukan deretan tombol: navbar sebelumnya menampung
 * lonceng + Dasbor + Area staf + Keluar berdampingan dengan menu utama dan
 * badge GitHub. Pada lebar 1024–1280px itu mendorong logo dan menu saling
 * berhimpitan, dan di layar lebih kecil "Area staf" terpotong. Satu tombol
 * avatar memuat semuanya tanpa memakan lebar tambahan.
 *
 * Aksesibilitas: `aria-expanded` + `aria-controls` pada pemicu, `role="menu"`
 * pada panel, serta tutup via Escape, klik di luar, atau perpindahan rute.
 * Semua item tetap berupa tautan biasa sehingga navigasi keyboard dan klik
 * tengah tetap berfungsi seperti biasa.
 */
export function AccountMenu({
  user,
  className,
}: {
  user: AccountMenuUser;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Tutup saat rute berubah — tanpa ini panel tetap terbuka menutupi halaman
  // baru setelah pengguna memilih salah satu tautan.
  //
  // Ditutup lewat `onClick` tiap tautan, BUKAN `useEffect([pathname])`:
  // setState di dalam effect memicu render berantai dan ditolak aturan
  // react-hooks/set-state-in-effect. Klik adalah peristiwa pengguna, jadi
  // memperbarui state di sana adalah wajar dan langsung.
  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Item yang selalu ada bagi pengguna login.
  const utama: MenuItem[] = [
    // `exact`: tanpa ini "Ringkasan" menyala di SEMUA halaman dasbor
    // (termasuk /dashboard/kontribusi/baru) karena `/dashboard` adalah prefix
    // dari semuanya.
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/kontribusi", label: "Kontribusi saya", icon: Files },
    {
      href: "/dashboard/kontribusi/baru",
      label: "Bagikan informasi",
      icon: FilePlus2,
      // Berada di bawah /dashboard/kontribusi secara URL, tetapi secara menu
      // adalah tujuan tersendiri. `exact` membuatnya tidak menyerap
      // /dashboard/kontribusi/abc-123, dan (lewat longest-prefix) membuatnya
      // menang atas induknya saat halaman ini dibuka.
      exact: true,
      // Aksi utama yang kita harapkan dilakukan pengguna login.
      emphasize: true,
    },
    { href: "/dashboard/laporan", label: "Laporan saya", icon: Flag },
    {
      href: "/dashboard/notifikasi",
      label: "Notifikasi",
      icon: Bell,
      badge: user.unread,
    },
  ];

  // Item staf hanya dirender bila role dimiliki. Ini murni UX — penegakan
  // akses sebenarnya ada di layout area staf dan RPC masing-masing.
  //
  // Admin mendapat 4 item (Antrean review, Laporan masuk, Panel admin,
  // Pengguna & role, Kategori, Audit log). Enam baris + 5 item utama + 3 item
  // bawah = panel setinggi ~570px yang pada laptop 13" menutupi seluruh layar.
  // Karena itu item yang jarang dipakai saat mengerjakan tugas harian
  // (Pengguna & role, Kategori, Audit log) diletakkan di sub-grup "Pengaturan"
  // agar mata langsung menemukan tiga aksi utama.
  const staf: MenuItem[] = [];
  // Super admin selalu melihat antrean review, bahkan bila role `reviewer`
  // tidak tercatat eksplisit — ia memang mewarisi semua akses staf. Tanpa ini
  // menu akun pemilik tampak tidak punya jalan ke antrean padahal halamannya
  // bisa dibuka.
  if (user.isReviewer || user.isSuperAdmin) {
    staf.push({ href: "/review", label: "Antrean review", icon: ShieldAlert });
  }
  if (user.isModerator) {
    staf.push({ href: "/moderation/reports", label: "Laporan masuk", icon: Flag });
  }
  if (user.isAdmin) {
    // `exact`: halaman anak admin (pengguna, kategori, audit, program) punya
    // item sendiri. Tanpa ini "Panel admin" ikut tersorot di semua halaman anak.
    staf.push({ href: "/admin", label: "Panel admin", icon: Gauge, exact: true });
    staf.push({
      href: "/admin/program",
      label: "Program & masa berlaku",
      icon: CalendarClock,
    });
  }

  const stafPengaturan: MenuItem[] = [];
  if (user.isAdmin) {
    stafPengaturan.push({ href: "/admin/pengguna", label: "Pengguna & role", icon: Users });
    stafPengaturan.push({ href: "/admin/kategori", label: "Kategori", icon: Settings });
    stafPengaturan.push({ href: "/admin/audit", label: "Audit log", icon: ScrollText });
  }

  const roleLabel = user.isSuperAdmin
    ? "Super Admin"
    : user.isAdmin
      ? "Admin"
      : user.isModerator
        ? "Moderator"
        : user.isReviewer
          ? "Reviewer"
          : "Kontributor";

  const initial = user.githubUsername.slice(0, 1).toUpperCase();

  /**
   * Satu-satunya item yang dianggap aktif, dihitung dari SELURUH item menu.
   *
   * Dulu tiap item diuji sendiri-sendiri dengan `startsWith`, sehingga di
   * `/dashboard/kontribusi/baru` tiga item menyala sekaligus (Ringkasan,
   * Kontribusi saya, Bagikan informasi). `resolveActiveHref` memilih prefix
   * terpanjang sehingga tepat satu item menang — aturan yang sama dengan
   * navigasi utama dan sidebar dasbor.
   */
  const activeHref = resolveActiveHref(pathname, [
    ...utama,
    ...staf,
    ...stafPengaturan,
  ]);

  function renderItem(item: MenuItem) {
    const Icon = item.icon;
    const active = item.href === activeHref;
    return (
      <Link
        key={item.href}
        href={item.href}
        role="menuitem"
        onClick={closeMenu}
        aria-current={
          active
            ? // `page` hanya bila path persis sama; untuk turunan (mis. halaman
              // detail kontribusi) nilai yang benar adalah `true` — pembaca
              // layar akan membacanya sebagai "lokasi saat ini", bukan "halaman
              // ini". Sebelumnya selalu `page`, yang kurang tepat untuk
              // /dashboard/kontribusi/abc-123 yang mengaktifkan /dashboard/kontribusi.
              pathname === item.href
              ? "page"
              : "true"
            : undefined
        }
        className={cn(
          "group/item flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors",
          "hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground",
          active
            ? "bg-primary-soft font-medium text-primary"
            : item.emphasize
              ? // Aksi utama (Bagikan informasi): tegas lewat warna, tanpa
                // latar penuh agar tidak bersaing dengan item yang sedang aktif.
                "font-medium text-primary hover:bg-primary-soft/60"
              : "text-muted-foreground",
        )}
      >
        <Icon
          className={cn("size-4 shrink-0", item.emphasize && !active && "text-primary")}
          aria-hidden={true}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {formatBadgeCount(item.badge) !== null ? (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground tabular-nums">
            {formatBadgeCount(item.badge)}
          </span>
        ) : null}
      </Link>
    );
  }

  /**
   * Judul grup. Memakai ikon yang sama ukurannya dengan ikon item agar
   * deretan kiri panel tetap lurus — sebelumnya tiga judul grup tampil tanpa
   * ikon di antara 12+ baris berikon, dan mata membacanya sebagai "bolong".
   */
  function renderGroupHeading(
    label: string,
    Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>,
  ) {
    return (
      <p className="flex items-center gap-2.5 px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden={true} />
        {label}
      </p>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu-panel"
        aria-label={`Menu akun ${user.githubUsername} (${roleLabel})`}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border border-border pl-1 pr-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors",
          "hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "bg-surface text-foreground",
        )}
      >
        {user.avatarUrl ? (
          // Avatar GitHub berukuran kecil; <img> biasa menghindari kebutuhan
          // mengonfigurasi domain gambar di next.config untuk setiap user.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 rounded-full ring-1 ring-border"
          />
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {initial}
          </span>
        )}
        <span className="hidden max-w-24 truncate lg:inline">{user.githubUsername}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        /*
         * Panel bisa lebih tinggi dari layar (13 item untuk super admin), jadi
         * ia perlu di-scroll. Masalahnya: tanpa penanda, pengguna tidak tahu
         * masih ada isi di bawah ("Audit log", "Keluar").
         *
         * Solusi: pembungkus `relative` + bayangan atas/bawah yang menempel
         * pada tepi panel (bukan ikut ter-scroll) dan HANYA muncul saat masih
         * ada isi tersembunyi. `overflow-y-auto` tetap di elemen dalam karena
         * `position: sticky` pada pseudo-elemen akan terpotong oleh container
         * yang sama. Karena itu dipakai dua lapisan: pembungkus (posisi) dan
         * panel (scroll).
         */
        <div
          id="account-menu-panel"
          role="menu"
          aria-label="Menu akun"
          className="account-menu-shell absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 origin-top-right rounded-xl border border-border bg-background p-1.5 shadow-[var(--shadow-elevated)] animate-[var(--animate-menu-in)]"
        >
          <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain">
          {/* Identitas: nama + peran. Peran dibaca dari database, bukan klaim klien. */}
          <div className="flex items-center gap-2.5 border-b border-border px-2.5 pb-2.5 pt-1.5">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full ring-1 ring-border"
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.githubUsername}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {roleLabel}
                {user.isSuperAdmin ? (
                  <span className="rounded-full bg-violet-soft px-1.5 py-0.5 text-[10px] font-semibold leading-none text-violet">
                    Pemilik
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="py-1">{utama.map(renderItem)}</div>

          {/*
            Jalan pulang. Tanpa ini pengguna yang sedang di dasbor atau area
            staf tidak punya tautan eksplisit kembali ke direktori publik —
            satu-satunya cara adalah menebak lewat logo.

            Dulu blok ini diberi `border-t` SENDIRI sementara grup berikutnya
            juga memberi `border-t`, sehingga muncul dua garis yang mengapit
            satu item dan membuatnya tampak seperti kotak terkurung.

            Lalu label "PUBLIK" di kanan item dihapus karena membingungkan.
            Ternyata itu menimbulkan masalah baru: tanpa pemisah, "Jelajahi
            direktori" menempel langsung ke judul "Area staf" sehingga terbaca
            seolah bagian dari area staf.

            Penyelesaiannya: jadikan ia grup tersendiri dengan judul
            "Halaman publik" — sejajar dengan "Area staf" dan "Pengaturan".
            Struktur jadi konsisten (judul grup + satu item), dan garis
            pemisah muncul otomatis lewat `border-t` milik grup ini.
          */}
          <div className="border-t border-border pt-1">
            {renderGroupHeading("Halaman publik", Globe)}
            <div className="pb-1">
              <Link
                href="/info"
                role="menuitem"
                onClick={closeMenu}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground"
              >
                <Compass className="size-4 shrink-0" aria-hidden={true} />
                <span className="flex-1 truncate">Jelajahi direktori</span>
              </Link>
            </div>
          </div>

          {staf.length > 0 ? (
            <>
              <div className="border-t border-border" />
              {renderGroupHeading("Area staf", ShieldUser)}
              <div className="pb-1">{staf.map(renderItem)}</div>
            </>
          ) : null}

          {stafPengaturan.length > 0 ? (
            <>
              <div className="border-t border-border" />
              {renderGroupHeading("Pengaturan", SlidersHorizontal)}
              <div className="pb-1">{stafPengaturan.map(renderItem)}</div>
            </>
          ) : null}

          <div className="border-t border-border pt-1">
            <a
              href={`https://github.com/${user.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground"
            >
              <GitHubIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">Profil GitHub</span>
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={pending}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft focus-visible:text-danger disabled:opacity-50"
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              {pending ? "Keluar…" : "Keluar"}
            </button>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
