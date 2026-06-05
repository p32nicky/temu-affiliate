"use client";
import { useState } from "react";

export default function AdminPage() {
  const [subreddit, setSubreddit] = useState("");
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [redditStatus, setRedditStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleScrape() {
    setLoading("scrape");
    setScrapeStatus(null);
    const res = await fetch("/api/scrape", { method: "POST" });
    const data = await res.json();
    setScrapeStatus(
      data.success
        ? `Done! Found ${data.newProducts} new products. Total: ${data.total}`
        : `Error: ${data.error}`
    );
    setLoading(null);
  }

  async function handlePostReddit() {
    if (!subreddit) return alert("Enter subreddit name");
    setLoading("reddit");
    setRedditStatus(null);
    const res = await fetch("/api/post-reddit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subreddit }),
    });
    const data = await res.json();
    const posted = data.results?.filter((r: { posted: boolean }) => r.posted).length || 0;
    setRedditStatus(`Posted ${posted} of ${data.results?.length || 0} products to r/${subreddit}`);
    setLoading(null);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <a href="/" className="text-orange-500 hover:underline">← Home</a>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Scrape */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Scrape Temu Home Products</h2>
          <p className="text-sm text-gray-500 mb-4">
            Scrapes 5 home categories (15 products each). Uses stealth browser.
          </p>
          <button
            onClick={handleScrape}
            disabled={loading === "scrape"}
            className="bg-orange-500 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading === "scrape" ? "Scraping... (takes ~2 mins)" : "Scrape Now"}
          </button>
          {scrapeStatus && (
            <p className={`mt-3 text-sm ${scrapeStatus.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
              {scrapeStatus}
            </p>
          )}
        </div>

        {/* Reddit */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Post to Reddit</h2>
          <p className="text-sm text-gray-500 mb-4">Posts up to 3 unposted products at a time.</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="subreddit name (no r/)"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              className="border rounded px-3 py-2 flex-1 text-sm"
            />
            <button
              onClick={handlePostReddit}
              disabled={loading === "reddit"}
              className="bg-blue-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
            >
              {loading === "reddit" ? "Posting..." : "Post"}
            </button>
          </div>
          {redditStatus && (
            <p className="mt-3 text-sm text-green-600">{redditStatus}</p>
          )}
        </div>

        {/* RSS */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-2">RSS Feed</h2>
          <p className="text-sm text-gray-500 mb-3">Use this URL in Zapier, IFTTT, or any RSS reader to auto-post.</p>
          <code className="block bg-gray-100 px-3 py-2 rounded text-sm break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/rss
          </code>
        </div>
      </div>
    </main>
  );
}
