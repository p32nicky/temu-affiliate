import { Product } from "./products";

const REDDIT_CONFIG = {
  clientId: "weFtQwJPb1wsdq2IXexp7Q",
  clientSecret: "a-mqkbBtpHICVo--xQWIAPENM_bSUw",
  username: "Basic-Strain-6922",
  password: "Nd2354zx!!??",
};

async function getRedditToken(): Promise<string> {
  const creds = Buffer.from(`${REDDIT_CONFIG.clientId}:${REDDIT_CONFIG.clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TemuDeals/1.0 by Basic-Strain-6922",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: REDDIT_CONFIG.username,
      password: REDDIT_CONFIG.password,
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function postToReddit(product: Product, subreddit: string): Promise<boolean> {
  try {
    const token = await getRedditToken();
    const title = buildTitle(product);
    const text = buildBody(product);

    const res = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TemuDeals/1.0 by Basic-Strain-6922",
      },
      body: new URLSearchParams({
        sr: subreddit,
        kind: "link",
        title,
        url: product.affiliateUrl,
        resubmit: "true",
      }),
    });

    const data = await res.json();
    return !data.json?.errors?.length;
  } catch {
    return false;
  }
}

function buildTitle(p: Product): string {
  const discount = p.discount ? ` [${p.discount}]` : "";
  const price = p.price ? ` - ${p.price}` : "";
  return `${p.title}${price}${discount} | Temu Home Deal`;
}

function buildBody(p: Product): string {
  return [
    `**${p.title}**`,
    p.price ? `Price: ${p.price}${p.originalPrice ? ` ~~${p.originalPrice}~~` : ""}` : "",
    p.discount ? `Saving: ${p.discount}` : "",
    `Category: ${p.category}`,
    "",
    `[Shop Now](${p.affiliateUrl})`,
  ]
    .filter(Boolean)
    .join("\n");
}
