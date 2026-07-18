export const CURRENCY = "₦";

export function formatNaira(amount: number): string {
  return CURRENCY + Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"] as const;
export const ALL_COLORS = [
  "Black",
  "White",
  "Grey",
  "Red",
  "Blue",
  "Navy",
  "Green",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Brown",
  "Beige",
  "Gold",
  "Silver",
] as const;

/** Staff roles that can be assigned to team members. */
export const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin", desc: "Full access to everything" },
  { value: "support_manager", label: "Support Manager", desc: "Handles customer support" },
  { value: "delivery_support", label: "Delivery Support", desc: "Manages deliveries & orders" },
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]["value"];

export function roleLabel(role: string): string {
  return ASSIGNABLE_ROLES.find((r) => r.value === role)?.label ?? role;
}

export type ProductImage = string;

export interface ProductColorTag {
  id: string;
  product_id: string;
  image_index: number;
  color_name: string;
  color_code: string;
  created_at: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  images: ProductImage[];
  cost_price: number;
  shipping_fee: number;
  selling_price: number;
  stock: number;
  sizes: string[];
  colors: string[];
  source: string;
  source_url: string | null;
  published: boolean;
  collection_id: string | null;
  shipping_origin: string | null;
  shipping_min_days: number | null;
  shipping_max_days: number | null;
  shipping_cost_min: number;
  shipping_cost_max: number;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  logo_url: string | null;
  banner_url: string | null;
  whatsapp_number: string | null;
  profit_multiplier: number;
  default_shipping_fee: number;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  bank_transfer_instructions: string | null;
}

export function computeSellingPrice(cost: number, shipping: number, multiplier: number): number {
  const value = (Number(cost || 0) + Number(shipping || 0)) * Number(multiplier || 1);
  return Math.round(value / 100) * 100;
}

/** Build a WhatsApp click-to-chat URL with a prefilled message. */
export function whatsappUrl(number: string | null | undefined, message: string): string {
  const num = (number || "").replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/** Generate a short color code from a color name (e.g. "Red" -> "RD"). */
export function generateColorCode(colorName: string): string {
  const clean = colorName.trim().toUpperCase();
  if (clean.length <= 2) return clean;
  if (clean.length === 3) return clean;
  const vowels = clean.replace(/[AEIOU]/g, "");
  if (vowels.length >= 2) return vowels.slice(0, 2);
  return clean.slice(0, 2);
}

/** Format shipping delivery estimate for display. */
export function formatShippingEstimate(minDays: number | null, maxDays: number | null): string {
  if (!minDays && !maxDays) return "";
  if (minDays && maxDays) return `${minDays}-${maxDays} days`;
  if (minDays) return `${minDays}+ days`;
  if (maxDays) return `Up to ${maxDays} days`;
  return "";
}

/** Common word/abbreviation synonyms mapped onto the predefined global options. */
const SIZE_SYNONYMS: Record<string, (typeof ALL_SIZES)[number]> = {
  "extra small": "XS",
  "x-small": "XS",
  xsmall: "XS",
  small: "S",
  medium: "M",
  med: "M",
  large: "L",
  "extra large": "XL",
  "x-large": "XL",
  xlarge: "XL",
  "xx-large": "XXL",
  "2xl": "XXL",
  "2x": "XXL",
};

const COLOR_SYNONYMS: Record<string, (typeof ALL_COLORS)[number]> = {
  noir: "Black",
  dark: "Black",
  blk: "Black",
  ivory: "White",
  cream: "White",
  wht: "White",
  navy: "Navy",
  sky: "Blue",
  royal: "Blue",
  grey: "Grey",
  gray: "Grey",
  crimson: "Red",
  wine: "Red",
  olive: "Green",
  lime: "Green",
  gold: "Gold",
  silver: "Silver",
  orange: "Orange",
  purple: "Purple",
  violet: "Purple",
  pink: "Pink",
  rose: "Pink",
  brown: "Brown",
  tan: "Beige",
  beige: "Beige",
};

/** Map arbitrary scraped variant strings onto the predefined global options. */
export function mapToGlobalVariants(raw: string[]): { sizes: string[]; colors: string[] } {
  const sizes = new Set<string>();
  const colors = new Set<string>();
  for (const item of raw) {
    const v = (item || "").toString().trim().toLowerCase();
    if (!v) continue;
    const tokens = v.split(/[\s/,\-_|]+/).filter(Boolean);

    for (const s of ALL_SIZES) {
      if (v === s.toLowerCase() || tokens.includes(s.toLowerCase())) sizes.add(s);
    }
    for (const [word, mapped] of Object.entries(SIZE_SYNONYMS)) {
      if (v.includes(word)) sizes.add(mapped);
    }

    for (const c of ALL_COLORS) {
      if (v.includes(c.toLowerCase())) colors.add(c);
    }
    for (const [word, mapped] of Object.entries(COLOR_SYNONYMS)) {
      if (v.includes(word)) colors.add(mapped);
    }
  }
  return { sizes: [...sizes], colors: [...colors] };
}
