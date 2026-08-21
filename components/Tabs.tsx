"use client";

export type TabKey = "notes" | "currency" | "postcards" | "souvenirs" | "food" | "country";

export default function Tabs({
  active,
  onChange,
  counts,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  counts: Record<TabKey, string>;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "notes", label: "0€ Notes" },
    { key: "currency", label: "Currency" },
    { key: "postcards", label: "Postcards" },
    { key: "souvenirs", label: "Souvenirs" },
    { key: "food", label: "Food" },
    { key: "country", label: "By Country" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b-2 border-ink/15">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative shrink-0 px-4 py-2 font-display text-lg transition-colors ${
            active === t.key ? "text-ink" : "text-ink/40"
          }`}
        >
          {t.label}
          <span className="ml-2 font-mono text-xs text-gold">
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
