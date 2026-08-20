// Maps free-text country names (as typed into the Country field) to a flag
// emoji. Matching is case-insensitive and trims whitespace. Not every
// country on earth is listed — if a country you enter doesn't show a flag,
// it just means it isn't in this list yet and needs to be added.

const ISO2_BY_COUNTRY: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "andorra": "AD",
  "angola": "AO", "argentina": "AR", "armenia": "AM", "australia": "AU",
  "austria": "AT", "azerbaijan": "AZ", "bahamas": "BS", "bahrain": "BH",
  "bangladesh": "BD", "barbados": "BB", "belarus": "BY", "belgium": "BE",
  "belize": "BZ", "benin": "BJ", "bhutan": "BT", "bolivia": "BO",
  "bosnia and herzegovina": "BA", "botswana": "BW", "brazil": "BR",
  "brunei": "BN", "bulgaria": "BG", "burkina faso": "BF", "burundi": "BI",
  "cambodia": "KH", "cameroon": "CM", "canada": "CA", "chad": "TD",
  "chile": "CL", "china": "CN", "colombia": "CO", "costa rica": "CR",
  "croatia": "HR", "cuba": "CU", "cyprus": "CY", "czechia": "CZ",
  "czech republic": "CZ", "denmark": "DK", "djibouti": "DJ",
  "dominican republic": "DO", "ecuador": "EC", "egypt": "EG",
  "el salvador": "SV", "estonia": "EE", "ethiopia": "ET", "fiji": "FJ",
  "finland": "FI", "france": "FR", "gabon": "GA", "georgia": "GE",
  "germany": "DE", "ghana": "GH", "greece": "GR", "guatemala": "GT",
  "guyana": "GY", "haiti": "HT", "honduras": "HN", "hong kong": "HK",
  "hungary": "HU", "iceland": "IS", "india": "IN", "indonesia": "ID",
  "iran": "IR", "iraq": "IQ", "ireland": "IE", "israel": "IL",
  "italy": "IT", "jamaica": "JM", "japan": "JP", "jordan": "JO",
  "kazakhstan": "KZ", "kenya": "KE", "kuwait": "KW", "kyrgyzstan": "KG",
  "laos": "LA", "latvia": "LV", "lebanon": "LB", "liberia": "LR",
  "libya": "LY", "liechtenstein": "LI", "lithuania": "LT", "luxembourg": "LU",
  "madagascar": "MG", "malawi": "MW", "malaysia": "MY", "maldives": "MV",
  "mali": "ML", "malta": "MT", "mauritius": "MU", "mexico": "MX",
  "moldova": "MD", "monaco": "MC", "mongolia": "MN", "montenegro": "ME",
  "morocco": "MA", "mozambique": "MZ", "myanmar": "MM", "namibia": "NA",
  "nepal": "NP", "netherlands": "NL", "new zealand": "NZ", "nicaragua": "NI",
  "niger": "NE", "nigeria": "NG", "north korea": "KP",
  "north macedonia": "MK", "norway": "NO", "oman": "OM", "pakistan": "PK",
  "panama": "PA", "papua new guinea": "PG", "paraguay": "PY", "peru": "PE",
  "philippines": "PH", "poland": "PL", "portugal": "PT", "qatar": "QA",
  "romania": "RO", "russia": "RU", "rwanda": "RW", "san marino": "SM",
  "saudi arabia": "SA", "senegal": "SN", "serbia": "RS", "seychelles": "SC",
  "singapore": "SG", "slovakia": "SK", "slovenia": "SI",
  "south africa": "ZA", "south korea": "KR", "south sudan": "SS",
  "spain": "ES", "sri lanka": "LK", "sudan": "SD", "suriname": "SR",
  "sweden": "SE", "switzerland": "CH", "syria": "SY", "taiwan": "TW",
  "tajikistan": "TJ", "tanzania": "TZ", "thailand": "TH", "togo": "TG",
  "trinidad and tobago": "TT", "tunisia": "TN", "turkey": "TR",
  "turkmenistan": "TM", "uganda": "UG", "ukraine": "UA",
  "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB", "great britain": "GB",
  "england": "GB", "scotland": "GB", "wales": "GB",
  "united states": "US", "usa": "US", "us": "US", "united states of america": "US",
  "uruguay": "UY", "uzbekistan": "UZ", "vatican city": "VA", "vatican": "VA",
  "venezuela": "VE", "vietnam": "VN", "yemen": "YE", "zambia": "ZM",
  "zimbabwe": "ZW",
};

// ISO code -> emoji via regional indicator symbols.
function flagFromISO2(code: string): string {
  const base = 0x1f1e6; // regional indicator "A"
  const chars = code
    .toUpperCase()
    .split("")
    .map((c) => base + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...chars);
}

export function getFlagEmoji(country: string | null | undefined): string | null {
  if (!country) return null;
  const key = country.trim().toLowerCase();

  // Not an actual country — used as a placeholder country value for
  // generic Euro seed entries not tied to one issuing nation.
  if (key === "eurozone" || key === "euro zone" || key === "eu") {
    return "🇪🇺";
  }

  const code = ISO2_BY_COUNTRY[key];
  return code ? flagFromISO2(code) : null;
}
