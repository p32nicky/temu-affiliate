import { NextRequest, NextResponse } from "next/server";
import { getProducts, markPosted } from "@/lib/products";
import { postToReddit } from "@/lib/reddit";

export async function POST(req: NextRequest) {
  const { subreddit, productId } = await req.json();
  if (!subreddit) return NextResponse.json({ error: "subreddit required" }, { status: 400 });

  const products = await getProducts();
  const toPost = productId
    ? products.filter((p) => p.id === productId)
    : products.filter((p) => !p.postedToReddit).slice(0, 3);

  const results = [];
  for (const product of toPost) {
    const ok = await postToReddit(product, subreddit);
    if (ok) await markPosted(product.id, "reddit");
    results.push({ id: product.id, title: product.title, posted: ok });
  }

  return NextResponse.json({ results });
}
