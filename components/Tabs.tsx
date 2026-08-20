"use client";

export default function Tabs({
  active,
  onChange,
  counts,
}: {
  active: "notes" | "currency";
  onChange: (tab: "notes" | "currency") => void;
  counts: { notes: string; currency: string };
}) {
  const tabs: { key: "notes" | "currency"; label: string }[] = [
    { key: "notes", label: "0€ Notes" },
    { key: "currency", label: "Currency" },
  ];

  return (
    <div className="flex gap-1 border-b-2 border-ink/15">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative px-4 py-2 font-display text-lg transition-colors ${
            active === t.key ? "text-ink" : "text-ink/40"
          }`}
        >
          {t.label}
          <span className="ml-2 font-mono text-xs text-teal">
            {counts[t.key]}
          </span>
          {active === t.key && (
            <span className="absolute inset-x-2 -bottom-[2px] h-[3px] bg-stamp" />
          )}
        </button>
      ))}
    </div>
  );
}
