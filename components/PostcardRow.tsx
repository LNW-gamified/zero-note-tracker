"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFlagEmoji } from "@/lib/countryFlags";
import { formatShortDate } from "@/lib/formatDate";
import type { PostcardCardProps } from "./PostcardCard";

export default function PostcardRow({
  title,
  subtitle,
  meta,
  country,
  photoUrl,
  status,
  sentDate,
  receivedDate,
  onMarkSent,
  onMarkReceived,
  onMarkNotSent,
  onMarkNotReceived,
  onPhotoSelected,
  onEdit,
  onDelete,
}: PostcardCardProps) {
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

  function handleThumbClick() {
    if (photoUrl) {
      setLightboxOpen(true);
      return;
    }
    fileInput.current?.click();
  }

  return (
    <div
      className={`flex items-center gap-3 border-b border-ink/10 px-2 py-2 ${
        status === "not_sent" ? "opacity-90" : ""
      }`}
    >
      <div
        onClick={handleThumbClick}
        className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-ink/20 bg-ink/5"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={title} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/30">
            <span className="text-lg">{uploading ? "…" : "+"}</span>
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

      {flag && <span className="flag-outline shrink-0 text-xl leading-none">{flag}</span>}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate font-display text-sm leading-snug text-ink">
            {title}
          </h3>
          {status !== "not_sent" && (
            <span
              className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-paper ${
                status === "received" ? "bg-teal" : "bg-gold"
              }`}
            >
              {status === "received" ? "Received" : "Sent"}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink/60">
          {subtitle}
          {meta ? ` · ${meta}` : ""}
        </p>
        {receivedDate ? (
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30">
            Received {formatShortDate(receivedDate)}
          </p>
        ) : (
          sentDate && (
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30">
              Sent {formatShortDate(sentDate)}
            </p>
          )
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-widest">
        {status === "not_sent" ? (
          <button
            onClick={onMarkSent}
            className="rounded-sm border border-skyBlue px-2 py-1 text-skyBlue hover:bg-skyBlue hover:text-paper"
          >
            Sent
          </button>
        ) : status === "sent" ? (
          <>
            <button
              onClick={onMarkReceived}
              className="rounded-sm border border-teal px-2 py-1 text-teal hover:bg-teal hover:text-paper"
            >
              Recv
            </button>
            <button
              onClick={onMarkNotSent}
              className="rounded-sm border border-ink/30 px-2 py-1 text-ink/50 hover:border-ink/40 hover:text-ink"
            >
              Undo
            </button>
          </>
        ) : (
          <button
            onClick={onMarkNotReceived}
            className="rounded-sm border border-ink/30 px-2 py-1 text-ink/50 hover:border-ink/40 hover:text-ink"
          >
            Undo
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded-sm border border-ink/20 px-2 py-1 text-ink/50 hover:border-ink/40 hover:text-ink"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded-sm border border-stamp/30 px-2 py-1 text-stamp/60 hover:border-stamp hover:text-stamp"
        >
          Del
        </button>
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
