"use client";

import { useMemo, useState } from "react";
import { MongoDB } from "@/lib/engines/mongo";
import type { MongoDocument, MongoQuery } from "@/lib/engines/mongo";
import { JsonView } from "./json-view";
import { DemoFrame, LeftPane, RightPane } from "./demo-frame";

interface Product extends MongoDocument {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  tags: string[];
}

const FILTER_PRODUCTS: Product[] = [
  { _id: "sku-42", name: "Café Sierra Nevada", category: "café",     price: 32000, stock: 18, tags: ["premium", "oscuro"] },
  { _id: "sku-15", name: "Café Huila",         category: "café",     price: 28000, stock: 25, tags: ["medio"] },
  { _id: "sku-22", name: "Café Tolima",        category: "café",     price: 30000, stock: 0,  tags: ["oscuro", "orgánico"] },
  { _id: "sku-17", name: "Té verde",           category: "té",       price: 12000, stock: 12, tags: ["suave"] },
  { _id: "sku-18", name: "Té manzanilla",      category: "té",       price:  9500, stock: 30, tags: ["suave", "relajante"] },
  { _id: "sku-08", name: "Galletas integral",  category: "snack",    price:  6000, stock: 4,  tags: ["integral"] },
  { _id: "sku-91", name: "Chocolate amargo",   category: "snack",    price: 22000, stock: 8,  tags: ["premium", "oscuro"] },
  { _id: "sku-77", name: "Cacao en polvo",     category: "despensa", price: 15000, stock: 11, tags: ["orgánico"] },
];

const TINT_CAT: Record<string, string> = {
  café:     "bg-sun-100 text-sun-700",
  té:       "bg-mint-100 text-mint-700",
  snack:    "bg-rose-100 text-rose-700",
  despensa: "bg-sea-100 text-sea-700",
};

function money(n: number): string {
  return `$ ${n.toLocaleString("es-CO")}`;
}

function createInitialDb(): MongoDB {
  const d = new MongoDB();
  d.collection("products").insertMany(FILTER_PRODUCTS);
  return d;
}

export function FilterDemo() {
  const [db] = useState<MongoDB>(createInitialDb);
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [maxPrice, setMaxPrice] = useState(35000);
  const [inStock, setInStock] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const query = useMemo<MongoQuery>(() => {
    const q: MongoQuery = {};
    if (cats.size > 0) q.category = { $in: [...cats] };
    if (maxPrice < 35000) q.price = { $lte: maxPrice };
    if (inStock) {
      const existing = q.stock as Record<string, number> | undefined;
      q.stock = { ...(existing ?? {}), $gt: 0 };
    }
    if (tagSearch.trim()) q.tags = { $in: [tagSearch.trim()] };
    return q;
  }, [cats, maxPrice, inStock, tagSearch]);

  const results = useMemo(
    () => db.collection("products").find(query, { sort: { price: 1 } }) as Product[],
    [db, query],
  );

  function toggleCat(c: string) {
    const n = new Set(cats);
    if (n.has(c)) n.delete(c);
    else n.add(c);
    setCats(n);
  }

  return (
    <DemoFrame
      icon="⇁"
      title="Tienda · catálogo filtrable"
      subtitle="db.products.find( … ) en vivo"
    >
      <LeftPane>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
          {/* Filter sidebar */}
          <aside aria-label="Filtros de productos">
            <div className="space-y-4">
              <fieldset>
                <legend className="font-mono text-[10.5px] tracking-widest uppercase text-ink-mute mb-2">
                  Categoría
                </legend>
                <div className="space-y-1.5">
                  {(["café", "té", "snack", "despensa"] as const).map((c) => (
                    <label key={c} className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cats.has(c)}
                        onChange={() => toggleCat(c)}
                        className="accent-sun-500"
                      />
                      <span className="capitalize">{c}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="filter-max-price"
                  className="block font-mono text-[10.5px] tracking-widest uppercase text-ink-mute mb-2"
                >
                  Precio máx · {money(maxPrice)}
                </label>
                <input
                  id="filter-max-price"
                  type="range"
                  min={5000}
                  max={35000}
                  step={1000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full accent-sun-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="accent-sun-500"
                  />
                  <span>Solo en stock</span>
                </label>
              </div>

              <div>
                <label
                  htmlFor="filter-tag"
                  className="block font-mono text-[10.5px] tracking-widest uppercase text-ink-mute mb-2"
                >
                  Tag
                </label>
                <input
                  id="filter-tag"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="ej: premium"
                  className="w-full font-mono text-[12px] bg-cream border border-line rounded px-2 py-1.5 focus:outline-none focus:border-sun-500"
                />
              </div>

              <button
                onClick={() => {
                  setCats(new Set());
                  setMaxPrice(35000);
                  setInStock(false);
                  setTagSearch("");
                }}
                className="font-mono text-[10.5px] tracking-widest uppercase text-ink-mute hover:text-ink transition"
              >
                ↺ Limpiar
              </button>
            </div>
          </aside>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-[18px] font-semibold tracking-tight">
                Resultados
              </div>
              <div className="font-mono text-[11px] text-ink-mute" aria-live="polite">
                {results.length} de {FILTER_PRODUCTS.length}
              </div>
            </div>
            <div className="space-y-2">
              {results.length === 0 ? (
                <div className="text-[13px] text-ink-mute italic py-4">
                  Ningún producto coincide con esos filtros.
                </div>
              ) : (
                results.map((p) => (
                  <div
                    key={p._id}
                    className="anim-fade-up flex items-center gap-3 p-2.5 rounded-lg bg-cream border border-line"
                  >
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${TINT_CAT[p.category] ?? "bg-line text-ink-soft"}`}
                    >
                      {p.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-ink font-medium">{p.name}</div>
                      <div className="font-mono text-[11px] text-ink-mute">
                        {money(p.price)} · stock {p.stock}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[10px] bg-paper border border-line px-1.5 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </LeftPane>

      <RightPane>
        <div className="text-[10.5px] tracking-widest uppercase text-sun-500 mb-1">
          Query Mongo construida
        </div>
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 overflow-auto">
          <div className="font-mono text-[12px] leading-relaxed">
            <span className="text-white/40">db.products.find(</span>
            {Object.keys(query).length === 0 ? (
              <span className="text-white/40"> {"{}"} </span>
            ) : (
              <JsonView data={query as unknown as MongoDocument} />
            )}
            <span className="text-white/40">)</span>
          </div>
          <div className="font-mono text-[11px] text-cream/60 mt-2">.sort({"{"} price: 1 {"}"})</div>
        </div>

        <div className="text-[10.5px] tracking-widest uppercase text-sun-500 mt-1">
          Resultado ·{" "}
          <span aria-live="polite">{results.length} documento(s)</span>
        </div>
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex-1 overflow-auto">
          <div className="font-mono text-[11.5px] leading-relaxed space-y-1">
            {results.length === 0 ? (
              <div className="text-white/40 italic">{"[ ]"}</div>
            ) : (
              results.map((p) => (
                <div key={p._id} className="text-cream/80">
                  <span className="text-rose-300">"{p.name}"</span>
                  <span className="text-white/40"> · </span>
                  <span className="text-sun-500">{money(p.price)}</span>
                  <span className="text-white/40"> · </span>
                  <span className="text-mint-100">{p.category}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </RightPane>
    </DemoFrame>
  );
}
