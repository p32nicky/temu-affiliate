import { buildAffiliateUrl } from "./affiliate";
import { Product } from "./products";

const HOME_CATEGORIES = [
  { url: "https://www.temu.com/home-textile.html", name: "Home Textile" },
  { url: "https://www.temu.com/home-decor.html", name: "Home Decor" },
  { url: "https://www.temu.com/kitchen-dining.html", name: "Kitchen & Dining" },
  { url: "https://www.temu.com/storage-organization.html", name: "Storage & Organization" },
  { url: "https://www.temu.com/bathroom.html", name: "Bathroom" },
];

async function getBrowser() {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      headless: true,
      executablePath:
        process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  // Vercel/serverless: use sparticuz chromium-min (downloads binary at runtime)
  const chromium = (await import("@sparticuz/chromium-min")).default;
  const puppeteer = await import("puppeteer-core");

  const executablePath = await chromium.executablePath(
    "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
  );

  return puppeteer.default.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
}

export async function scrapeTemu(maxPerCategory = 10): Promise<Product[]> {
  const browser = await getBrowser();
  const products: Product[] = [];

  for (const cat of HOME_CATEGORIES) {
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      );
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(cat.url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await new Promise((r) => setTimeout(r, 2000));

      const items = await page.evaluate((max: number) => {
        const results: Array<{
          id: string;
          title: string;
          price: string;
          originalPrice: string;
          image: string;
        }> = [];

        const cards = document.querySelectorAll(
          '[class*="goods-item"], [class*="product-item"], [data-type="goods"]'
        );

        cards.forEach((card) => {
          if (results.length >= max) return;
          const link = card.querySelector("a[href*='goods_id']") as HTMLAnchorElement;
          const imgEl = card.querySelector("img") as HTMLImageElement;
          const titleEl = card.querySelector('[class*="title"], [class*="name"]');
          const priceEl = card.querySelector('[class*="price"]');
          const origPriceEl = card.querySelector('[class*="origin-price"], [class*="original"]');
          if (!link || !imgEl) return;
          const goodsIdMatch = link.href.match(/goods_id=(\d+)/);
          if (!goodsIdMatch) return;
          results.push({
            id: goodsIdMatch[1],
            title: titleEl?.textContent?.trim() || imgEl.alt || "Home Product",
            price: priceEl?.textContent?.trim() || "",
            originalPrice: origPriceEl?.textContent?.trim() || "",
            image: imgEl.src || (imgEl as HTMLImageElement & { dataset: DOMStringMap }).dataset.src || "",
          });
        });

        return results;
      }, maxPerCategory);

      for (const item of items) {
        products.push({
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

      await page.close();
    } catch (err) {
      console.error(`Scrape failed for ${cat.url}:`, err);
    }
  }

  await browser.close();
  return products;
}

function calcDiscount(price: string, original: string): string | undefined {
  const p = parseFloat(price.replace(/[^0-9.]/g, ""));
  const o = parseFloat(original.replace(/[^0-9.]/g, ""));
  if (!p || !o || o <= p) return undefined;
  return `${Math.round((1 - p / o) * 100)}% off`;
}
