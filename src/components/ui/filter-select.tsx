"use client";

import { useRef, useState } from "react";

import { Select, type SelectOption } from "@/components/ui/select";

type FilterSelectProps = {
  /** Nama field — dipakai sebagai `name` pada `<input type="hidden">`. */
  name: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  id?: string;
  className?: string;
};

/**
 * Dropdown filter untuk form GET biasa (tanpa state React di server).
 *
 * Berbeda dengan `Select` biasa, komponen ini tetap mengirim nilai lewat
 * submit form: nilai disimpan di `<input type="hidden" name={name}>` yang
 * berada di dalam form induk, dan form otomatis di-submit saat pilihan
 * berubah — meniru perilaku `<select>` di dalam form GET, tanpa kontrol
 * bawaan browser.
 *
 * `requestSubmit()` dipakai (bukan `submit()`) agar event `submit` tetap
 * terpicu. `noValidate` di-set sementara supaya field teks lain yang kosong
 * tidak memblokir submit; validasi sesungguhnya tetap ada di server.
 */
export function FilterSelect({
  name,
  label,
  value,
  options,
  id,
  className,
}: FilterSelectProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(value);

  return (
    <>
      <input ref={hiddenRef} type="hidden" name={name} value={current} />
      <Select
        id={id}
        label={label}
        value={current}
        options={options}
        className={className}
        onValueChange={(next) => {
          setCurrent(next);
          queueMicrotask(() => {
            const form = hiddenRef.current?.form;
            if (!form) return;
            form.noValidate = true;
            form.requestSubmit();
          });
        }}
      />
    </>
  );
}

/** Kelas seragam untuk trigger dropdown di dalam baris filter. */
export const filterSelectClassName = "h-10 w-48";
