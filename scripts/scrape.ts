import puppeteer from "puppeteer";
import { Redis } from "@upstash/redis";

const AFFILIATE_ID = "2001489215";

const HOME_CATEGORIES = [
  { url: "https://www.temu.com/home-textile.html", name: "Home Textile" },
  { url: "https://www.temu.com/home-decor.html", name: "Home Decor" },
  { url: "https://www.temu.com/kitchen-dining.html", name: "Kitchen & Dining" },
  { url: "https://www.temu.com/storage-organization.html", name: "Storage & Organization" },
  { url: "https://www.temu.com/bathroom.html", name: "Bathroom" },
];

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

function calcDiscount(price: string, original: string): string | undefined {
  const p = parseFloat(price.replace(/[^0-9.]/g, ""));
  const o = parseFloat(original.replace(/[^0-9.]/g, ""));
  if (!p || !o || o <= p) return undefined;
  return `${Math.round((1 - p / o) * 100)}% off`;
}

async function scrape(): Promise<void> {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const newProducts: Product[] = [];

  for (const cat of HOME_CATEGORIES) {
    console.log(`Scraping: ${cat.name}`);
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      );
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(cat.url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 4000));
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await new Promise((r) => setTimeout(r, 3000));

      // Debug: dump page title + first 2000 chars of HTML
      const debugInfo = await page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        bodySnippet: document.body.innerHTML.slice(0, 2000),
        linkCount: document.querySelectorAll("a").length,
      }));
      console.log("  Title:", debugInfo.title);
      console.log("  URL:", debugInfo.url);
      console.log("  Links:", debugInfo.linkCount);
      console.log("  HTML snippet:", debugInfo.bodySnippet.slice(0, 500));

      // Also try to find any anchor with goods_id anywhere
      const items = await page.evaluate((max: number) => {
        const results: Array<{ id: string; title: string; price: string; originalPrice: string; image: string }> = [];

        // Try all anchor tags with goods_id
        const links = Array.from(document.querySelectorAll("a[href*='goods_id']")) as HTMLAnchorElement[];
        for (const link of links) {
          if (results.length >= max) break;
          const m = link.href.match(/goods_id=(\d+)/);
          if (!m) continue;
          // Walk up to find product card container
          const card = link.closest('li, article, [class*="card"], [class*="item"], [class*="product"], [class*="goods"]') || link.parentElement;
          const imgEl = card?.querySelector("img") as HTMLImageElement | null;
          const allText = card?.querySelectorAll('[class*="price"], span, em');
          const prices = Array.from(allText || []).map(el => el.textContent?.trim()).filter(Boolean);
          results.push({
            id: m[1],
            title: imgEl?.alt || link.textContent?.trim() || "Home Product",
            price: prices[0] || "",
            originalPrice: prices[1] || "",
            image: imgEl?.src || "",
          });
        }
        return results;
      }, 20);

      for (const item of items) {
        newProducts.push({
          id: item.id,
          title: item.title,
          price: item.price,
          originalPrice: item.originalPrice || undefined,
          discount: calcDiscount(item.price, item.originalPrice),
          image: item.image,
          affiliateUrl: buildAffiliateUrl(item.id),
          category: cat.name,
          scrapedAt: new Date().toISOString(),
        });
      }

      console.log(`  Found ${items.length} products`);
      await page.close();
    } catch (err) {
      console.error(`  Failed: ${err}`);
    }
  }

  await browser.close();

  // Merge with existing, keep newest 500
  const existing = (await redis.get<Product[]>("temu:products")) || [];
  const existingIds = new Set(existing.map((p) => p.id));
  const fresh = newProducts.filter((p) => !existingIds.has(p.id));
  const merged = [...fresh, ...existing].slice(0, 500);
  await redis.set("temu:products", merged);

  console.log(`Done. Added ${fresh.length} new products. Total: ${merged.length}`);
}

scrape().catch((err) => { console.error(err); process.exit(1); });
