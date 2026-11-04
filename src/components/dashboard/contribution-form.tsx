"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCESS_TYPES,
  ACCESS_TYPE_DESCRIPTION,
  ACCESS_TYPE_LABEL,
  CONTRIBUTION_LIMITS,
  SENSITIVE_DATA_WARNING,
  SOURCE_TYPES,
  SOURCE_TYPE_LABEL,
} from "@/lib/constants/labels";
import { saveAndSubmit, saveDraft, type ActionResult } from "@/app/dashboard/kontribusi/actions";

export type ContributionFormValues = {
  title: string;
  description: string;
  categoryId: string;
  accessType: (typeof ACCESS_TYPES)[number];
  provider: string;
  freeTier: string;
  freeTierAvailable: boolean;
  requiresCard: boolean;
  priceInputPerMtok: string;
  priceOutputPerMtok: string;
  rateLimitRpm: string;
  contextWindow: string;
  requirements: string;
  promoStart: string;
  promoEnd: string;
  contributorNote: string;
  sources: Array<{
    url: string;
    title: string;
    type: (typeof SOURCE_TYPES)[number];
    isPrimary: boolean;
  }>;
};

const L = CONTRIBUTION_LIMITS;

export const EMPTY_CONTRIBUTION: ContributionFormValues = {
  title: "",
  description: "",
  categoryId: "",
  accessType: "api",
  provider: "",
  freeTier: "",
  freeTierAvailable: true,
  requiresCard: false,
  priceInputPerMtok: "",
  priceOutputPerMtok: "",
  rateLimitRpm: "",
  contextWindow: "",
  requirements: "",
  promoStart: "",
  promoEnd: "",
  contributorNote: "",
  sources: [{ url: "", title: "", type: "dokumentasi_resmi", isPrimary: true }],
};

function toRaw(values: ContributionFormValues) {
  return {
    title: values.title,
    description: values.description,
    categoryId: values.categoryId,
    accessType: values.accessType,
    provider: values.provider,
    freeTier: values.freeTier || null,
    freeTierAvailable: values.freeTierAvailable,
    requiresCard: values.requiresCard,
    priceInputPerMtok: values.priceInputPerMtok || null,
    priceOutputPerMtok: values.priceOutputPerMtok || null,
    rateLimitRpm: values.rateLimitRpm || null,
    contextWindow: values.contextWindow || null,
    requirements: values.requirements || undefined,
    promoStart: values.promoStart || null,
    promoEnd: values.promoEnd || null,
    contributorNote: values.contributorNote || undefined,
    sources: values.sources.map((s) => ({
      url: s.url,
      title: s.title || undefined,
      type: s.type,
      isPrimary: s.isPrimary,
    })),
  };
}

