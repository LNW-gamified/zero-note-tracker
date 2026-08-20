"use client";

import { useMemo, useState } from "react";
import { CURRENCIES, OTHER_CURRENCY } from "@/lib/currencyData";

export type CurrencyFormValues = {
  currency_name: string;
  denomination: string;
  item_type: "coin" | "note";
  country: string;
  year: string;
  notes: string;
};

const labelClass = "font-mono text-[10px] uppercase tracking-widest text-ink/60";
const inputClass = "rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1.5";

export default function AddCurrencyForm({
  onSubmit,
  onClose,
  initialValues,
  existingCurrencyNames,
  heading = "Add to the ledger",
  submitLabel = "Add",
  photoUrl,
  onPhotoSelected,
}: {
  onSubmit: (values: CurrencyFormValues) => Promise<void>;
  onClose: () => void;
  initialValues?: CurrencyFormValues;
  existingCurrencyNames: string[];
  heading?: string;
  submitLabel?: string;
  photoUrl?: string | null;
  onPhotoSelected?: (file: File) => Promise<void>;
}) {
  const editing = !!initialValues;
  const [currencyName, setCurrencyName] = useState(editing ? OTHER_CURRENCY : "");
  const [customCurrencyName, setCustomCurrencyName] = useState(initialValues?.currency_name ?? "");
  const [denomination, setDenomination] = useState("");
  const [customDenomination, setCustomDenomination] = useState(initialValues?.denomination ?? "");
  const [customType, setCustomType] = useState<"coin" | "note">(initialValues?.item_type ?? "coin");
  const [country, setCountry] = useState(initialValues?.country ?? "");
  const [year, setYear] = useState(initialValues?.year ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const selectedCurrency = useMemo(
    () => CURRENCIES.find((c) => c.name === currencyName),
    [currencyName]
  );
  const isOther = currencyName === OTHER_CURRENCY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalCurrencyName = isOther ? customCurrencyName : currencyName;
    const finalDenomination = isOther ? customDenomination : denomination;
    const finalType: "coin" | "note" = isOther
      ? customType
      : selectedCurrency?.denominations.find((d) => d.label === denomination)?.type ?? "coin";

    if (!finalCurrencyName || !finalDenomination || !country) return;

    setSaving(true);
    try {
      await onSubmit({
        currency_name: finalCurrencyName,
        denomination: finalDenomination,
        item_type: finalType,
        country,
        year,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onPhotoSelected) return;
    if (photoUrl && !window.confirm("Replace the existing photo? The old one can't be recovered.")) {
      e.target.value = "";
      return;
    }
    setLocalPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      await onPhotoSelected(file);
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-md border-2 border-ink/20 bg-paper p-5 sm:rounded-md"
      >
        <h2 className="mb-4 font-display text-lg">{heading}</h2>

        {onPhotoSelected && (
          <div className="mb-4 flex items-center gap-3">
            {localPreview ?? photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={localPreview ?? photoUrl ?? undefined}
                alt=""
                className="h-16 w-16 rounded-sm border border-ink/20 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-dashed border-ink/30 font-mono text-[9px] uppercase tracking-widest text-ink/40">
                None
              </div>
            )}
            <label className="cursor-pointer rounded-sm border border-ink/30 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ink/70 hover:border-ink/50">
              {photoUploading ? "Uploading…" : photoUrl ? "Replace photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoFile}
              />
            </label>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Currency</span>
            <select
              required
              className={inputClass}
              value={currencyName}
              onChange={(e) => {
                setCurrencyName(e.target.value);
                setDenomination("");
              }}
            >
              <option value="">Select…</option>
              {CURRENCIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value={OTHER_CURRENCY}>{OTHER_CURRENCY}</option>
            </select>
          </label>

          {isOther && (
            <label className="flex flex-col gap-1 text-sm">
              <span className={labelClass}>Currency name</span>
              <input
                required
                list="existing-currency-names"
                placeholder="e.g. Mexican Peso"
                className={inputClass}
                value={customCurrencyName}
                onChange={(e) => setCustomCurrencyName(e.target.value)}
              />
              <datalist id="existing-currency-names">
                {existingCurrencyNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {customCurrencyName.trim() &&
                !existingCurrencyNames.some(
                  (n) => n.toLowerCase() === customCurrencyName.trim().toLowerCase()
                ) &&
                existingCurrencyNames.length > 0 && (
                  <span className="text-[11px] text-ink/40">
                    New currency name — check the suggestions above aren&apos;t the same one spelled differently.
                  </span>
                )}
            </label>
          )}

          {isOther ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className={labelClass}>Denomination</span>
                <input
                  required
                  placeholder="e.g. 20 peso"
                  className={inputClass}
                  value={customDenomination}
                  onChange={(e) => setCustomDenomination(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className={labelClass}>Type</span>
                <select
                  className={inputClass}
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as "coin" | "note")}
                >
                  <option value="coin">coin</option>
                  <option value="note">note</option>
                </select>
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              <span className={labelClass}>Denomination</span>
              <select
                required
                disabled={!selectedCurrency}
                className={inputClass}
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
              >
                <option value="">
                  {selectedCurrency ? "Select…" : "Pick a currency first"}
                </option>
                {selectedCurrency?.denominations.map((d) => (
                  <option key={d.label} value={d.label}>
                    {d.label} ({d.type})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Country</span>
            <input
              required
              placeholder="e.g. France"
              className={inputClass}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Year</span>
            <input
              type="number"
              placeholder="2024"
              className={inputClass}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Notes</span>
            <textarea
              rows={3}
              placeholder="Freeform notes…"
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-sm border border-ink/30 px-3 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-sm border border-teal bg-teal px-3 py-2 text-sm text-paper disabled:opacity-50"
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
