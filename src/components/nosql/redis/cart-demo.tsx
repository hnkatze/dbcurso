"use client";

import { useState } from "react";
import { exec, RedisDB } from "@/lib/engines/redis";

/* ---------- Types ---------- */

interface HistoryEntry {
  cmd: string;
  result: unknown;
}

interface Product {
  sku: string;
  name: string;
  price: number;
  tint: keyof typeof TINT_BG;
  glyph: string;
}

/* ---------- Data ---------- */

const PRODUCTS: Product[] = [
  { sku: "42", name: "Café Sierra Nevada", price: 32000, tint: "sun",  glyph: "C"  },
  { sku: "17", name: "Té verde japonés",   price: 12000, tint: "mint", glyph: "T"  },
  { sku: "08", name: "Galletas integral",  price:  6000, tint: "rose", glyph: "G"  },
  { sku: "91", name: "Chocolate amargo",   price: 22000, tint: "lav",  glyph: "Ch" },
];

const TINT_BG = {
  sun:  "bg-sun-100 text-sun-700",
  mint: "bg-mint-100 text-mint-700",
  rose: "bg-rose-100 text-rose-700",
  lav:  "bg-lav-100 text-lav-700",
  sea:  "bg-sea-100 text-sea-700",
} as const;

function money(n: number): string {
  return `$ ${n.toLocaleString("es-CO")}`;
}

/* ---------- Shared demo sub-components ---------- */

function DemoFrame({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-8 rounded-3xl bg-paper border border-line shadow-paper2 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-cream-deep border-b border-line">
        <span className="font-display italic text-[22px] text-ink-soft leading-none" aria-hidden="true">
          {icon}
        </span>
        <div className="leading-tight">
          <div className="font-display font-semibold text-[15px] text-ink">{title}</div>
          <div className="font-mono text-[10.5px] tracking-wider uppercase text-ink-mute">{subtitle}</div>
        </div>
        <span className="ml-auto flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-sun-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-mint-500" />
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[440px]">{children}</div>
    </div>
  );
}

function LeftPane({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 bg-paper border-b lg:border-b-0 lg:border-r border-line">{children}</div>
  );
}

function RightPane({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 bg-ink text-cream font-mono text-[12.5px] flex flex-col gap-3">{children}</div>
  );
}

