"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadPhoto, deletePhoto } from "@/lib/storage";
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
  { name: "notes", label: "Notes", type: "textarea", placeholder: "Freeform notes…" },
];

function noteToFormValues(n: ZeroNote): Record<string, string> {
  return {
    name: n.name,
    country: n.country,
    city: n.city ?? "",
    year: n.year ? String(n.year) : "",
    identification: n.identification ?? "",
    notes: n.notes ?? "",
  };
}

function currencyToFormValues(c: CurrencyItem): CurrencyFormValues {
  return {
    currency_name: c.currency_name,
    denomination: c.denomination,
    item_type: c.item_type,
    country: c.country,
    year: c.year ? String(c.year) : "",
    notes: c.notes ?? "",
  };
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export default function Home() {
  const [tab, setTab] = useState<"notes" | "currency">("notes");
  const [notes, setNotes] = useState<ZeroNote[]>([]);
  const [currency, setCurrency] = useState<CurrencyItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingNote, setEditingNote] = useState<ZeroNote | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyItem | null>(null);
  const [filter, setFilter] = useState<"all" | "collected" | "missing">("all");
  const [noteSort, setNoteSort] = useState<"date" | "country">("date");
  const [currencySort, setCurrencySort] = useState<"country" | "date">("country");
  const [search, setSearch] = useState("");
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

  const existingCurrencyNames = useMemo(
    () => Array.from(new Set(currency.map((c) => c.currency_name))).sort(),
    [currency]
  );

  const filteredNotes = useMemo(() => {
    const byFilter = notes.filter((n) =>
      filter === "all" ? true : filter === "collected" ? n.collected : !n.collected
    );
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byFilter.filter((n) =>
          [n.name, n.country, n.city, n.identification, n.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : byFilter;
    if (noteSort === "country") {
      return [...bySearch].sort((a, b) => a.country.localeCompare(b.country));
    }
    return bySearch;
  }, [notes, filter, noteSort, search]);

  const filteredCurrency = useMemo(() => {
    const byFilter = currency.filter((c) =>
      filter === "all" ? true : filter === "collected" ? c.collected : !c.collected
    );
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byFilter.filter((c) =>
          [c.currency_name, c.country, c.denomination, c.item_type, c.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : byFilter;
    if (currencySort === "date") {
      return [...bySearch].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return [...bySearch].sort(
      (a, b) => a.country.localeCompare(b.country) || a.denomination.localeCompare(b.denomination)
    );
  }, [currency, filter, search, currencySort]);

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
    if (n.photo_url) deletePhoto(n.photo_url).catch(() => {});
    loadAll();
  }

  async function uploadCurrencyPhoto(c: CurrencyItem, file: File) {
    const url = await uploadPhoto(file, "currency");
    const { error } = await supabase.from("currency_items").update({ photo_url: url }).eq("id", c.id);
    if (error) return setError(error.message);
    if (c.photo_url) deletePhoto(c.photo_url).catch(() => {});
    loadAll();
  }

  function isDuplicateNote(candidate: { name: string; country: string; city: string | null }, excludeId?: string) {
    return notes.some(
      (n) =>
        n.id !== excludeId &&
        norm(n.name) === norm(candidate.name) &&
        norm(n.country) === norm(candidate.country) &&
        norm(n.city) === norm(candidate.city)
    );
  }

  function isDuplicateCurrency(
    candidate: { currency_name: string; denomination: string; country: string },
    excludeId?: string
  ) {
    return currency.some(
      (c) =>
        c.id !== excludeId &&
        norm(c.currency_name) === norm(candidate.currency_name) &&
        norm(c.denomination) === norm(candidate.denomination) &&
        norm(c.country) === norm(candidate.country)
    );
  }

  async function addNote(values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city || null };
    if (
      isDuplicateNote(candidate) &&
      !window.confirm("An entry with this name/country/city already exists. Add it anyway?")
    ) {
      return;
    }
    const { error } = await supabase.from("zero_notes").insert({
      name: values.name,
      country: values.country,
      city: values.city || null,
      year: values.year ? Number(values.year) : null,
      identification: values.identification || null,
      notes: values.notes || null,
    });
    if (error) return setError(error.message);
    loadAll();
  }

  async function updateNote(original: ZeroNote, values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city || null };
    if (
      isDuplicateNote(candidate, original.id) &&
      !window.confirm("Another entry with this name/country/city already exists. Save anyway?")
    ) {
      return;
    }
    const { error } = await supabase
      .from("zero_notes")
      .update({
        name: values.name,
        country: values.country,
        city: values.city || null,
        year: values.year ? Number(values.year) : null,
        identification: values.identification || null,
        notes: values.notes || null,
      })
      .eq("id", original.id);
    if (error) return setError(error.message);
    setEditingNote(null);
    loadAll();
  }

  async function deleteNote(n: ZeroNote) {
    if (!window.confirm(`Delete "${n.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("zero_notes").delete().eq("id", n.id);
    if (error) return setError(error.message);
    if (n.photo_url) deletePhoto(n.photo_url).catch(() => {});
    loadAll();
  }

  async function addCurrency(values: CurrencyFormValues) {
    if (
      isDuplicateCurrency(values) &&
      !window.confirm("An entry with this currency/denomination/country already exists. Add it anyway?")
    ) {
      return;
    }
    const { error } = await supabase.from("currency_items").insert({
      currency_name: values.currency_name,
      country: values.country,
      denomination: values.denomination,
      item_type: values.item_type,
      year: values.year ? Number(values.year) : null,
      notes: values.notes || null,
    });
    if (error) return setError(error.message);
    loadAll();
  }

  async function updateCurrency(original: CurrencyItem, values: CurrencyFormValues) {
    if (
      isDuplicateCurrency(values, original.id) &&
      !window.confirm("Another entry with this currency/denomination/country already exists. Save anyway?")
    ) {
      return;
    }
    const { error } = await supabase
      .from("currency_items")
      .update({
        currency_name: values.currency_name,
        country: values.country,
        denomination: values.denomination,
        item_type: values.item_type,
        year: values.year ? Number(values.year) : null,
        notes: values.notes || null,
      })
      .eq("id", original.id);
    if (error) return setError(error.message);
    setEditingCurrency(null);
    loadAll();
  }

  async function deleteCurrency(c: CurrencyItem) {
    if (!window.confirm(`Delete "${c.denomination} · ${c.currency_name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("currency_items").delete().eq("id", c.id);
    if (error) return setError(error.message);
    if (c.photo_url) deletePhoto(c.photo_url).catch(() => {});
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
        <div className="flex flex-wrap items-center gap-2">
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
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 text-sm text-ink/80 placeholder:text-ink/30"
          />
        </div>
        <div className="flex items-center gap-2">
          {tab === "notes" ? (
            <select
              value={noteSort}
              onChange={(e) => setNoteSort(e.target.value as "date" | "country")}
              className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-widest text-ink/70"
            >
              <option value="date">Newest first</option>
              <option value="country">Sort by country</option>
            </select>
          ) : (
            <select
              value={currencySort}
              onChange={(e) => setCurrencySort(e.target.value as "country" | "date")}
              className="rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-widest text-ink/70"
            >
              <option value="country">Sort by country</option>
              <option value="date">Newest first</option>
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
          <EmptyState label={search ? "No matches." : "No 0€ notes here yet. Add the first one."} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredNotes.map((n, i) => (
              <ItemCard
                key={n.id}
                serial={`NO.${String(i + 1).padStart(3, "0")}`}
                title={n.name}
                subtitle={[n.city, n.country].filter(Boolean).join(", ")}
                meta={[n.year, n.identification].filter(Boolean).join(" · ") || undefined}
                notes={n.notes}
                photoUrl={n.photo_url}
                collected={n.collected}
                collectedDate={n.collected_date}
                onToggle={() => toggleNote(n)}
                onPhotoSelected={(file) => uploadNotePhoto(n, file)}
                onEdit={() => setEditingNote(n)}
                onDelete={() => deleteNote(n)}
              />
            ))}
          </div>
        )
      ) : filteredCurrency.length === 0 ? (
        <EmptyState label={search ? "No matches." : "No currency items here yet. Add the first one."} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredCurrency.map((c, i) => (
            <ItemCard
              key={c.id}
              serial={`CU.${String(i + 1).padStart(3, "0")}`}
              title={c.denomination}
              subtitle={`${c.currency_name} · ${c.country}`}
              meta={[c.item_type, c.year].filter(Boolean).join(" · ")}
              notes={c.notes}
              photoUrl={c.photo_url}
              collected={c.collected}
              collectedDate={c.collected_date}
              onToggle={() => toggleCurrency(c)}
              onPhotoSelected={(file) => uploadCurrencyPhoto(c, file)}
              onEdit={() => setEditingCurrency(c)}
              onDelete={() => deleteCurrency(c)}
            />
          ))}
        </div>
      )}

      {showAdd && tab === "notes" && (
        <AddItemForm fields={NOTE_FIELDS} onSubmit={addNote} onClose={() => setShowAdd(false)} />
      )}
      {editingNote && (
        <AddItemForm
          fields={NOTE_FIELDS}
          initialValues={noteToFormValues(editingNote)}
          heading="Edit entry"
          submitLabel="Save"
          onSubmit={(v) => updateNote(editingNote, v)}
          onClose={() => setEditingNote(null)}
        />
      )}
      {showAdd && tab === "currency" && (
        <AddCurrencyForm
          onSubmit={addCurrency}
          onClose={() => setShowAdd(false)}
          existingCurrencyNames={existingCurrencyNames}
        />
      )}
      {editingCurrency && (
        <AddCurrencyForm
          onSubmit={(v) => updateCurrency(editingCurrency, v)}
          onClose={() => setEditingCurrency(null)}
          initialValues={currencyToFormValues(editingCurrency)}
          existingCurrencyNames={existingCurrencyNames}
          heading="Edit entry"
          submitLabel="Save"
        />
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
