"use client";

import { useRef, useState } from "react";

export type ItemCardProps = {
  serial: string;
  title: string;
  subtitle: string;
  meta?: string;
  notes?: string | null;
  photoUrl: string | null;
  collected: boolean;
  collectedDate: string | null;
  onToggle: () => void;
  onPhotoSelected: (file: File) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ItemCard({
  serial,
  title,
  subtitle,
  meta,
  notes,
  photoUrl,
  collected,
  collectedDate,
  onToggle,
  onPhotoSelected,
  onEdit,
  onDelete,
}: ItemCardProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onPhotoSelected(file);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function handlePhotoClick() {
    if (photoUrl && !window.confirm("Replace the existing photo? The old one can't be recovered.")) {
      return;
    }
    fileInput.current?.click();
  }

  return (
    <div
      className={`relative rounded-sm border-2 bg-[#1e2530] shadow-[3px_3px_0_0_rgba(0,0,0,0.35)] transition-opacity ${
        collected ? "border-teal" : "border-ink/20"
      } ${collected ? "" : "opacity-90"}`}
    >
      {collected && (
        <div className="stamp">
          Collected
          {collectedDate ? (
            <>
              <br />
              {collectedDate}
            </>
          ) : null}
        </div>
      )}

      <div
        className="relative h-36 w-full cursor-pointer overflow-hidden bg-ink/5"
        onClick={handlePhotoClick}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink/40">
            <span className="text-2xl">+</span>
            <span className="font-mono text-[10px] uppercase tracking-widest">
              {uploading ? "Uploading…" : "Add photo"}
            </span>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="guilloche-rule" />

      <div className="p-3">
        <div className="serial mb-1 text-[10px] text-teal">{serial}</div>
        <h3 className="font-display text-base leading-snug text-ink">{title}</h3>
        <p className="text-sm text-ink/70">{subtitle}</p>
        {meta && <p className="text-xs text-ink/50">{meta}</p>}
        {notes && <p className="mt-1 text-xs italic text-ink/40">{notes}</p>}

        <button
          onClick={onToggle}
          className={`mt-3 w-full rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
            collected
              ? "border-teal text-teal hover:bg-teal hover:text-paper"
              : "border-stamp text-stamp hover:bg-stamp hover:text-paper"
          }`}
        >
          {collected ? "Mark not collected" : "Mark collected"}
        </button>

        <div className="mt-2 flex gap-2 font-mono text-[10px] uppercase tracking-widest">
          <button
            onClick={onEdit}
            className="flex-1 rounded-sm border border-ink/20 px-2 py-1 text-ink/50 hover:border-ink/40 hover:text-ink"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 rounded-sm border border-stamp/30 px-2 py-1 text-stamp/60 hover:border-stamp hover:text-stamp"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
