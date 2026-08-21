"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { uploadPhoto, deletePhoto } from "@/lib/storage";
import { todayLocalISODate } from "@/lib/formatDate";
import { ZeroNote, CurrencyItem, Postcard, PostcardStatus, Souvenir, FoodItem } from "@/lib/types";
import ItemCard from "@/components/ItemCard";
import ItemRow from "@/components/ItemRow";
import PostcardCard from "@/components/PostcardCard";
import PostcardRow from "@/components/PostcardRow";
import Tabs, { TabKey } from "@/components/Tabs";
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
  { name: "sent_from", label: "Sent from", placeholder: "e.g. The Louvre, a corner bookstore" },
  { name: "address", label: "Address", placeholder: "e.g. Rue de Rivoli, 75001 Paris" },
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
    sent_from: p.sent_from ?? "",
    address: p.address ?? "",
    year: p.year ? String(p.year) : "",
    notes: p.notes ?? "",
  };
}

const SOUVENIR_FIELDS: Field[] = [
  { name: "name", label: "Item", required: true, placeholder: "e.g. Hand-painted tile" },
  { name: "price", label: "Price", type: "number", step: "0.01", placeholder: "0.00" },
  { name: "place", label: "Place bought", placeholder: "e.g. Local artisan market" },
  { name: "address", label: "Address", placeholder: "e.g. Rua Augusta, Lisbon" },
  { name: "city", label: "City", placeholder: "e.g. Lisbon" },
  { name: "country", label: "Country", required: true, placeholder: "e.g. Portugal" },
  { name: "notes", label: "Notes", type: "textarea", placeholder: "Freeform notes…" },
];

function souvenirToFormValues(s: Souvenir): Record<string, string> {
  return {
    name: s.name,
    country: s.country,
    city: s.city ?? "",
    place: s.place ?? "",
    address: s.address ?? "",
    price: s.price != null ? String(s.price) : "",
    notes: s.notes ?? "",
  };
}

const FOOD_FIELDS: Field[] = [
  { name: "name", label: "Dish", required: true, placeholder: "e.g. Pastel de nata" },
  { name: "restaurant", label: "Restaurant", required: true, placeholder: "e.g. Manteigaria" },
  { name: "address", label: "Address", placeholder: "e.g. Rua do Loreto 2, Lisbon" },
  { name: "city", label: "City", placeholder: "e.g. Lisbon" },
  { name: "country", label: "Country", required: true, placeholder: "e.g. Portugal" },
  { name: "notes", label: "Notes", type: "textarea", placeholder: "Freeform notes…" },
];

