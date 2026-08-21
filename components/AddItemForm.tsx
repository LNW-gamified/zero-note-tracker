"use client";

import { useState } from "react";

export type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "textarea";
  step?: string;
  required?: boolean;
  options?: string[];
};

export default function AddItemForm({
  fields,
  initialValues,
  heading = "Add to the ledger",
  submitLabel = "Add",
  photoUrl,
  onPhotoSelected,
  onSubmit,
  onClose,
}: {
  fields: Field[];
  initialValues?: Record<string, string>;
  heading?: string;
  submitLabel?: string;
  photoUrl?: string | null;
  onPhotoSelected?: (file: File) => Promise<void>;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [saving, setSaving] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

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
          {fields.map((f) => (
            <label key={f.name} className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
                {f.label}
              </span>
              {f.options ? (
                <select
                  required={f.required}
                  className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1.5"
                  value={values[f.name] ?? ""}
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
              ) : f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  placeholder={f.placeholder}
                  rows={3}
                  className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1.5"
                  value={values[f.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                />
              ) : (
                <input
                  type={f.type ?? "text"}
                  step={f.step}
                  required={f.required}
                  placeholder={f.placeholder}
                  className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1.5"
                  value={values[f.name] ?? ""}
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
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
