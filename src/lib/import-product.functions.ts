import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapToGlobalVariants } from "@/lib/store";

const inputSchema = z.object({ url: z.string().url().max(2000) });

export interface ImportedProduct {
  title: string;
  description: string;
  images: string[];
  cost_price: number;
  sizes: string[];
  colors: string[];
  source_url: string;
  live: boolean;
  shipping_origin: string | null;
  shipping_min_days: number | null;
  shipping_max_days: number | null;
  shipping_cost_min: number;
  shipping_cost_max: number;
}

/** Extract an AliExpress product id from a variety of URL formats. */
function extractProductId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /item\/(\d{6,})\.html/,
    /\/(\d{9,})\.html/,
    /product\/(\d{6,})/,
    /[?&]productId=(\d{6,})/i,
    /[?&]itemId=(\d{6,})/i,
    /(\d{10,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

/** Pull a canonical AliExpress item URL out of an HTML document. */
function extractCanonicalUrl(html: string): string | null {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /window\.runParams[\s\S]{0,2000}?["'](https?:\/\/[^"']*item\/\d{6,}\.html)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Resolve short/share links (e.g. a.aliexpress.com/..., s.click.aliexpress.com)
 * to the canonical item URL BEFORE calling the DataHub endpoint.
 */
async function resolveProductId(url: string): Promise<string | null> {
  const direct = extractProductId(url);
  if (direct) return direct;

  try {
    const res = await fetch(url, { redirect: "follow", headers: BROWSER_HEADERS });
    const fromFinalUrl = extractProductId(res.url);
    if (fromFinalUrl) return fromFinalUrl;

    const html = await res.text();
    const canonical = extractCanonicalUrl(html);
    if (canonical) {
      const fromCanonical = extractProductId(canonical);
      if (fromCanonical) return fromCanonical;
    }
    return extractProductId(html);
  } catch {
    return null;
  }
}

/** Extract shipping estimate from AliExpress item data. */
function extractShippingInfo(item: any, costNgn: number): {
  shipping_origin: string | null;
  shipping_min_days: number | null;
  shipping_max_days: number | null;
  shipping_cost_min: number;
  shipping_cost_max: number;
} {
  let shipping_origin: string | null = null;
  let shipping_min_days: number | null = null;
  let shipping_max_days: number | null = null;
  let shipping_cost_min = 0;
  let shipping_cost_max = 0;

  // Try to extract shipping origin (country/region)
  const origin = item?.shippingInfo?.originCountry || item?.storeInfo?.shipFrom || item?.shipFrom;
  if (origin) shipping_origin = String(origin);

  // Try to extract delivery time estimate
  const deliveryTime = item?.shippingInfo?.deliveryTime || item?.deliveryTime;
  if (deliveryTime) {
    const dayMatch = String(deliveryTime).match(/(\d+)\s*[-–]\s*(\d+)\s*day/i);
    if (dayMatch) {
      shipping_min_days = parseInt(dayMatch[1], 10);
      shipping_max_days = parseInt(dayMatch[2], 10);
    } else {
      const singleDay = String(deliveryTime).match(/(\d+)\s*day/i);
      if (singleDay) {
        shipping_min_days = parseInt(singleDay[1], 10);
        shipping_max_days = parseInt(singleDay[1], 10);
      }
    }
  }

  // Try to extract shipping cost
  const shippingCost = item?.shippingInfo?.shippingCost || item?.shippingFee;
  if (shippingCost) {
    const USD_TO_NGN = Number(process.env.USD_TO_NGN_RATE) || 1600;
    const costMatch = String(shippingCost).match(/\$?([\d.]+)/);
    if (costMatch) {
      const usdCost = parseFloat(costMatch[1]);
      shipping_cost_min = Math.round(usdCost * USD_TO_NGN);
      shipping_cost_max = Math.round(usdCost * USD_TO_NGN);
    }
  }

  // Default estimates if nothing found
  if (!shipping_min_days) shipping_min_days = 7;
  if (!shipping_max_days) shipping_max_days = 21;
  if (!shipping_origin) shipping_origin = "China";

  return { shipping_origin, shipping_min_days, shipping_max_days, shipping_cost_min, shipping_cost_max };
}

export const importProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<ImportedProduct> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const productId = await resolveProductId(data.url);
    if (!productId) throw new Error("Could not find a product ID in that link.");

    const rapidKey = process.env.RAPIDAPI_KEY;
    const rapidHost = (process.env.RAPIDAPI_HOST || "aliexpress-datahub.p.rapidapi.com")
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (!rapidKey) {
      return {
        title: `Imported Product #${productId}`,
        description:
          "This is placeholder data. Add your RapidAPI key in project settings to import real product details (title, images, description, variants and price) from AliExpress.",
        images: [],
        cost_price: 0,
        sizes: [],
        colors: [],
        source_url: data.url,
        live: false,
        shipping_origin: "China",
        shipping_min_days: 7,
        shipping_max_days: 21,
        shipping_cost_min: 0,
        shipping_cost_max: 0,
      };
    }

    const USD_TO_NGN = Number(process.env.USD_TO_NGN_RATE) || 1600;

    const endpoints = ["item_detail_2", "item_detail_6", "item_detail_5", "item_detail", "item_detail_3"];

    let item: any = null;
    let lastStatus = "";
    for (const ep of endpoints) {
      try {
        const endpoint = `https://${rapidHost}/${ep}?itemId=${productId}`;
        const res = await fetch(endpoint, {
          headers: { "x-rapidapi-key": rapidKey, "x-rapidapi-host": rapidHost },
        });
        if (!res.ok) {
          lastStatus = `HTTP ${res.status}`;
          continue;
        }
        const json: any = await res.json();
        const result = json?.result ?? {};
        lastStatus = result?.status?.data ?? "unknown";
        const candidate = result?.item;
        if (candidate && (candidate.title || (candidate.images ?? []).length)) {
          item = candidate;
          break;
        }
      } catch (err) {
        console.error(`[importProduct] ${ep}`, err);
      }
    }

    if (!item) {
      throw new Error(
        `Couldn't fetch this product from AliExpress (status: ${lastStatus}). It may be unavailable — try another link.`,
      );
    }

    const httpsify = (u: string) => (u?.startsWith("//") ? "https:" + u : u);

    const title: string = item.title ?? `Imported Product #${productId}`;
    const description: string =
      typeof item.description === "string" ? item.description : "";

    const images: string[] = (item.images ?? [])
      .filter(Boolean)
      .map((u: string) => httpsify(u));

    const base: any[] = item.sku?.base ?? [];
    const usdValues = base
      .map((s) => Number(s?.promotionPrice ?? s?.price))
      .filter((v) => Number.isFinite(v) && v > 0);
    const minUsd = usdValues.length ? Math.min(...usdValues) : 0;
    const cost_price = Math.round(minUsd * USD_TO_NGN);

    const variantStrings: string[] = [];
    const props: any[] = item.sku?.props ?? [];
    for (const p of props) {
      for (const v of p?.values ?? []) {
        const name = v?.name ?? v?.propTips;
        if (name) variantStrings.push(String(name));
      }
    }
    const { sizes, colors } = mapToGlobalVariants(variantStrings);

    const shippingInfo = extractShippingInfo(item, cost_price);

    return {
      title,
      description,
      images,
      cost_price,
      sizes,
      colors,
      source_url: data.url,
      live: true,
      ...shippingInfo,
    };
  });