function foodToFormValues(f: FoodItem): Record<string, string> {
  return {
    name: f.name,
    restaurant: f.restaurant,
    country: f.country,
    city: f.city ?? "",
    address: f.address ?? "",
    notes: f.notes ?? "",
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

const FILTER_VERB: Record<TabKey, string> = {
  notes: "collected",
  currency: "collected",
  postcards: "sent",
  souvenirs: "bought",
  food: "tried",
  country: "collected",
};

const MINOR_UNIT_KEYWORDS = ["cent", "penny", "pence", "rappen"];

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
  const [tab, setTab] = useState<TabKey>("notes");
  const [notes, setNotes] = useState<ZeroNote[]>([]);
  const [currency, setCurrency] = useState<CurrencyItem[]>([]);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [food, setFood] = useState<FoodItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingNote, setEditingNote] = useState<ZeroNote | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyItem | null>(null);
  const [editingPostcard, setEditingPostcard] = useState<Postcard | null>(null);
  const [editingSouvenir, setEditingSouvenir] = useState<Souvenir | null>(null);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [filter, setFilter] = useState<"all" | "collected" | "not collected">("not collected");
  const [postcardStatusFilter, setPostcardStatusFilter] = useState<"all" | PostcardStatus>("not_sent");
  const [noteSort, setNoteSort] = useState<"date" | "country">("country");
  const [currencySort, setCurrencySort] = useState<"country" | "date">("country");
  const [postcardSort, setPostcardSort] = useState<"date" | "country">("country");
  const [souvenirSort, setSouvenirSort] = useState<"date" | "country">("country");
  const [foodSort, setFoodSort] = useState<"date" | "country">("country");
  const [noteCountryFilter, setNoteCountryFilter] = useState<string>("");
  const [currencyCountryFilter, setCurrencyCountryFilter] = useState<string>("");
  const [postcardCountryFilter, setPostcardCountryFilter] = useState<string>("");
  const [souvenirCountryFilter, setSouvenirCountryFilter] = useState<string>("");
  const [foodCountryFilter, setFoodCountryFilter] = useState<string>("");
  const [countryViewSelection, setCountryViewSelection] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [notesRes, currencyRes, postcardsRes, souvenirsRes, foodRes] = await Promise.all([
      supabase.from("zero_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("currency_items").select("*").order("country").order("item_type").order("denomination"),
      supabase.from("postcards").select("*").order("created_at", { ascending: false }),
      supabase.from("souvenirs").select("*").order("created_at", { ascending: false }),
      supabase.from("food_items").select("*").order("created_at", { ascending: false }),
    ]);
    if (notesRes.error) setError(notesRes.error.message);
    if (currencyRes.error) setError(currencyRes.error.message);
    if (postcardsRes.error) setError(postcardsRes.error.message);
    if (souvenirsRes.error) setError(souvenirsRes.error.message);
    if (foodRes.error) setError(foodRes.error.message);
    setNotes((notesRes.data as ZeroNote[]) ?? []);
    setCurrency((currencyRes.data as CurrencyItem[]) ?? []);
    setPostcards((postcardsRes.data as Postcard[]) ?? []);
    setSouvenirs((souvenirsRes.data as Souvenir[]) ?? []);
    setFood((foodRes.data as FoodItem[]) ?? []);
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
  const souvenirCountries = useMemo(
    () => Array.from(new Set(souvenirs.map((s) => s.country))).sort(),
    [souvenirs]
  );
  const foodCountries = useMemo(
    () => Array.from(new Set(food.map((f) => f.country))).sort(),
    [food]
  );
  const allCountries = useMemo(
    () =>
      Array.from(
        new Set([
          ...notes.map((n) => n.country),
          ...currency.map((c) => c.country),
          ...postcards.map((p) => p.country),
          ...souvenirs.map((s) => s.country),
          ...food.map((f) => f.country),
        ])
      ).sort(),
    [notes, currency, postcards, souvenirs, food]
  );

  const countryNotes = useMemo(
    () =>
      notes.filter((n) => n.country === countryViewSelection).sort((a, b) => a.name.localeCompare(b.name)),
    [notes, countryViewSelection]
  );
  const countryCurrency = useMemo(
    () =>
      currency
        .filter((c) => c.country === countryViewSelection)
        .sort((a, b) => denominationSortValue(a.denomination) - denominationSortValue(b.denomination)),
    [currency, countryViewSelection]
  );
  const countryPostcards = useMemo(
    () =>
      postcards
        .filter((p) => p.country === countryViewSelection)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [postcards, countryViewSelection]
  );
  const countrySouvenirs = useMemo(
    () =>
      souvenirs
        .filter((s) => s.country === countryViewSelection)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [souvenirs, countryViewSelection]
  );
  const countryFood = useMemo(
    () => food.filter((f) => f.country === countryViewSelection).sort((a, b) => a.name.localeCompare(b.name)),
    [food, countryViewSelection]
  );
  const countryViewTotal =
    countryNotes.length + countryCurrency.length + countryPostcards.length + countrySouvenirs.length + countryFood.length;

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
      postcardStatusFilter === "all" ? true : p.status === postcardStatusFilter
    );
    const byCountry = postcardCountryFilter
      ? byFilter.filter((p) => p.country === postcardCountryFilter)
      : byFilter;
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byCountry.filter((p) =>
          [p.name, p.country, p.city, p.sent_from, p.address, p.notes]
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
  }, [postcards, postcardStatusFilter, postcardSort, search, postcardCountryFilter]);

  const filteredSouvenirs = useMemo(() => {
    const byFilter = souvenirs.filter((s) =>
      filter === "all" ? true : filter === "collected" ? s.collected : !s.collected
    );
    const byCountry = souvenirCountryFilter
      ? byFilter.filter((s) => s.country === souvenirCountryFilter)
      : byFilter;
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byCountry.filter((s) =>
          [s.name, s.country, s.city, s.place, s.address, s.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : byCountry;
    if (souvenirSort === "country") {
      return [...bySearch].sort(
        (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)
      );
    }
    return bySearch;
  }, [souvenirs, filter, souvenirSort, search, souvenirCountryFilter]);

  const souvenirBudgetSpent = useMemo(
    () => souvenirs.filter((s) => s.collected).reduce((sum, s) => sum + (s.price ?? 0), 0),
    [souvenirs]
  );

  const filteredFood = useMemo(() => {
    const byFilter = food.filter((f) =>
      filter === "all" ? true : filter === "collected" ? f.collected : !f.collected
    );
    const byCountry = foodCountryFilter ? byFilter.filter((f) => f.country === foodCountryFilter) : byFilter;
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? byCountry.filter((f) =>
          [f.name, f.restaurant, f.country, f.city, f.notes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : byCountry;
    if (foodSort === "country") {
      return [...bySearch].sort(
        (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)
      );
    }
    return bySearch;
  }, [food, filter, foodSort, search, foodCountryFilter]);

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

  async function setPostcardStatus(p: Postcard, status: PostcardStatus) {
    const updates: { status: PostcardStatus; sent_date: string | null; received_date: string | null } =
      status === "not_sent"
        ? { status, sent_date: null, received_date: null }
        : status === "sent"
          ? { status, sent_date: p.sent_date ?? todayLocalISODate(), received_date: null }
          : { status, sent_date: p.sent_date ?? todayLocalISODate(), received_date: todayLocalISODate() };
    const { error } = await supabase.from("postcards").update(updates).eq("id", p.id);
    if (error) return setError(error.message);
    loadAll();
  }

  async function toggleSouvenir(s: Souvenir) {
    const collected = !s.collected;
    const { error } = await supabase
      .from("souvenirs")
      .update({
        collected,
        collected_date: collected ? todayLocalISODate() : null,
      })
      .eq("id", s.id);
    if (error) return setError(error.message);
    loadAll();
  }

  async function toggleFood(f: FoodItem) {
    const collected = !f.collected;
    const { error } = await supabase
      .from("food_items")
      .update({
        collected,
        collected_date: collected ? todayLocalISODate() : null,
      })
      .eq("id", f.id);
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

  async function uploadSouvenirPhoto(s: Souvenir, file: File) {
    const url = await uploadPhoto(file, "souvenirs");
    const { error } = await supabase.from("souvenirs").update({ photo_url: url }).eq("id", s.id);
    if (error) return setError(error.message);
    if (s.photo_url) deletePhoto(s.photo_url).catch(() => {});
    loadAll();
  }

  async function uploadFoodPhoto(f: FoodItem, file: File) {
    const url = await uploadPhoto(file, "food");
    const { error } = await supabase.from("food_items").update({ photo_url: url }).eq("id", f.id);
    if (error) return setError(error.message);
    if (f.photo_url) deletePhoto(f.photo_url).catch(() => {});
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

  function isDuplicateSouvenir(
    candidate: { name: string; country: string; city: string | null },
    excludeId?: string
  ) {
    return souvenirs.some(
      (s) =>
        s.id !== excludeId &&
        norm(s.name) === norm(candidate.name) &&
        norm(s.country) === norm(candidate.country) &&
        norm(s.city) === norm(candidate.city)
    );
  }

  function isDuplicateFood(
    candidate: { name: string; restaurant: string; country: string },
    excludeId?: string
  ) {
    return food.some(
      (f) =>
        f.id !== excludeId &&
        norm(f.name) === norm(candidate.name) &&
        norm(f.restaurant) === norm(candidate.restaurant) &&
        norm(f.country) === norm(candidate.country)
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
      return false;
    }
    const { error } = await supabase.from("zero_notes").insert({
      name: values.name,
      country: values.country,
      city: values.city || null,
      year: values.year ? Number(values.year) : null,
      identification: values.identification || null,
      notes: values.notes || null,
    });
    if (error) {
      setError(error.message);
      return false;
    }
    loadAll();
    return true;
  }

  async function updateNote(original: ZeroNote, values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city || null };
    if (
      isDuplicateNote(candidate, original.id) &&
      !window.confirm("Another entry with this name/country/city already exists. Save anyway?")
    ) {
      return false;
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
    if (error) {
      setError(error.message);
      return false;
    }
    setEditingNote(null);
    loadAll();
    return true;
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
      return false;
    }
    const { error } = await supabase.from("postcards").insert({
      name: values.name,
      country: values.country,
      city: values.city,
      sent_from: values.sent_from || null,
      address: values.address || null,
      year: values.year ? Number(values.year) : null,
      notes: values.notes || null,
    });
    if (error) {
      setError(error.message);
      return false;
    }
    loadAll();
    return true;
  }

  async function updatePostcard(original: Postcard, values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city };
    if (
      isDuplicatePostcard(candidate, original.id) &&
      !window.confirm("Another entry with this title/country/city already exists. Save anyway?")
    ) {
      return false;
    }
    const { error } = await supabase
      .from("postcards")
      .update({
        name: values.name,
        country: values.country,
        city: values.city,
        sent_from: values.sent_from || null,
        address: values.address || null,
        year: values.year ? Number(values.year) : null,
        notes: values.notes || null,
      })
      .eq("id", original.id);
    if (error) {
      setError(error.message);
      return false;
    }
    setEditingPostcard(null);
    loadAll();
    return true;
  }

  async function deletePostcard(p: Postcard) {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("postcards").delete().eq("id", p.id);
    if (error) return setError(error.message);
    if (p.photo_url) deletePhoto(p.photo_url).catch(() => {});
    loadAll();
  }

  async function addSouvenir(values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city || null };
    if (
      isDuplicateSouvenir(candidate) &&
      !window.confirm("An entry with this item/country/city already exists. Add it anyway?")
    ) {
      return false;
    }
    const { error } = await supabase.from("souvenirs").insert({
      name: values.name,
      country: values.country,
      city: values.city || null,
      place: values.place || null,
      address: values.address || null,
      price: values.price ? Number(values.price) : null,
      notes: values.notes || null,
    });
    if (error) {
      setError(error.message);
      return false;
    }
    loadAll();
    return true;
  }

  async function updateSouvenir(original: Souvenir, values: Record<string, string>) {
    const candidate = { name: values.name, country: values.country, city: values.city || null };
    if (
      isDuplicateSouvenir(candidate, original.id) &&
      !window.confirm("Another entry with this item/country/city already exists. Save anyway?")
    ) {
      return false;
    }
    const { error } = await supabase
      .from("souvenirs")
      .update({
        name: values.name,
        country: values.country,
        city: values.city || null,
        place: values.place || null,
        address: values.address || null,
        price: values.price ? Number(values.price) : null,
        notes: values.notes || null,
      })
      .eq("id", original.id);
    if (error) {
      setError(error.message);
      return false;
    }
    setEditingSouvenir(null);
    loadAll();
    return true;
  }

  async function deleteSouvenir(s: Souvenir) {
    if (!window.confirm(`Delete "${s.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("souvenirs").delete().eq("id", s.id);
    if (error) return setError(error.message);
    if (s.photo_url) deletePhoto(s.photo_url).catch(() => {});
    loadAll();
  }

  async function addFood(values: Record<string, string>) {
    const candidate = { name: values.name, restaurant: values.restaurant, country: values.country };
    if (
      isDuplicateFood(candidate) &&
      !window.confirm("An entry with this dish/restaurant/country already exists. Add it anyway?")
    ) {
      return false;
    }
    const { error } = await supabase.from("food_items").insert({
      name: values.name,
      restaurant: values.restaurant,
      country: values.country,
      city: values.city || null,
      address: values.address || null,
      notes: values.notes || null,
    });
    if (error) {
      setError(error.message);
      return false;
    }
    loadAll();
    return true;
  }

  async function updateFood(original: FoodItem, values: Record<string, string>) {
    const candidate = { name: values.name, restaurant: values.restaurant, country: values.country };
    if (
      isDuplicateFood(candidate, original.id) &&
      !window.confirm("Another entry with this dish/restaurant/country already exists. Save anyway?")
    ) {
      return false;
    }
    const { error } = await supabase
      .from("food_items")
      .update({
        name: values.name,
        restaurant: values.restaurant,
        country: values.country,
        city: values.city || null,
        address: values.address || null,
        notes: values.notes || null,
      })
      .eq("id", original.id);
    if (error) {
      setError(error.message);
      return false;
    }
    setEditingFood(null);
    loadAll();
    return true;
  }

  async function deleteFood(f: FoodItem) {
    if (!window.confirm(`Delete "${f.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("food_items").delete().eq("id", f.id);
    if (error) return setError(error.message);
    if (f.photo_url) deletePhoto(f.photo_url).catch(() => {});
    loadAll();
  }

  async function addCurrency(values: CurrencyFormValues) {
    if (
      isDuplicateCurrency(values) &&
      !window.confirm("An entry with this currency/denomination/country already exists. Add it anyway?")
    ) {
      return false;
    }
    const { error } = await supabase.from("currency_items").insert({
      currency_name: values.currency_name,
      country: values.country,
      denomination: values.denomination,
      item_type: values.item_type,
      year: values.year ? Number(values.year) : null,
      notes: values.notes || null,
    });
    if (error) {
      setError(error.message);
      return false;
    }
    loadAll();
    return true;
  }

  async function updateCurrency(original: CurrencyItem, values: CurrencyFormValues) {
    if (
      isDuplicateCurrency(values, original.id) &&
      !window.confirm("Another entry with this currency/denomination/country already exists. Save anyway?")
    ) {
      return false;
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
    if (error) {
      setError(error.message);
      return false;
    }
    setEditingCurrency(null);
    loadAll();
    return true;
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
  const postcardCount = `${postcards.filter((p) => p.status === "received").length}/${postcards.length}`;
  const souvenirCount = `${souvenirs.filter((s) => s.collected).length}/${souvenirs.length}`;
  const foodCount = `${food.filter((f) => f.collected).length}/${food.length}`;

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
      subtitle: [p.sent_from, p.city, p.country].filter(Boolean).join(", "),
      meta: p.year ? String(p.year) : undefined,
      notes: p.notes,
      country: p.country,
      address: p.address,
      photoUrl: p.photo_url,
      status: p.status,
      sentDate: p.sent_date,
      receivedDate: p.received_date,
      onMarkSent: () => setPostcardStatus(p, "sent"),
      onMarkReceived: () => setPostcardStatus(p, "received"),
      onMarkNotSent: () => setPostcardStatus(p, "not_sent"),
      onMarkNotReceived: () => setPostcardStatus(p, "sent"),
      onPhotoSelected: (file: File) => uploadPostcardPhoto(p, file),
      onEdit: () => setEditingPostcard(p),
      onDelete: () => deletePostcard(p),
    };
  }

  function souvenirCardProps(s: Souvenir) {
    return {
      addedAt: s.created_at,
      title: s.name,
      subtitle: [s.place, s.city, s.country].filter(Boolean).join(", "),
      meta: s.price != null ? `$${s.price.toFixed(2)}` : undefined,
      notes: s.notes,
      country: s.country,
      address: s.address,
      photoUrl: s.photo_url,
      collected: s.collected,
      collectedDate: s.collected_date,
      verb: "Bought",
      onToggle: () => toggleSouvenir(s),
      onPhotoSelected: (file: File) => uploadSouvenirPhoto(s, file),
      onEdit: () => setEditingSouvenir(s),
      onDelete: () => deleteSouvenir(s),
    };
  }

  function foodCardProps(f: FoodItem) {
    return {
      addedAt: f.created_at,
      title: f.name,
      subtitle: [f.restaurant, f.city].filter(Boolean).join(", "),
      meta: f.country,
      notes: f.notes,
      country: f.country,
      address: f.address,
      photoUrl: f.photo_url,
      collected: f.collected,
      collectedDate: f.collected_date,
      verb: "Tried",
      onToggle: () => toggleFood(f),
      onPhotoSelected: (file: File) => uploadFoodPhoto(f, file),
      onEdit: () => setEditingFood(f),
      onDelete: () => deleteFood(f),
    };
  }

  const countryFilterConfig: Record<
    TabKey,
    { value: string; setValue: (v: string) => void; options: string[] }
  > = {
    notes: { value: noteCountryFilter, setValue: setNoteCountryFilter, options: noteCountries },
    currency: { value: currencyCountryFilter, setValue: setCurrencyCountryFilter, options: currencyCountries },
    postcards: { value: postcardCountryFilter, setValue: setPostcardCountryFilter, options: postcardCountries },
    souvenirs: { value: souvenirCountryFilter, setValue: setSouvenirCountryFilter, options: souvenirCountries },
    food: { value: foodCountryFilter, setValue: setFoodCountryFilter, options: foodCountries },
    country: { value: "", setValue: () => {}, options: [] },
  };
  const activeCountryFilter = countryFilterConfig[tab];

  const sortConfig: Record<TabKey, { value: "date" | "country"; setValue: (v: "date" | "country") => void }> = {
    notes: { value: noteSort, setValue: setNoteSort },
    currency: { value: currencySort, setValue: setCurrencySort },
    postcards: { value: postcardSort, setValue: setPostcardSort },
    souvenirs: { value: souvenirSort, setValue: setSouvenirSort },
    food: { value: foodSort, setValue: setFoodSort },
    country: { value: "country", setValue: () => {} },
  };
  const activeSort = sortConfig[tab];

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
        onChange={(t) => {
          setTab(t);
          setSearch("");
        }}
        counts={{
          notes: noteCount,
          currency: currencyCount,
          postcards: postcardCount,
          souvenirs: souvenirCount,
          food: foodCount,
          country: String(allCountries.length),
        }}
      />

      {tab === "souvenirs" && (
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-gold">
          Spent so far: ${souvenirBudgetSpent.toFixed(2)}
        </p>
      )}

      {tab === "country" ? (
        <div className="sticky top-0 z-30 -mx-4 my-4 flex flex-wrap items-center justify-between gap-2 bg-paper px-4 py-3 sm:-mx-8 sm:px-8">
          <select
            value={countryViewSelection}
            onChange={(e) => setCountryViewSelection(e.target.value)}
            className="min-w-[160px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
          >
            <option value="">Choose a country…</option>
            {allCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
        </div>
      ) : (
      <div className="sticky top-0 z-30 -mx-4 my-4 flex flex-wrap items-center justify-between gap-2 bg-paper px-4 py-3 sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 font-mono text-xs uppercase tracking-widest">
            {tab === "postcards"
              ? (["not_sent", "sent", "received", "all"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPostcardStatusFilter(f)}
                    className={`rounded-sm border px-2 py-1 ${
                      postcardStatusFilter === f
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/30 text-ink/60"
                    }`}
                  >
                    {f === "all" ? "all" : f === "not_sent" ? "not sent" : f}
                  </button>
                ))
              : (["not collected", "collected", "all"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-sm border px-2 py-1 ${
                      filter === f ? "border-ink bg-ink text-paper" : "border-ink/30 text-ink/60"
                    }`}
                  >
                    {f === "all" ? "all" : f === "collected" ? FILTER_VERB[tab] : `not ${FILTER_VERB[tab]}`}
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
          <select
            value={activeCountryFilter.value}
            onChange={(e) => activeCountryFilter.setValue(e.target.value)}
            className="min-w-[130px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
          >
            <option value="">All countries</option>
            {activeCountryFilter.options.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
          <select
            value={activeSort.value}
            onChange={(e) => activeSort.setValue(e.target.value as "date" | "country")}
            className="min-w-[104px] rounded-sm border border-ink/30 bg-[#1e2530] px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink/70"
          >
            <option value="country">Country</option>
            <option value="date">Newest</option>
          </select>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-sm border border-stamp bg-stamp px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-paper"
          >
            + Add
          </button>
        </div>
      </div>
      )}

      {error && (
        <p className="mb-4 rounded-sm border border-stamp bg-stamp/10 px-3 py-2 text-sm text-stamp">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : tab === "country" ? (
        !countryViewSelection ? (
          <EmptyState label="Pick a country to see everything from that trip." />
        ) : countryViewTotal === 0 ? (
          <EmptyState label={`Nothing saved for ${countryViewSelection} yet.`} />
        ) : (
          (() => {
            const activeNotes = countryNotes.filter((n) => !n.collected);
            const doneNotes = countryNotes.filter((n) => n.collected);
            const activeCurrency = countryCurrency.filter((c) => !c.collected);
            const doneCurrency = countryCurrency.filter((c) => c.collected);
            const activePostcards = countryPostcards.filter((p) => p.status !== "received");
            const donePostcards = countryPostcards.filter((p) => p.status === "received");
            const activeSouvenirs = countrySouvenirs.filter((s) => !s.collected);
            const doneSouvenirs = countrySouvenirs.filter((s) => s.collected);
            const activeFood = countryFood.filter((f) => !f.collected);
            const doneFood = countryFood.filter((f) => f.collected);
            const completedTotal =
              doneNotes.length + doneCurrency.length + donePostcards.length + doneSouvenirs.length + doneFood.length;

            return (
              <div>
                <GroupHeader country={countryViewSelection} count={countryViewTotal} />
                <CategorySection
                  title="0€ Notes"
                  items={activeNotes}
                  viewMode={viewMode}
                  gridItem={(n) => <ItemCard key={n.id} {...noteCardProps(n)} />}
                  listItem={(n) => <ItemRow key={n.id} {...noteCardProps(n)} />}
                />
                <CategorySection
                  title="Currency"
                  items={activeCurrency}
                  viewMode={viewMode}
                  gridItem={(c) => <ItemCard key={c.id} {...currencyCardProps(c)} />}
                  listItem={(c) => <ItemRow key={c.id} {...currencyCardProps(c)} />}
                />
                <CategorySection
                  title="Postcards"
                  items={activePostcards}
                  viewMode={viewMode}
                  gridItem={(p) => <PostcardCard key={p.id} {...postcardCardProps(p)} />}
                  listItem={(p) => <PostcardRow key={p.id} {...postcardCardProps(p)} />}
                />
                <CategorySection
                  title="Souvenirs"
                  items={activeSouvenirs}
                  viewMode={viewMode}
                  gridItem={(s) => <ItemCard key={s.id} {...souvenirCardProps(s)} />}
                  listItem={(s) => <ItemRow key={s.id} {...souvenirCardProps(s)} />}
                />
                <CategorySection
                  title="Food"
                  items={activeFood}
                  viewMode={viewMode}
                  gridItem={(f) => <ItemCard key={f.id} {...foodCardProps(f)} />}
                  listItem={(f) => <ItemRow key={f.id} {...foodCardProps(f)} />}
                />

                {completedTotal > 0 && (
                  <div className="mt-8">
                    <div className="mb-3 flex items-center gap-2 border-b-2 border-ink/15 pb-2">
                      <h2 className="font-display text-xl text-ink">Completed</h2>
                      <span className="font-mono text-xs text-gold">{completedTotal}</span>
                    </div>
                    <CategorySection
                      title="0€ Notes"
                      items={doneNotes}
                      viewMode={viewMode}
                      gridItem={(n) => <ItemCard key={n.id} {...noteCardProps(n)} />}
                      listItem={(n) => <ItemRow key={n.id} {...noteCardProps(n)} />}
                    />
                    <CategorySection
                      title="Currency"
                      items={doneCurrency}
                      viewMode={viewMode}
                      gridItem={(c) => <ItemCard key={c.id} {...currencyCardProps(c)} />}
                      listItem={(c) => <ItemRow key={c.id} {...currencyCardProps(c)} />}
                    />
                    <CategorySection
                      title="Postcards"
                      items={donePostcards}
                      viewMode={viewMode}
                      gridItem={(p) => <PostcardCard key={p.id} {...postcardCardProps(p)} />}
                      listItem={(p) => <PostcardRow key={p.id} {...postcardCardProps(p)} />}
                    />
                    <CategorySection
                      title="Souvenirs"
                      items={doneSouvenirs}
                      viewMode={viewMode}
                      gridItem={(s) => <ItemCard key={s.id} {...souvenirCardProps(s)} />}
                      listItem={(s) => <ItemRow key={s.id} {...souvenirCardProps(s)} />}
                    />
                    <CategorySection
                      title="Food"
                      items={doneFood}
                      viewMode={viewMode}
                      gridItem={(f) => <ItemCard key={f.id} {...foodCardProps(f)} />}
                      listItem={(f) => <ItemRow key={f.id} {...foodCardProps(f)} />}
                    />
                  </div>
                )}
              </div>
            );
          })()
        )
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
      ) : tab === "postcards" ? (
        filteredPostcards.length === 0 ? (
          <EmptyState label={search ? "No matches." : "No postcards here yet. Add the first one."} />
        ) : postcardSort === "country" ? (
          <div className="flex flex-col">
            {groupByCountry(filteredPostcards).map((group) => (
              <div key={group.country} className="mb-5">
                <GroupHeader country={group.country} count={group.items.length} />
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((p) => (
                      <PostcardCard key={p.id} {...postcardCardProps(p)} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {group.items.map((p) => (
                      <PostcardRow key={p.id} {...postcardCardProps(p)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredPostcards.map((p) => (
              <PostcardCard key={p.id} {...postcardCardProps(p)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredPostcards.map((p) => (
              <PostcardRow key={p.id} {...postcardCardProps(p)} />
            ))}
          </div>
        )
      ) : tab === "souvenirs" ? (
        filteredSouvenirs.length === 0 ? (
          <EmptyState label={search ? "No matches." : "No souvenirs here yet. Add the first one."} />
        ) : souvenirSort === "country" ? (
          <div className="flex flex-col">
            {groupByCountry(filteredSouvenirs).map((group) => (
              <div key={group.country} className="mb-5">
                <GroupHeader country={group.country} count={group.items.length} />
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((s) => (
                      <ItemCard key={s.id} {...souvenirCardProps(s)} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {group.items.map((s) => (
                      <ItemRow key={s.id} {...souvenirCardProps(s)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredSouvenirs.map((s) => (
              <ItemCard key={s.id} {...souvenirCardProps(s)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredSouvenirs.map((s) => (
              <ItemRow key={s.id} {...souvenirCardProps(s)} />
            ))}
          </div>
        )
      ) : filteredFood.length === 0 ? (
        <EmptyState label={search ? "No matches." : "No food entries here yet. Add the first one."} />
      ) : foodSort === "country" ? (
        <div className="flex flex-col">
          {groupByCountry(filteredFood).map((group) => (
            <div key={group.country} className="mb-5">
              <GroupHeader country={group.country} count={group.items.length} />
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((f) => (
                    <ItemCard key={f.id} {...foodCardProps(f)} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col">
                  {group.items.map((f) => (
                    <ItemRow key={f.id} {...foodCardProps(f)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredFood.map((f) => (
            <ItemCard key={f.id} {...foodCardProps(f)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {filteredFood.map((f) => (
            <ItemRow key={f.id} {...foodCardProps(f)} />
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
      {showAdd && tab === "souvenirs" && (
        <AddItemForm fields={SOUVENIR_FIELDS} onSubmit={addSouvenir} onClose={() => setShowAdd(false)} />
      )}
      {editingSouvenir && (
        <AddItemForm
          fields={SOUVENIR_FIELDS}
          initialValues={souvenirToFormValues(editingSouvenir)}
          heading="Edit entry"
          submitLabel="Save"
          photoUrl={editingSouvenir.photo_url}
          onPhotoSelected={(file) => uploadSouvenirPhoto(editingSouvenir, file)}
          onSubmit={(v) => updateSouvenir(editingSouvenir, v)}
          onClose={() => setEditingSouvenir(null)}
        />
      )}
      {showAdd && tab === "food" && (
        <AddItemForm fields={FOOD_FIELDS} onSubmit={addFood} onClose={() => setShowAdd(false)} />
      )}
      {editingFood && (
        <AddItemForm
          fields={FOOD_FIELDS}
          initialValues={foodToFormValues(editingFood)}
          heading="Edit entry"
          submitLabel="Save"
          photoUrl={editingFood.photo_url}
          onPhotoSelected={(file) => uploadFoodPhoto(editingFood, file)}
          onSubmit={(v) => updateFood(editingFood, v)}
          onClose={() => setEditingFood(null)}
        />
      )}
    </main>
  );
}

function CategorySection<T>({
  title,
  items,
  viewMode,
  gridItem,
  listItem,
}: {
  title: string;
  items: T[];
  viewMode: "grid" | "list";
  gridItem: (item: T) => ReactNode;
  listItem: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 border-b border-ink/10 pb-1 font-display text-lg text-ink">
        {title}
        <span className="font-mono text-xs text-ink/40">{items.length}</span>
      </h2>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map(gridItem)}</div>
      ) : (
        <div className="flex flex-col">{items.map(listItem)}</div>
      )}
    </div>
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
