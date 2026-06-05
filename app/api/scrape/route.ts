import { NextResponse } from "next/server";
import { scrapeTemu } from "@/lib/scraper";
import { addProducts } from "@/lib/products";

export async function POST() {
  try {
    const scraped = await scrapeTemu(15);
    const products = await addProducts(scraped);
    return NextResponse.json({ success: true, newProducts: scraped.length, total: products.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