export function ContributionForm({
  mode,
  programId,
  initialValues,
  categories,
  duplicates,
}: {
  mode: "create" | "edit";
  programId: string | null;
  initialValues: ContributionFormValues;
  categories: Array<{ id: string; name: string }>;
  duplicates?: Array<{ slug: string; title: string; reason: "judul" | "sumber" }>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ContributionFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"draft" | "submit" | null>(null);

  function set<K extends keyof ContributionFormValues>(key: K, value: ContributionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function setSource(index: number, patch: Partial<ContributionFormValues["sources"][number]>) {
    setValues((prev) => ({
      ...prev,
      sources: prev.sources.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addSource() {
    if (values.sources.length >= L.sourcesMax) return;
    setValues((prev) => ({
      ...prev,
      sources: [
        ...prev.sources,
        { url: "", title: "", type: "dokumentasi_resmi", isPrimary: false },
      ],
    }));
  }

  function removeSource(index: number) {
    if (values.sources.length <= L.sourcesMin) return;
    setValues((prev) => {
      const next = prev.sources.filter((_, i) => i !== index);
      // Pastikan tetap ada sumber utama.
      if (!next.some((s) => s.isPrimary) && next[0]) next[0] = { ...next[0], isPrimary: true };
      return { ...prev, sources: next };
    });
  }

  function markPrimary(index: number) {
    setValues((prev) => ({
      ...prev,
      sources: prev.sources.map((s, i) => ({ ...s, isPrimary: i === index })),
    }));
  }

  function handleResult(
    result: ActionResult,
    onSuccess: (success: Extract<ActionResult, { ok: true }>) => void,
  ) {
    if (result.ok) {
      onSuccess(result);
      return;
    }
    setFormError(result.message);
    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    setPendingAction(null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = action?.value === "submit" ? "submit" : "draft";
    setPendingAction(intent);

    startTransition(async () => {
      const raw = toRaw(values);
      const result =
        intent === "submit"
          ? await saveAndSubmit(programId, raw)
          : await saveDraft(programId, raw);

      handleResult(result, (success) => {
        if (intent === "submit") {
          router.push("/dashboard/kontribusi?status=pending");
          router.refresh();
          return;
        }
        setNotice(success.message ?? "Draf tersimpan.");
        setPendingAction(null);
        // Arahkan ke mode edit untuk draf yang baru dibuat.
        if (!programId && success.programId) {
          router.push(`/dashboard/kontribusi/${success.programId}`);
          router.refresh();
        } else {
          router.refresh();
        }
      });
    });
  }

  const busy = pending || pendingAction !== null;
  const isEditing = mode === "edit";
  const showPrice = values.accessType === "api" || values.accessType === "model";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="rounded-lg border border-warning/25 bg-warning-soft p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden={true} />
          <p>{SENSITIVE_DATA_WARNING}</p>
        </div>
      </div>

      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger-soft p-4 text-sm"
        >
          {formError}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="rounded-lg border border-accent/25 bg-accent-soft p-4 text-sm">
          {notice}
        </div>
      ) : null}

      {duplicates && duplicates.length > 0 ? (
        <div className="rounded-lg border border-info/20 bg-info-soft p-4 text-sm">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden={true} />
            <div>
              <p className="font-medium">Mungkin sudah ada informasi serupa:</p>
              <ul className="mt-1 list-disc pl-5">
                {duplicates.map((d) => (
                  <li key={d.slug}>
                    <a
                      href={`/info/${d.slug}`}
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {d.title}
                    </a>{" "}
                    <span className="text-muted-foreground">
                      ({d.reason === "sumber" ? "sumber sama" : "judul mirip"})
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-muted-foreground">
                Bila informasi ini berbeda atau lebih baru, lanjutkan. Bila sama,
                tidak perlu mengirim ulang.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- Informasi utama --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <h2 className="text-base font-semibold">Informasi entri</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title" required>
            Judul
          </Label>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={L.titleMax}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby="title-hint title-error"
            placeholder="Contoh: Groq API — free tier 30 request/menit untuk model Llama 3.3"
            required
          />
          <FieldHint id="title-hint">
            {values.title.length}/{L.titleMax} karakter. Sebutkan provider dan benefitnya.
          </FieldHint>
          <FieldError id="title-error" message={fieldErrors.title} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description" required>
            Deskripsi
          </Label>
          <Textarea
            id="description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={L.descriptionMax}
            rows={7}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby="description-hint description-error"
            placeholder="Jelaskan apa yang ditawarkan provider, cara mendaftar, dan hal penting lain sesuai sumber."
            required
          />
          <FieldHint id="description-hint">
            {values.description.length}/{L.descriptionMax} karakter (minimal {L.descriptionMin}).
            Jangan mengarang informasi yang tidak ada di sumber.
          </FieldHint>
          <FieldError id="description-error" message={fieldErrors.description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category" required>
              Kategori
            </Label>
            <select
              id="category"
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              aria-invalid={Boolean(fieldErrors.categoryId)}
              aria-describedby="category-error"
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              required
            >
              <option value="">Pilih kategori…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError id="category-error" message={fieldErrors.categoryId} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider" required>
              Provider
            </Label>
            <Input
              id="provider"
              value={values.provider}
              onChange={(e) => set("provider", e.target.value)}
              maxLength={L.providerMax}
              aria-invalid={Boolean(fieldErrors.provider)}
              aria-describedby="provider-error"
              placeholder="Mis. Groq, OpenRouter, Google AI Studio, Hugging Face"
              required
            />
            <FieldError id="provider-error" message={fieldErrors.provider} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requirements">Syarat mengakses</Label>
          <Textarea
            id="requirements"
            value={values.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            maxLength={L.requirementsMax}
            rows={4}
            aria-invalid={Boolean(fieldErrors.requirements)}
            aria-describedby="requirements-hint requirements-error"
            placeholder="Mis. perlu verifikasi nomor HP, verifikasi email kampus, atau kartu kredit untuk aktivasi."
          />
          <FieldHint id="requirements-hint">
            Opsional. Maksimal {L.requirementsMax} karakter.
          </FieldHint>
          <FieldError id="requirements-error" message={fieldErrors.requirements} />
        </div>
      </section>

      {/* --- Jenis akses --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <div>
          <h2 className="text-base font-semibold">Jenis akses</h2>
          <p className="text-sm text-muted-foreground">
            Bagaimana cara orang memakai penawaran ini.
          </p>
        </div>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Jenis akses">
          {ACCESS_TYPES.map((type) => (
            <label
              key={type}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm",
                values.accessType === type
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-background",
              ].join(" ")}
            >
              <input
                type="radio"
                name="accessType"
                value={type}
                checked={values.accessType === type}
                onChange={() => set("accessType", type)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{ACCESS_TYPE_LABEL[type]}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {ACCESS_TYPE_DESCRIPTION[type]}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="accessType-error" message={fieldErrors.accessType} />
      </section>

      {/* --- Kuota gratis --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <h2 className="text-base font-semibold">Kuota gratis</h2>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.freeTierAvailable}
            onChange={(e) => set("freeTierAvailable", e.target.checked)}
          />
          Ada free tier / kredit gratis
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.requiresCard}
            onChange={(e) => set("requiresCard", e.target.checked)}
          />
          Perlu kartu kredit untuk mendaftar
        </label>

        {values.freeTierAvailable ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="freeTier">Besaran kuota gratis</Label>
            <Textarea
              id="freeTier"
              value={values.freeTier}
              onChange={(e) => set("freeTier", e.target.value)}
              maxLength={L.freeTierMax}
              rows={3}
              aria-invalid={Boolean(fieldErrors.freeTier)}
              aria-describedby="freeTier-hint freeTier-error"
              placeholder="Mis. Kredit $5 selama 3 bulan, 30 request/menit, 1 juta token/bulan."
            />
            <FieldHint id="freeTier-hint">
              Opsional. Maksimal {L.freeTierMax} karakter. Tulis apa adanya dari halaman resmi.
            </FieldHint>
            <FieldError id="freeTier-error" message={fieldErrors.freeTier} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Entri ini akan ditandai sebagai penawaran berbayar/murah tanpa free tier.
          </p>
        )}
      </section>

      {/* --- Harga & limit --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <div>
          <h2 className="text-base font-semibold">Harga & limit (opsional)</h2>
          <p className="text-sm text-muted-foreground">
            Isi bila tercantum di halaman harga resmi. Kosongkan bila tidak diketahui.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceInputPerMtok">Harga input / 1 juta token (USD)</Label>
            <Input
              id="priceInputPerMtok"
              inputMode="decimal"
              value={values.priceInputPerMtok}
              onChange={(e) => set("priceInputPerMtok", e.target.value)}
              aria-invalid={Boolean(fieldErrors.priceInputPerMtok)}
              aria-describedby="priceInputPerMtok-error"
              placeholder="Mis. 0.15"
            />
            <FieldError id="priceInputPerMtok-error" message={fieldErrors.priceInputPerMtok} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceOutputPerMtok">Harga output / 1 juta token (USD)</Label>
            <Input
              id="priceOutputPerMtok"
              inputMode="decimal"
              value={values.priceOutputPerMtok}
              onChange={(e) => set("priceOutputPerMtok", e.target.value)}
              aria-invalid={Boolean(fieldErrors.priceOutputPerMtok)}
              aria-describedby="priceOutputPerMtok-error"
              placeholder="Mis. 0.60"
            />
            <FieldError id="priceOutputPerMtok-error" message={fieldErrors.priceOutputPerMtok} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rateLimitRpm">Rate limit (request/menit)</Label>
            <Input
              id="rateLimitRpm"
              inputMode="numeric"
              value={values.rateLimitRpm}
              onChange={(e) => set("rateLimitRpm", e.target.value)}
              aria-invalid={Boolean(fieldErrors.rateLimitRpm)}
              aria-describedby="rateLimitRpm-error"
              placeholder="Mis. 30"
            />
            <FieldError id="rateLimitRpm-error" message={fieldErrors.rateLimitRpm} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contextWindow">Ukuran konteks (token)</Label>
            <Input
              id="contextWindow"
              inputMode="numeric"
              value={values.contextWindow}
              onChange={(e) => set("contextWindow", e.target.value)}
              aria-invalid={Boolean(fieldErrors.contextWindow)}
              aria-describedby="contextWindow-error"
              placeholder="Mis. 128000"
            />
            <FieldError id="contextWindow-error" message={fieldErrors.contextWindow} />
          </div>
        </div>
        {showPrice ? null : (
          <FieldHint>
            Untuk tool/chat/hosting, harga per token biasanya tidak berlaku — biarkan kosong.
          </FieldHint>
        )}
      </section>

      {/* --- Masa berlaku promo --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <div>
          <h2 className="text-base font-semibold">Masa berlaku promosi (opsional)</h2>
          <p className="text-sm text-muted-foreground">
            Promo AI cepat berubah — cantumkan tanggal berakhir bila disebutkan provider.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              { key: "promoStart", label: "Mulai berlaku" },
              { key: "promoEnd", label: "Berakhir" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="date"
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
                aria-invalid={Boolean(fieldErrors[key])}
                aria-describedby={`${key}-error`}
              />
              <FieldError id={`${key}-error`} message={fieldErrors[key]} />
            </div>
          ))}
        </div>
      </section>

      {/* --- Sumber --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Sumber</h2>
            <p className="text-sm text-muted-foreground">
              Minimal satu tautan yang dapat dibuka. Utamakan dokumentasi atau halaman harga resmi.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addSource}
            disabled={values.sources.length >= L.sourcesMax}
          >
            <Plus className="size-4" aria-hidden={true} />
            Tambah
          </Button>
        </div>

        {fieldErrors.sources ? <FieldError message={fieldErrors.sources} /> : null}

        <ol className="flex flex-col gap-4">
          {values.sources.map((source, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Sumber {index + 1}</p>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="radio"
                      name="primarySource"
                      checked={source.isPrimary}
                      onChange={() => markPrimary(index)}
                    />
                    Utama
                  </label>
                  {values.sources.length > L.sourcesMin ? (
                    <button
                      type="button"
                      onClick={() => removeSource(index)}
                      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-danger"
                      aria-label={`Hapus sumber ${index + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden={true} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`source-url-${index}`} required>
                  Tautan
                </Label>
                <Input
                  id={`source-url-${index}`}
                  type="url"
                  inputMode="url"
                  value={source.url}
                  onChange={(e) => setSource(index, { url: e.target.value })}
                  placeholder="https://provider.com/pricing"
                  aria-invalid={Boolean(fieldErrors[`sources.${index}.url`])}
                  aria-describedby={`source-url-${index}-error`}
                />
                <FieldError
                  id={`source-url-${index}-error`}
                  message={fieldErrors[`sources.${index}.url`]}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`source-title-${index}`}>Judul halaman sumber</Label>
                  <Input
                    id={`source-title-${index}`}
                    value={source.title}
                    onChange={(e) => setSource(index, { title: e.target.value })}
                    maxLength={L.sourceTitleMax}
                    placeholder="Opsional"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`source-type-${index}`}>Jenis sumber</Label>
                  <select
                    id={`source-type-${index}`}
                    value={source.type}
                    onChange={(e) =>
                      setSource(index, {
                        type: e.target.value as ContributionFormValues["sources"][number]["type"],
                      })
                    }
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {SOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {SOURCE_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* --- Catatan reviewer --- */}
      <section className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-5">
        <Label htmlFor="contributorNote">Catatan untuk reviewer (opsional)</Label>
        <Textarea
          id="contributorNote"
          value={values.contributorNote}
          onChange={(e) => set("contributorNote", e.target.value)}
          maxLength={L.noteMax}
          rows={3}
          placeholder="Konteks tambahan untuk reviewer, bila perlu."
        />
        <FieldHint>
          Tidak ditampilkan publik. Maksimal {L.noteMax} karakter.
        </FieldHint>
      </section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface/95 px-1 py-3 backdrop-blur">
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="secondary"
          disabled={busy}
        >
          {pendingAction === "draft" ? "Menyimpan…" : "Simpan draf"}
        </Button>
        <Button type="submit" name="intent" value="submit" disabled={busy}>
          {pendingAction === "submit"
            ? "Mengirim…"
            : isEditing
              ? "Kirim ulang untuk ditinjau"
              : "Kirim untuk ditinjau"}
        </Button>
      </div>
    </form>
  );
}
