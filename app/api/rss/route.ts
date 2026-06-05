import { NextResponse } from "next/server";
import { getProducts } from "@/lib/products";

export async function GET() {
  const products = (await getProducts()).slice(0, 50);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://temu-affiliate-chi.vercel.app";

  const items = products
    .map(
      (p) => `
    <item>
      <title><![CDATA[${p.title}${p.discount ? ` - ${p.discount}` : ""}]]></title>
      <link>${p.affiliateUrl}</link>
      <description><![CDATA[
        <img src="${p.image}" alt="${p.title}" /><br/>
        Price: ${p.price}${p.originalPrice ? ` (was ${p.originalPrice})` : ""}${p.discount ? ` | ${p.discount}` : ""}<br/>
        Category: ${p.category}
      ]]></description>
      <pubDate>${new Date(p.scrapedAt).toUTCString()}</pubDate>
      <guid isPermaLink="false">${p.id}</guid>
      <enclosure url="${p.image}" type="image/jpeg" length="0"/>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Temu Home Deals</title>
    <link>${siteUrl}</link>
    <description>Best Temu home products with affiliate deals</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