function CommandLog({ history }: { history: HistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-white/40 italic text-[11.5px]">
        Aún no hay comandos. Interactúa a la izquierda →
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {history.map((h, i) => (
        <div key={i} className={i === history.length - 1 ? "anim-fade-up" : ""}>
          <div className="text-sun-500 text-[11.5px]">
            <span className="text-white/40">{"> "}</span>
            {h.cmd}
          </div>
          {h.result !== undefined && h.result !== null && (
            <div className="text-mint-100 pl-4 text-[11px]">
              {Array.isArray(h.result)
                ? (h.result as unknown[]).map((x, j) => <div key={j}>{j + 1}) {String(x)}</div>)
                : String(h.result)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function KeyHeader({ kind, name }: { kind: string | undefined; name: string }) {
  const tint =
    kind === "string" ? "text-sun-500 bg-sun-500/10"
    : kind === "list"   ? "text-sea-300 bg-sea-500/15"
    : kind === "hash"   ? "text-rose-300 bg-rose-500/15"
    : kind === "set"    ? "text-mint-100 bg-mint-500/15"
    :                     "text-lav-300 bg-lav-500/15";
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded ${tint}`}>
        {kind ?? "empty"}
      </span>
      <span className="font-mono text-[13px] text-cream">{name}</span>
    </div>
  );
}

/* ---------- CartDemo (HASH) ---------- */

export function CartDemo() {
  const [db] = useState(() => new RedisDB());
  const [, force] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flashSku, setFlashSku] = useState<string | null>(null);

  const cart = db.data["cart:ana"];
  const items = cart ? Object.entries(cart.val as Record<string, string>) : [];
  const total = items.reduce((sum, [field, qty]) => {
    const sku = field.replace("sku-", "");
    const p = PRODUCTS.find((p) => p.sku === sku);
    return sum + (p ? p.price * parseInt(qty) : 0);
  }, 0);
  const totalItems = items.reduce((s, [, q]) => s + parseInt(q), 0);

  function dispatch(cmd: string, prettyResult?: unknown) {
    const res = exec(db, cmd);
    const out = res.outputs[0]!;
    setHistory((h) =>
      [
        ...h,
        { cmd, result: prettyResult ?? (out.ok ? out.result : `(error) ${out.error}`) },
      ].slice(-7),
    );
    force((x) => x + 1);
  }

  function add(p: Product) {
    dispatch(`HINCRBY cart:ana sku-${p.sku} 1`);
    setFlashSku(p.sku);
    setTimeout(() => setFlashSku(null), 600);
  }

  function changeQty(sku: string, delta: number) {
    dispatch(`HINCRBY cart:ana sku-${sku} ${delta}`);
    const cur = (db.data["cart:ana"]?.val as Record<string, string> | undefined)?.[`sku-${sku}`];
    if (cur !== undefined && parseInt(cur) <= 0) {
      dispatch(`HDEL cart:ana sku-${sku}`);
    }
    setFlashSku(sku);
    setTimeout(() => setFlashSku(null), 600);
  }

  function remove(sku: string) {
    dispatch(`HDEL cart:ana sku-${sku}`);
  }

  function checkout() {
    if (!cart) return;
    dispatch("DEL cart:ana");
  }

  return (
    <DemoFrame icon="🛒" title="Tienda online · carrito de Ana" subtitle="HASH · cart:ana">
      <LeftPane>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-[20px] font-semibold tracking-tight">Catálogo</div>
          <div className="flex items-center gap-2 bg-ink text-cream rounded-full px-3 py-1.5 text-[12.5px] font-medium">
            <span>Carrito</span>
            <span className="bg-sun-500 text-ink rounded-full px-2 py-0.5 font-mono text-[11px] min-w-[20px] text-center">
              {totalItems}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {PRODUCTS.map((p) => (
            <div key={p.sku} className="rounded-xl bg-cream border border-line p-3 flex flex-col">
              <div
                className={`rounded-lg ${TINT_BG[p.tint]} h-16 grid place-items-center font-display italic text-[32px] font-medium mb-2`}
                aria-hidden="true"
              >
                {p.glyph}
              </div>
              <div className="text-[12.5px] text-ink font-medium leading-tight mb-0.5">{p.name}</div>
              <div className="font-mono text-[11px] text-ink-mute mb-2">{money(p.price)}</div>
              <button
                onClick={() => add(p)}
                className="mt-auto bg-ink text-cream rounded-md py-1.5 text-[12px] font-medium hover:bg-[#2a221a] active:translate-y-px transition"
                aria-label={`Agregar ${p.name} al carrito`}
              >
                + agregar
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-cream-deep border border-line p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-[10.5px] tracking-widest uppercase text-ink-mute">
              Tu carrito
            </div>
            {items.length > 0 && (
              <button
                onClick={checkout}
                className="font-mono text-[10.5px] tracking-widest uppercase text-rose-700 hover:underline"
              >
                vaciar / pagar
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="text-[13px] text-ink-mute italic py-3">
              Carrito vacío. Agrega algo del catálogo de arriba.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(([field, qty]) => {
                const sku = field.replace("sku-", "");
                const p = PRODUCTS.find((p) => p.sku === sku);
                if (!p) return null;
                const flash = flashSku === sku;
                return (
                  <div
                    key={sku}
                    className={`flex items-center gap-3 p-2 rounded-lg bg-paper border border-line ${flash ? "ring-2 ring-sun-500" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded ${TINT_BG[p.tint]} grid place-items-center font-display italic text-[16px] font-medium`}
                      aria-hidden="true"
                    >
                      {p.glyph}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] text-ink font-medium leading-tight">{p.name}</div>
                      <div className="font-mono text-[11px] text-ink-mute">{money(p.price)} c/u</div>
                    </div>
                    <div className="flex items-center gap-1" role="group" aria-label={`Cantidad de ${p.name}`}>
                      <button
                        onClick={() => changeQty(sku, -1)}
                        className="w-6 h-6 rounded bg-cream border border-line text-ink hover:bg-cream-deep"
                        aria-label={`Quitar una unidad de ${p.name}`}
                      >
                        –
                      </button>
                      <span className="font-mono text-[13px] w-6 text-center">{qty}</span>
                      <button
                        onClick={() => changeQty(sku, +1)}
                        className="w-6 h-6 rounded bg-cream border border-line text-ink hover:bg-cream-deep"
                        aria-label={`Agregar una unidad de ${p.name}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => remove(sku)}
                      className="text-ink-mute hover:text-rose-700 px-1"
                      aria-label={`Eliminar ${p.name} del carrito`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-line mt-2">
                <span className="text-[13px] text-ink-soft">Total</span>
                <span className="font-mono text-[16px] font-semibold text-ink">{money(total)}</span>
              </div>
            </div>
          )}
        </div>
      </LeftPane>

      <RightPane>
        <div className="text-[10.5px] tracking-widest uppercase text-sun-500 mb-1">Estado en Redis</div>
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
          <KeyHeader kind={cart?.type} name="cart:ana" />
          {!cart ? (
            <div className="text-white/40 italic text-[11.5px]">
              (la clave no existe — un carrito vacío sencillamente no se guarda)
            </div>
          ) : (
            <table className="border-collapse text-[12px] w-full">
              <tbody>
                {items.map(([field, qty]) => (
                  <tr
                    key={field}
                    className={flashSku && field.endsWith(flashSku) ? "anim-row-upd" : ""}
                  >
                    <td className="text-rose-300 pr-3 py-0.5">{field}</td>
                    <td className="text-cream py-0.5 text-right">{qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="text-[10.5px] tracking-widest uppercase text-sun-500 mt-1">Últimos comandos</div>
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex-1 overflow-auto">
          <CommandLog history={history} />
        </div>
      </RightPane>
    </DemoFrame>
  );
}
