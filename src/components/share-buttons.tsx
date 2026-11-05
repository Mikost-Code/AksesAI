"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Tombol bagikan tautan entri: salin tautan, WhatsApp, dan X.
 * Murni klien — tanpa backend; WhatsApp/X membuka jajakan resmi mereka
 * dengan teks yang sudah berisi tautan.
 */
export function ShareButtons({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = `${title} — via AksesAI`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API bisa ditolak (mis. tanpa HTTPS); fallback lama tetap
      // cukup untuk kasus langka ini.
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Share2 className="size-3.5" aria-hidden="true" />
        Bagikan info ini
      </p>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <Button size="sm" variant="secondary" onClick={copyLink} aria-live="polite">
          {copied ? (
            <>
              <Check className="size-4 text-accent" aria-hidden="true" />
              Tersalin
            </>
          ) : (
            <>
              <Link2 className="size-4" aria-hidden="true" />
              Salin
            </>
          )}
        </Button>
        <a
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Bagikan ke WhatsApp: ${title}`}
        >
          WhatsApp
        </a>
        <a
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Bagikan ke X: ${title}`}
        >
          X
        </a>
      </div>
    </div>
  );
}
