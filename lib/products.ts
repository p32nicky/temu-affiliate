import { Redis } from "@upstash/redis";

export interface Product {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image: string;
  affiliateUrl: string;
  category: string;
  scrapedAt: string;
  postedToReddit?: boolean;
  postedToPinterest?: boolean;
}

const PRODUCTS_KEY = "temu:products";

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function getProducts(): Promise<Product[]> {
  const redis = getRedis();
  const data = await redis.get<Product[]>(PRODUCTS_KEY);
  return data || [];
}

export async function saveProducts(products: Product[]): Promise<void> {
  const redis = getRedis();
  await redis.set(PRODUCTS_KEY, products);
}

export async function addProducts(newProducts: Product[]): Promise<Product[]> {
  const existing = await getProducts();
  const existingIds = new Set(existing.map((p) => p.id));
  const fresh = newProducts.filter((p) => !existingIds.has(p.id));
  const merged = [...fresh, ...existing].slice(0, 500);
  await saveProducts(merged);
  return merged;
}

export async function markPosted(id: string, platform: "reddit" | "pinterest"): Promise<void> {
  const products = await getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return;
  if (platform === "reddit") products[idx].postedToReddit = true;
  if (platform === "pinterest") products[idx].postedToPinterest = true;
  await saveProducts(products);
}
