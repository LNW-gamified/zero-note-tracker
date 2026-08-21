export type ZeroNote = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  year: number | null;
  identification: string | null;
  photo_url: string | null;
  collected: boolean;
  collected_date: string | null;
  notes: string | null;
  created_at: string;
};

export type PostcardStatus = "not_sent" | "sent" | "received";

export type Postcard = {
  id: string;
  name: string;
  country: string;
  city: string;
  year: number | null;
  sent_from: string | null;
  address: string | null;
  photo_url: string | null;
  status: PostcardStatus;
  sent_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_at: string;
};

export type Souvenir = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  price: number | null;
  photo_url: string | null;
  collected: boolean;
  collected_date: string | null;
  notes: string | null;
  created_at: string;
};

export type FoodItem = {
  id: string;
  name: string;
  restaurant: string;
  country: string;
  city: string | null;
  address: string | null;
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
  year: number | null;
  photo_url: string | null;
  collected: boolean;
  collected_date: string | null;
  notes: string | null;
  created_at: string;
};
