"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTRIBUTION_LIMITS,
  PROVINCES,
  REGION_SCOPES,
  REGION_SCOPE_LABEL,
  SENSITIVE_DATA_WARNING,
  SOURCE_TYPES,
  SOURCE_TYPE_LABEL,
} from "@/lib/constants/labels";
import { saveAndSubmit, saveDraft, type ActionResult } from "@/app/dashboard/kontribusi/actions";

export type ContributionFormValues = {
  title: string;
  description: string;
  categoryId: string;
  regionScope: (typeof REGION_SCOPES)[number];
  province: string;
  city: string;
  organizer: string;
  requirements: string;
  publishedAt: string;
  startDate: string;
  endDate: string;
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
  regionScope: "nasional",
  province: "",
  city: "",
  organizer: "",
  requirements: "",
  publishedAt: "",
  startDate: "",
  endDate: "",
  contributorNote: "",
  sources: [{ url: "", title: "", type: "situs_resmi", isPrimary: true }],
};

function toRaw(values: ContributionFormValues) {
  return {
    ...values,
    publishedAt: values.publishedAt || null,
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    province: values.province || null,
    city: values.city || null,
    requirements: values.requirements || undefined,
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
        { url: "", title: "", type: "situs_resmi", isPrimary: false },
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
  const isRegional = values.regionScope !== "nasional";
  const isEditing = mode === "edit";

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
                      href={`/bansos/${d.slug}`}
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
        <h2 className="text-base font-semibold">Informasi program</h2>

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
            placeholder="Contoh: Beasiswa Pendidikan untuk Siswa SMA Tahun 2026"
            required
          />
          <FieldHint id="title-hint">
            {values.title.length}/{L.titleMax} karakter. Gunakan judul faktual, bukan clickbait.
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
            placeholder="Jelaskan isi program sesuai sumber: manfaat, sasaran, cara mendaftar, dan jangka waktu."
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
            <Label htmlFor="organizer" required>
              Penyelenggara
            </Label>
            <Input
              id="organizer"
              value={values.organizer}
              onChange={(e) => set("organizer", e.target.value)}
              maxLength={L.organizerMax}
              aria-invalid={Boolean(fieldErrors.organizer)}
              aria-describedby="organizer-error"
              placeholder="Nama instansi/lembaga resmi penyelenggara"
              required
            />
            <FieldError id="organizer-error" message={fieldErrors.organizer} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requirements">Persyaratan</Label>
          <Textarea
            id="requirements"
            value={values.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            maxLength={L.requirementsMax}
            rows={4}
            aria-invalid={Boolean(fieldErrors.requirements)}
            aria-describedby="requirements-hint requirements-error"
            placeholder="Tulis persyaratan yang tercantum pada sumber. Jangan menambahkan yang tidak ada."
          />
          <FieldHint id="requirements-hint">
            Opsional. Maksimal {L.requirementsMax} karakter.
          </FieldHint>
          <FieldError id="requirements-error" message={fieldErrors.requirements} />
        </div>
      </section>

      {/* --- Wilayah --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <h2 className="text-base font-semibold">Cakupan wilayah</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Cakupan</Label>
            <div className="flex flex-wrap gap-2">
              {REGION_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className={[
                    "cursor-pointer rounded-md border px-3 py-1.5 text-sm",
                    values.regionScope === scope
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="regionScope"
                    value={scope}
                    checked={values.regionScope === scope}
                    onChange={() => set("regionScope", scope)}
                    className="sr-only"
                  />
                  {REGION_SCOPE_LABEL[scope]}
                </label>
              ))}
            </div>
          </div>

          {isRegional ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="province" required>
                Provinsi
              </Label>
              <select
                id="province"
                value={values.province}
                onChange={(e) => set("province", e.target.value)}
                aria-invalid={Boolean(fieldErrors.province)}
                aria-describedby="province-error"
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Pilih provinsi…</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <FieldError id="province-error" message={fieldErrors.province} />
            </div>
          ) : null}

          {values.regionScope === "kabupaten_kota" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city" required>
                Kabupaten/Kota
              </Label>
              <Input
                id="city"
                value={values.city}
                onChange={(e) => set("city", e.target.value)}
                maxLength={80}
                aria-invalid={Boolean(fieldErrors.city)}
                aria-describedby="city-error"
                placeholder="Mis. Kota Bandung"
              />
              <FieldError id="city-error" message={fieldErrors.city} />
            </div>
          ) : null}
        </div>
      </section>

      {/* --- Jadwal --- */}
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
        <h2 className="text-base font-semibold">Jadwal (opsional)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              { key: "publishedAt", label: "Tanggal publikasi sumber" },
              { key: "startDate", label: "Mulai pendaftaran" },
              { key: "endDate", label: "Berakhir" },
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
              Minimal satu tautan yang dapat dibuka. Utamakan situs resmi penyelenggara.
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
                  placeholder="https://www.contoh.go.id/pengumuman"
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
