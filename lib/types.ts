export type ZeroNote = {
  id: string;
  title: string;
  country: string;
  city: string | null;
  year: number | null;
  photo_url: string | null;
  collected: boolean;
  collected_date: string | null;
  notes: string | null;
  created_at: string;
};

export type CurrencyItem = {
  id: string;
  currency_name: string;
  country: string;
  denomination: string;
  item_type: "coin" | "note";
  photo_url: string | null;
  collected: boolean;
  collected_date: string | null;
  notes: string | null;
  created_at: string;
};
