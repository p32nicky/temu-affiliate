import { Redis } from "@upstash/redis";

const AFFILIATE_ID = "2001489215";

interface Product {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image: string;
  affiliateUrl: string;
  category: string;
  scrapedAt: string;
}

function buildAffiliateUrl(goodsId: string): string {
  const params = new URLSearchParams({
    subj: "goods-detail",
    _bg_fs: "1",
    _p_mat2_type: "a4002",
    _p_jump_id: "1040",
    _x_vst_scene: "adg",
    adg_ctx: "a-dafec67f",
    goods_id: goodsId,
    _p_rfs: "1",
    _x_ads_channel: "kol_affiliate",
    _x_campaign: "affiliate",
    _x_cid: `${AFFILIATE_ID}kol_affiliate`,
    _x_ads_csite: "affiliate_goods_share",
    g_site: "100",
    g_lg: "en",
    g_region: "211",
    g_ccy: "USD",
  });
  return `https://www.temu.com/kuiper/uk1.html?${params.toString()}`;
}

const HOME_SEARCHES = [
  { keyword: "home decor", category: "Home Decor" },
  { keyword: "kitchen organizer", category: "Kitchen & Dining" },
  { keyword: "bedroom storage", category: "Storage" },
  { keyword: "bathroom accessories", category: "Bathroom" },
  { keyword: "living room decoration", category: "Living Room" },
  { keyword: "curtains blinds", category: "Home Textile" },
  { keyword: "sofa cushion cover", category: "Home Textile" },
  { keyword: "wall art decoration", category: "Home Decor" },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.temu.com/",
  "Origin": "https://www.temu.com",
};

async function searchTemu(keyword: string, category: string): Promise<Product[]> {
  // Temu search API endpoint
  const url = `https://www.temu.com/api/poppy/v1/search?q=${encodeURIComponent(keyword)}&page=1&page_size=20&sort_type=0`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    console.log(`  Status: ${res.status}, length: ${text.length}`);

    if (res.status !== 200) {
      console.log(`  Response snippet: ${text.slice(0, 200)}`);
      return [];
    }

    const data = JSON.parse(text);

    // Try multiple possible response shapes
    const goods =
      data?.data?.goods_list ||
      data?.result?.goods_list ||
      data?.data?.items ||
      data?.result?.items ||
      [];

    console.log(`  Found ${goods.length} items`);

    return goods.slice(0, 15).map((g: Record<string, unknown>) => {
      const id = String(g.goods_id || g.id || "");
      const price = g.price_info as Record<string, unknown> || {};
      const priceVal = `$${((Number(price.price) || Number(g.price) || 0) / 100).toFixed(2)}`;
      const origVal = price.origin_price ? `$${(Number(price.origin_price) / 100).toFixed(2)}` : undefined;
      const imgs = (g.images as string[]) || [];
      const img = typeof g.image === "string" ? g.image : imgs[0] || "";
      const title = String(g.goods_name || g.title || g.name || "Home Product");

      let discount: string | undefined;
      if (origVal) {
        const p = parseFloat(priceVal.replace("$", ""));
        const o = parseFloat(origVal.replace("$", ""));
        if (o > p) discount = `${Math.round((1 - p / o) * 100)}% off`;
      }

      return { id, title, price: priceVal, originalPrice: origVal, discount, image: img, affiliateUrl: buildAffiliateUrl(id), category, scrapedAt: new Date().toISOString() };
    }).filter((p: Product) => p.id);
  } catch (err) {
    console.error(`  Error: ${err}`);
    return [];
  }
}

async function scrape(): Promise<void> {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const newProducts: Product[] = [];

  for (const { keyword, category } of HOME_SEARCHES) {
    console.log(`Searching: "${keyword}"`);
    const results = await searchTemu(keyword, category);
    newProducts.push(...results);
    await new Promise((r) => setTimeout(r, 1000));
  }

  const existing = (await redis.get<Product[]>("temu:products")) || [];
  const existingIds = new Set(existing.map((p) => p.id));
  const fresh = newProducts.filter((p) => !existingIds.has(p.id));
  const merged = [...fresh, ...existing].slice(0, 500);
  await redis.set("temu:products", merged);

  console.log(`Done. Added ${fresh.length} new products. Total: ${merged.length}`);
}

scrape().catch((err) => { console.error(err); process.exit(1); });
