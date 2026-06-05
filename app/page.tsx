"use client";
import { useEffect, useState } from "react";
import { Product } from "@/lib/products";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => { setProducts(data); setLoading(false); });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-orange-500 text-white py-6 px-4 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">🏠 Temu Home Deals</h1>
          <div className="flex gap-3">
            <a href="/api/rss" className="text-sm bg-white text-orange-500 px-3 py-1 rounded font-medium">RSS Feed</a>
            <a href="/admin" className="text-sm bg-orange-700 px-3 py-1 rounded font-medium">Admin</a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No products yet.</p>
            <a href="/admin" className="bg-orange-500 text-white px-6 py-2 rounded font-medium">
              Go to Admin → Scrape Products
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <a
                key={p.id}
                href={p.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden group"
              >
                {p.image && (
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{p.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 font-bold">{p.price}</span>
                    {p.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">{p.originalPrice}</span>
                    )}
                  </div>
                  {p.discount && (
                    <span className="inline-block mt-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {p.discount}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{p.category}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
