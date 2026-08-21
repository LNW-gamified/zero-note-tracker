"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadPhoto, deletePhoto } from "@/lib/storage";
import { todayLocalISODate } from "@/lib/formatDate";
import { ZeroNote, CurrencyItem, Postcard } from "@/lib/types";
import ItemCard from "@/components/ItemCard";
import ItemRow from "@/components/ItemRow";
import Tabs from "@/components/Tabs";
import AddItemForm, { Field } from "@/components/AddItemForm";
import AddCurrencyForm, { CurrencyFormValues } from "@/components/AddCurrencyForm";
import { getFlagEmoji } from "@/lib/countryFlags";

const NOTE_FIELDS: Field[] = [
  { name: "name", label: "Name", required: true, placeholder: "e.g. Atomium" },
  { name: "city", label: "City / site", placeholder: "e.g. Brussels" },
  { name: "country", label: "Country", required: true, placeholder: "e.g. Belgium" },
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

const POSTCARD_FIELDS: Field[] = [
  { name: "name", label: "Title", required: true, placeholder: "e.g. Eiffel Tower" },
  { name: "city", label: "City", required: true, placeholder: "e.g. Paris" },
  { name: "country", label: "Country", required: true, placeholder: "e.g. France" },
  { name: "year", label: "Year", type: "number", placeholder: "2026" },
  { name: "notes", label: "Notes", type: "textarea", placeholder: "Freeform notes…" },
];

function postcardToFormValues(p: Postcard): Record<string, string> {
  return {
    name: p.name,
    country: p.country,
    city: p.city,
    year: p.year ? String(p.year) : "",
    notes: p.notes ?? "",
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

const MINOR_UNIT_KEYWORDS = ["cent", "penny", "pence"];

function denominationSortValue(label: string): number {
  const match = label.match(/[\d.]+/);
  const num = match ? parseFloat(match[0]) : 0;
  const isMinorUnit = MINOR_UNIT_KEYWORDS.some((kw) => label.toLowerCase().includes(kw));
  return isMinorUnit ? num : num * 100;
}

function groupByCountry<T extends { country: string }>(items: T[]): { country: string; items: T[] }[] {
  const groups: { country: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.country === item.country) {
      last.items.push(item);
    } else {
      groups.push({ country: item.country, items: [item] });
    }
  }
  return groups;
}

export default function Home() {
  const [tab, setTab] = useState<"notes" | "currency" | "postcards">("notes");
  const [notes, setNotes] = useState<ZeroNote[]>([]);
  const [currency, setCurrency] = useState<CurrencyItem[]>([]);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingNote, setEditingNote] = useState<ZeroNote | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyItem | null>(null);
  const [editingPostcard, setEditingPostcard] = useState<Postcard | null>(null);
  const [filter, setFilter] = useState<"all" | "collected" | "not collected">("not collected");
  const [noteSort, setNoteSort] = useState<"date" | "country">("country");
  const [currencySort, setCurrencySort] = useState<"country" | "date">("country");
  const [postcardSort, setPostcardSort] = useState<"date" | "country">("country");
  const [noteCountryFilter, setNoteCountryFilter] = useState<string>("");
  const [currencyCountryFilter, setCurrencyCountryFilter] = useState<string>("");
  const [postcardCountryFilter, setPostcardCountryFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [notesRes, currencyRes, postcardsRes] = await Promise.all([
      supabase.from("zero_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("currency_items").select("*").order("country").order("item_type").order("denomination"),
      supabase.from("postcards").select("*").order("created_at", { ascending: false }),
    ]);
    if (notesRes.error) setError(notesRes.error.message);
    if (currencyRes.error) setError(currencyRes.error.message);
    if (postcardsRes.error) setError(postcardsRes.error.message);
    setNotes((notesRes.data as ZeroNote[]) ?? []);
    setCurrency((currencyRes.data as CurrencyItem[]) ?? []);
    setPostcards((postcardsRes.data as Postcard[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const existingCurrencyNames = useMemo(
    () => Array.from(new Set(currency.map((c) => c.currency_name))).sort(),
    [currency]
  );

  const noteCountries = useMemo(
    () => Array.from(new Set(notes.map((n) => n.country))).sort(),
    [notes]
  );
  const currencyCountries = useMemo(
    () => Array.from(new Set(currency.map((c) => c.country))).sort(),
    [currency]
  );
  const postcardCountries = useMemo(
    () => Array.from(new Set(postcards.map((p) => p.country))).sort(),
    [postcards]
  );

  const filteredNotes = useMemo(() => {
    const byFilter = notes.filter((n) =>
      filter === "all" ? true : filter === "collected" ? n.collected : !n.collected
    );
    const byCountry = noteCountryFilter ? byFilter.filter((n) => n.country === noteCountryFilter) : byFilter;
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byCountry.filter((n) =>
          [n.name, n.country, n.city, n.identification, n.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : byCountry;
    if (noteSort === "country") {
      return [...bySearch].sort(
        (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)
      );
    }
    return bySearch;
  }, [notes, filter, noteSort, search, noteCountryFilter]);

  const filteredCurrency = useMemo(() => {
    const byFilter = currency.filter((c) =>
      filter === "all" ? true : filter === "collected" ? c.collected : !c.collected
    );
    const byCountry = currencyCountryFilter
      ? byFilter.filter((c) => c.country === currencyCountryFilter)
      : byFilter;
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byCountry.filter((c) =>
          [c.currency_name, c.country, c.denomination, c.item_type, c.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : byCountry;
    if (currencySort === "date") {
      return [...bySearch].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return [...bySearch].sort(
      (a, b) =>
        a.country.localeCompare(b.country) ||
        denominationSortValue(a.denomination) - denominationSortValue(b.denomination)
    );
  }, [currency, filter, search, currencySort, currencyCountryFilter]);

  const filteredPostcards = useMemo(() => {
    const byFilter = postcards.filter((p) =>
      filter === "all" ? true : filter === "collected" ? p.collected : !p.collected
    );
    const byCountry = postcardCountryFilter
      ? byFilter.filter((p) => p.country === postcardCountryFilter)
      : byFilter;
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byCountry.filter((p) =>
          [p.name, p.country, p.city, p.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : byCountry;
    if (postcardSort === "country") {
      return [...bySearch].sort(
        (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)
      );
    }
    return bySearch;
  }, [postcards, filter, postcardSort, search, postcardCountryFilter]);

  async function toggleNote(n: ZeroNote) {
    const collected = !n.collected;
    const { error } = await supabase
      .from("zero_notes")
      .update({
        collected,
        collected_date: collected ? todayLocalISODate() : null,
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
        collected_date: collected ? todayLocalISODate() : null,
      })
      .eq("id", c.id);
    if (error) return setError(error.message);
    loadAll();
  }

  async function togglePostcard(p: Postcard) {
    const collected = !p.collected;
    const { error } = await supabase
      .from("postcards")
      .update({
        collected,
        collected_date: collected ? todayLocalISODate() : null,
      })
      .eq("id", p.id);
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

  async function uploadPostcardPhoto(p: Postcard, file: File) {
    const url = await uploadPhoto(file, "postcards");
    const { error } = await supabase.from("postcards").update({ photo_url: url }).eq("id", p.id);
    if (error) return setError(error.message);
    if (p.photo_url) deletePhoto(p.photo_url).catch(() => {});
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

  function isDuplicatePostcard(
    candidate: { name: string; country: string; city: string },
    excludeId?: string
  ) {
    return postcards.some(
      (p) =>
        p.id !== excludeId &&
        norm(p.name) === norm(candidate.name) &&
        norm(p.country) === norm(candidate.country) &&
        norm(p.city) === norm(candidate.city)
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

  async function addPostcard(values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city };
    if (
      isDuplicatePostcard(candidate) &&
      !window.confirm("An entry with this title/country/city already exists. Add it anyway?")
    ) {
      return;
    }
    const { error } = await supabase.from("postcards").insert({
      name: values.name,
      country: values.country,
      city: values.city,
      year: values.year ? Number(values.year) : null,
      notes: values.notes || null,
    });
    if (error) return setError(error.message);
    loadAll();
  }

  async function updatePostcard(original: Postcard, values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city };
    if (
      isDuplicatePostcard(candidate, original.id) &&
      !window.confirm("Another entry with this title/country/city already exists. Save anyway?")
    ) {
      return;
    }
    const { error } = await supabase
      .from("postcards")
      .update({
        name: values.name,
        country: values.country,
        city: values.city,
        year: values.year ? Number(values.year) : null,
        notes: values.notes || null,
      })
      .eq("id", original.id);
    if (error) return setError(error.message);
    setEditingPostcard(null);
    loadAll();
  }

  async function deletePostcard(p: Postcard) {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("postcards").delete().eq("id", p.id);
    if (error) return setError(error.message);
    if (p.photo_url) deletePhoto(p.photo_url).catch(() => {});
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
  const postcardCount = `${postcards.filter((p) => p.collected).length}/${postcards.length}`;

  function noteCardProps(n: ZeroNote) {
    return {
      addedAt: n.created_at,
      title: n.name,
      subtitle: [n.city, n.country].filter(Boolean).join(", "),
      meta: [n.year, n.identification].filter(Boolean).join(" · ") || undefined,
      notes: n.notes,
      country: n.country,
      photoUrl: n.photo_url,
      collected: n.collected,
      collectedDate: n.collected_date,
      onToggle: () => toggleNote(n),
      onPhotoSelected: (file: File) => uploadNotePhoto(n, file),
      onEdit: () => setEditingNote(n),
      onDelete: () => deleteNote(n),
    };
  }

  function currencyCardProps(c: CurrencyItem) {
    return {
      addedAt: c.created_at,
      title: c.denomination,
      subtitle: `${c.currency_name} · ${c.country}`,
      meta: [c.item_type, c.year].filter(Boolean).join(" · "),
      notes: c.notes,
      country: c.country,
      photoUrl: c.photo_url,
      collected: c.collected,
      collectedDate: c.collected_date,
      onToggle: () => toggleCurrency(c),
      onPhotoSelected: (file: File) => uploadCurrencyPhoto(c, file),
      onEdit: () => setEditingCurrency(c),
      onDelete: () => deleteCurrency(c),
    };
  }

  function postcardCardProps(p: Postcard) {
    return {
      addedAt: p.created_at,
      title: p.name,
      subtitle: [p.city, p.country].filter(Boolean).join(", "),
      meta: p.year ? String(p.year) : undefined,
      notes: p.notes,
      country: p.country,
      photoUrl: p.photo_url,
      collected: p.collected,
      collectedDate: p.collected_date,
      verb: "Sent",
      onToggle: () => togglePostcard(p),
      onPhotoSelected: (file: File) => uploadPostcardPhoto(p, file),
      onEdit: () => setEditingPostcard(p),
      onDelete: () => deletePostcard(p),
    };
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-8 sm:px-8">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">Personal catalog</p>
        <h1 className="font-display text-3xl italic text-ink sm:text-4xl">The Ledger</h1>
        <p className="mt-1 text-sm text-ink/60">
          Zero-euro souvenir notes and world currency, tracked one stamp at a time.
        </p>
      </header>

      <Tabs
        active={tab}
        onChange={setTab}
        counts={{ notes: noteCount, currency: currencyCount, postcards: postcardCount }}
      />

      <div className="sticky top-0 z-30 -mx-4 my-4 flex flex-wrap items-center justify-between gap-2 bg-paper px-4 py-3 sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 font-mono text-xs uppercase tracking-widest">
            {(["not collected", "collected", "all"] as const).map((f) => (
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
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30"
            >
              <circle cx="8.5" cy="8.5" r="6" />
              <path d="M13.5 13.5 18 18" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="rounded-sm border border-ink/30 bg-[#1e2530] py-1 pl-7 pr-2 text-sm text-ink/80 placeholder:text-ink/30"
            />
          </div>
          {tab === "notes" ? (
            <select
              value={noteCountryFilter}
              onChange={(e) => setNoteCountryFilter(e.target.value)}
              className="min-w-[130px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
            >
              <option value="">All countries</option>
              {noteCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : tab === "currency" ? (
            <select
              value={currencyCountryFilter}
              onChange={(e) => setCurrencyCountryFilter(e.target.value)}
              className="min-w-[130px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
            >
              <option value="">All countries</option>
              {currencyCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={postcardCountryFilter}
              onChange={(e) => setPostcardCountryFilter(e.target.value)}
              className="min-w-[130px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
            >
              <option value="">All countries</option>
              {postcardCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 font-mono text-xs uppercase tracking-widest">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-sm border px-2 py-1 ${
                viewMode === "grid" ? "border-ink bg-ink text-paper" : "border-ink/30 text-ink/60"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-sm border px-2 py-1 ${
                viewMode === "list" ? "border-ink bg-ink text-paper" : "border-ink/30 text-ink/60"
              }`}
            >
              List
            </button>
          </div>
          {tab === "notes" ? (
            <select
              value={noteSort}
              onChange={(e) => setNoteSort(e.target.value as "date" | "country")}
              className="min-w-[104px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
            >
              <option value="country">Country</option>
              <option value="date">Newest</option>
            </select>
          ) : tab === "currency" ? (
            <select
              value={currencySort}
              onChange={(e) => setCurrencySort(e.target.value as "country" | "date")}
              className="min-w-[104px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
            >
              <option value="country">Country</option>
              <option value="date">Newest</option>
            </select>
          ) : (
            <select
              value={postcardSort}
              onChange={(e) => setPostcardSort(e.target.value as "date" | "country")}
              className="min-w-[104px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
            >
              <option value="country">Country</option>
              <option value="date">Newest</option>
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
        ) : noteSort === "country" ? (
          <div className="flex flex-col">
            {groupByCountry(filteredNotes).map((group) => (
              <div key={group.country} className="mb-5">
                <GroupHeader country={group.country} count={group.items.length} />
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((n) => (
                      <ItemCard key={n.id} {...noteCardProps(n)} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {group.items.map((n) => (
                      <ItemRow key={n.id} {...noteCardProps(n)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredNotes.map((n) => (
              <ItemCard key={n.id} {...noteCardProps(n)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredNotes.map((n) => (
              <ItemRow key={n.id} {...noteCardProps(n)} />
            ))}
          </div>
        )
      ) : tab === "currency" ? (
        filteredCurrency.length === 0 ? (
          <EmptyState label={search ? "No matches." : "No currency items here yet. Add the first one."} />
        ) : currencySort === "country" ? (
          <div className="flex flex-col">
            {groupByCountry(filteredCurrency).map((group) => (
              <div key={group.country} className="mb-5">
                <GroupHeader country={group.country} count={group.items.length} />
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((c) => (
                      <ItemCard key={c.id} {...currencyCardProps(c)} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {group.items.map((c) => (
                      <ItemRow key={c.id} {...currencyCardProps(c)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredCurrency.map((c) => (
              <ItemCard key={c.id} {...currencyCardProps(c)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredCurrency.map((c) => (
              <ItemRow key={c.id} {...currencyCardProps(c)} />
            ))}
          </div>
        )
      ) : filteredPostcards.length === 0 ? (
        <EmptyState label={search ? "No matches." : "No postcards here yet. Add the first one."} />
      ) : postcardSort === "country" ? (
        <div className="flex flex-col">
          {groupByCountry(filteredPostcards).map((group) => (
            <div key={group.country} className="mb-5">
              <GroupHeader country={group.country} count={group.items.length} />
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((p) => (
                    <ItemCard key={p.id} {...postcardCardProps(p)} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col">
                  {group.items.map((p) => (
                    <ItemRow key={p.id} {...postcardCardProps(p)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredPostcards.map((p) => (
            <ItemCard key={p.id} {...postcardCardProps(p)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {filteredPostcards.map((p) => (
            <ItemRow key={p.id} {...postcardCardProps(p)} />
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
          photoUrl={editingNote.photo_url}
          onPhotoSelected={(file) => uploadNotePhoto(editingNote, file)}
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
          photoUrl={editingCurrency.photo_url}
          onPhotoSelected={(file) => uploadCurrencyPhoto(editingCurrency, file)}
        />
      )}
      {showAdd && tab === "postcards" && (
        <AddItemForm fields={POSTCARD_FIELDS} onSubmit={addPostcard} onClose={() => setShowAdd(false)} />
      )}
      {editingPostcard && (
        <AddItemForm
          fields={POSTCARD_FIELDS}
          initialValues={postcardToFormValues(editingPostcard)}
          heading="Edit entry"
          submitLabel="Save"
          photoUrl={editingPostcard.photo_url}
          onPhotoSelected={(file) => uploadPostcardPhoto(editingPostcard, file)}
          onSubmit={(v) => updatePostcard(editingPostcard, v)}
          onClose={() => setEditingPostcard(null)}
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

function GroupHeader({ country, count }: { country: string; count: number }) {
  const flag = getFlagEmoji(country);
  return (
    <div className="mb-2 flex items-center gap-2 border-b border-ink/10 pb-1">
      {flag && <span className="flag-outline text-2xl leading-none">{flag}</span>}
      <h2 className="font-display text-lg text-ink">{country}</h2>
      <span className="font-mono text-xs text-ink/40">{count}</span>
    </div>
  );
}
