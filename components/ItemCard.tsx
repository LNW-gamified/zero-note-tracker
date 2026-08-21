"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFlagEmoji } from "@/lib/countryFlags";
import { formatShortDate } from "@/lib/formatDate";
import LocationMap from "@/components/LocationMap";

export type ItemCardProps = {
  addedAt: string;
  title: string;
  subtitle: string;
  meta?: string;
  notes?: string | null;
  country?: string;
  address?: string | null;
  photoUrl: string | null;
  collected: boolean;
  collectedDate: string | null;
  verb?: string;
  onToggle: () => void;
  onPhotoSelected: (file: File) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ItemCard({
  addedAt,
  title,
  subtitle,
  meta,
  notes,
  country,
  address,
  photoUrl,
  collected,
  collectedDate,
  verb = "Collected",
  onToggle,
  onPhotoSelected,
  onEdit,
  onDelete,
}: ItemCardProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const flag = getFlagEmoji(country);

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
    if (photoUrl) {
      setLightboxOpen(true);
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
      <div
        className="relative h-36 w-full cursor-pointer overflow-hidden bg-ink/5"
        onClick={handlePhotoClick}
      >
        {collected && <div className="ribbon">{verb}</div>}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={title} className="h-full w-full object-contain" />
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

      <div className="px-3 pb-3 pt-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="min-w-0 flex-1 line-clamp-2 font-display text-sm leading-snug text-ink sm:text-base">
            {title}
          </h3>
          {flag && (
            <span
              className="flag-outline shrink-0 text-3xl leading-none sm:text-5xl"
              title={country}
            >
              {flag}
            </span>
          )}
        </div>
        {collected && collectedDate && (
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-teal/80">
            {verb} {formatShortDate(collectedDate)}
          </p>
        )}
        <p className="text-sm text-ink/70">{subtitle}</p>
        {meta && <p className="text-xs text-ink/50">{meta}</p>}
        {notes && <p className="mt-1 text-xs italic text-ink/40">{notes}</p>}
        {address && <LocationMap address={address} />}

        <button
          onClick={onToggle}
          className={`mt-3 w-full rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
            collected
              ? "border-teal text-teal hover:bg-teal hover:text-paper"
              : "border-skyBlue text-skyBlue hover:bg-skyBlue hover:text-paper"
          }`}
        >
          {collected ? `Mark not ${verb.toLowerCase()}` : `Mark ${verb.toLowerCase()}`}
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

      {lightboxOpen &&
        photoUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 font-mono text-xs uppercase tracking-widest text-white/70 hover:text-white"
            >
              Close ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={title}
              className="max-h-[90vh] max-w-[90vw] rounded-sm object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
