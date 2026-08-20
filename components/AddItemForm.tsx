"use client";

import { useState } from "react";

export type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
  options?: string[];
};

export default function AddItemForm({
  fields,
  onSubmit,
  onClose,
}: {
  fields: Field[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
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
          {fields.map((f) => (
            <label key={f.name} className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
                {f.label}
              </span>
              {f.options ? (
                <select
                  required={f.required}
                  className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1.5"
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type ?? "text"}
                  required={f.required}
                  placeholder={f.placeholder}
                  className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1.5"
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                />
              )}
            </label>
          ))}
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
