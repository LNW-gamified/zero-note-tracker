"use client";

import { useMemo, useState } from "react";
import { CURRENCIES, OTHER_CURRENCY } from "@/lib/currencyData";

export type CurrencyFormValues = {
  currency_name: string;
  denomination: string;
  item_type: "coin" | "note";
  country: string;
  year: string;
};

const labelClass = "font-mono text-[10px] uppercase tracking-widest text-ink/60";
const inputClass = "rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1.5";

export default function AddCurrencyForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (values: CurrencyFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const [currencyName, setCurrencyName] = useState("");
  const [customCurrencyName, setCustomCurrencyName] = useState("");
  const [denomination, setDenomination] = useState("");
  const [customDenomination, setCustomDenomination] = useState("");
  const [customType, setCustomType] = useState<"coin" | "note">("coin");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

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
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-md border-2 border-ink/20 bg-paper p-5 sm:rounded-md"
      >
        <h2 className="mb-4 font-display text-lg">Add to the ledger</h2>

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
                placeholder="e.g. Mexican Peso"
                className={inputClass}
                value={customCurrencyName}
                onChange={(e) => setCustomCurrencyName(e.target.value)}
              />
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
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
