"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadPhoto } from "@/lib/storage";
import { ZeroNote, CurrencyItem } from "@/lib/types";
import ItemCard from "@/components/ItemCard";
import Tabs from "@/components/Tabs";
import AddItemForm, { Field } from "@/components/AddItemForm";
import AddCurrencyForm, { CurrencyFormValues } from "@/components/AddCurrencyForm";

const NOTE_FIELDS: Field[] = [
  { name: "name", label: "Name", required: true, placeholder: "e.g. Atomium" },
  { name: "country", label: "Country", required: true, placeholder: "e.g. Belgium" },
  { name: "city", label: "City / site", placeholder: "e.g. Brussels" },
  { name: "year", label: "Year", type: "number", placeholder: "2017" },
  { name: "identification", label: "Identification", placeholder: "e.g. serial / catalog no." },
];

export default function Home() {
  const [tab, setTab] = useState<"notes" | "currency">("notes");
  const [notes, setNotes] = useState<ZeroNote[]>([]);
  const [currency, setCurrency] = useState<CurrencyItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "collected" | "missing">("all");
  const [noteSort, setNoteSort] = useState<"date" | "country">("date");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [notesRes, currencyRes] = await Promise.all([
      supabase.from("zero_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("currency_items").select("*").order("country").order("item_type").order("denomination"),
    ]);
    if (notesRes.error) setError(notesRes.error.message);
    if (currencyRes.error) setError(currencyRes.error.message);
    setNotes((notesRes.data as ZeroNote[]) ?? []);
    setCurrency((currencyRes.data as CurrencyItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredNotes = useMemo(() => {
    const base = notes.filter((n) =>
      filter === "all" ? true : filter === "collected" ? n.collected : !n.collected
    );
    if (noteSort === "country") {
      return [...base].sort((a, b) => a.country.localeCompare(b.country));
    }
    return base;
  }, [notes, filter, noteSort]);

  const filteredCurrency = useMemo(
    () =>
      currency.filter((c) =>
        filter === "all" ? true : filter === "collected" ? c.collected : !c.collected
      ),
    [currency, filter]
  );

  async function toggleNote(n: ZeroNote) {
    const collected = !n.collected;
    const { error } = await supabase
      .from("zero_notes")
      .update({
        collected,
        collected_date: collected ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", n.id);
    if (error) return setError(error.message);
    loadAll();
  }

  async function toggleCurrency(c: CurrencyItem) {
    const collected = !c.collected;
    const { error } = await supabase
      .from("currency_items")
      .update({
        collected,
        collected_date: collected ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", c.id);
    if (error) return setError(error.message);
    loadAll();
  }

  async function uploadNotePhoto(n: ZeroNote, file: File) {
    const url = await uploadPhoto(file, "zero-notes");
    const { error } = await supabase.from("zero_notes").update({ photo_url: url }).eq("id", n.id);
    if (error) return setError(error.message);
    loadAll();
  }

  async function uploadCurrencyPhoto(c: CurrencyItem, file: File) {
    const url = await uploadPhoto(file, "currency");
    const { error } = await supabase.from("currency_items").update({ photo_url: url }).eq("id", c.id);
    if (error) return setError(error.message);
    loadAll();
  }

  async function addNote(values: Record<string, string>) {
    const { error } = await supabase.from("zero_notes").insert({
      name: values.name,
      country: values.country,
      city: values.city || null,
      year: values.year ? Number(values.year) : null,
      identification: values.identification || null,
    });
    if (error) return setError(error.message);
    loadAll();
  }

  async function addCurrency(values: CurrencyFormValues) {
    const { error } = await supabase.from("currency_items").insert({
      currency_name: values.currency_name,
      country: values.country,
      denomination: values.denomination,
      item_type: values.item_type,
      year: values.year ? Number(values.year) : null,
    });
    if (error) return setError(error.message);
    loadAll();
  }

  const noteCount = `${notes.filter((n) => n.collected).length}/${notes.length}`;
  const currencyCount = `${currency.filter((c) => c.collected).length}/${currency.length}`;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-8 sm:px-8">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">Personal catalog</p>
        <h1 className="font-display text-3xl italic text-ink sm:text-4xl">The Ledger</h1>
        <p className="mt-1 text-sm text-ink/60">
          Zero-euro souvenir notes and world currency, tracked one stamp at a time.
        </p>
      </header>

      <Tabs active={tab} onChange={setTab} counts={{ notes: noteCount, currency: currencyCount }} />

      <div className="my-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 font-mono text-xs uppercase tracking-widest">
          {(["all", "collected", "missing"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-sm border px-2 py-1 ${
                filter === f ? "border-ink bg-ink text-paper" : "border-ink/30 text-ink/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {tab === "notes" && (
            <select
              value={noteSort}
              onChange={(e) => setNoteSort(e.target.value as "date" | "country")}
              className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-widest text-ink/70"
            >
              <option value="date">Newest first</option>
              <option value="country">Sort by country</option>
            </select>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-sm border border-stamp bg-stamp px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-paper"
          >
            + Add
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-sm border border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : tab === "notes" ? (
        filteredNotes.length === 0 ? (
          <EmptyState label="No 0€ notes here yet. Add the first one." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredNotes.map((n, i) => (
              <ItemCard
                key={n.id}
                serial={`NO.${String(i + 1).padStart(3, "0")}`}
                title={n.name}
                subtitle={[n.city, n.country].filter(Boolean).join(", ")}
                meta={[n.year, n.identification].filter(Boolean).join(" · ") || undefined}
                photoUrl={n.photo_url}
                collected={n.collected}
                collectedDate={n.collected_date}
                onToggle={() => toggleNote(n)}
                onPhotoSelected={(file) => uploadNotePhoto(n, file)}
              />
            ))}
          </div>
        )
      ) : filteredCurrency.length === 0 ? (
        <EmptyState label="No currency items here yet. Add the first one." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredCurrency.map((c, i) => (
            <ItemCard
              key={c.id}
              serial={`CU.${String(i + 1).padStart(3, "0")}`}
              title={c.denomination}
              subtitle={`${c.currency_name} · ${c.country}`}
              meta={[c.item_type, c.year].filter(Boolean).join(" · ")}
              photoUrl={c.photo_url}
              collected={c.collected}
              collectedDate={c.collected_date}
              onToggle={() => toggleCurrency(c)}
              onPhotoSelected={(file) => uploadCurrencyPhoto(c, file)}
            />
          ))}
        </div>
      )}

      {showAdd && tab === "notes" && (
        <AddItemForm fields={NOTE_FIELDS} onSubmit={addNote} onClose={() => setShowAdd(false)} />
      )}
      {showAdd && tab === "currency" && (
        <AddCurrencyForm onSubmit={addCurrency} onClose={() => setShowAdd(false)} />
      )}
    </main>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-sm border-2 border-dashed border-ink/20 py-16 text-center">
      <p className="font-display text-lg text-ink/50">{label}</p>
    </div>
  );
}
