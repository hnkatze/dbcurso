"use client";

import { useEffect, useRef, useState } from "react";
import { FirebaseEngine } from "@/lib/engines/firebase";
import type { FirestoreDoc } from "@/lib/engines/firebase";
import { DemoFrame } from "./DemoFrame";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type OrderItem = {
  name: string;
  qty: number;
  price: number;
};

type OrderStatus = "recibido" | "preparando" | "enviado" | "entregado";

interface Order extends FirestoreDoc {
  customer: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
}

interface FsLogEntry {
  kind: string;
  id: string;
  at: number;
}

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

const ORDER_NAMES = [
  "Ana", "Luis", "María", "Pedro", "Sofía",
  "Carlos", "Camila", "Jorge", "Valentina", "Diego",
];
const ORDER_ITEMS_LIST = [
  "Café Sierra", "Té verde", "Galletas", "Chocolate",
  "Cacao", "Café Tolima", "Té manzanilla",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function money(n: number): string {
  return `$ ${n.toLocaleString("es-CO")}`;
}

function fakeOrder(): Omit<Order, "id"> {
  const items: OrderItem[] = Array.from(
    { length: 1 + Math.floor(Math.random() * 3) },
    () => ({
      name: pick(ORDER_ITEMS_LIST),
      qty: 1 + Math.floor(Math.random() * 3),
      price: 5000 + Math.floor(Math.random() * 30000),
    }),
  );
  const total = items.reduce((s, it) => s + it.qty * it.price, 0);
  return {
    customer: pick(ORDER_NAMES),
    items,
    total,
    status: "recibido",
    createdAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* StatusPill                                                          */
/* ------------------------------------------------------------------ */

const STATUS_TINTS: Record<OrderStatus, string> = {
  recibido: "bg-sun-100 text-sun-700",
  preparando: "bg-sea-100 text-sea-700",
  enviado: "bg-lav-100 text-lav-700",
  entregado: "bg-mint-100 text-mint-700",
};

function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] tracking-widest uppercase ${STATUS_TINTS[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* OrdersDemo                                                          */
/* ------------------------------------------------------------------ */

export function OrdersDemo() {
  const [engine] = useState(() => new FirebaseEngine());
  const [, force] = useState(0);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<FsLogEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const orders = (engine.firestore.collection("orders").docs() as Order[]).sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  useEffect(() => {
    const unsub = engine.firestore.onAny((ev) => {
      setLog((l) =>
        [...l, { kind: ev.kind, id: ev.doc.id, at: Date.now() }].slice(-7),
      );
      force((x) => x + 1);
    });
    return unsub;
  }, [engine]);

  // cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function emit() {
    engine.firestore.collection("orders").add(fakeOrder());
  }

  function setStatus(id: string, status: OrderStatus) {
    engine.firestore.collection("orders").update(id, { status });
  }

  function removeOrder(id: string) {
    engine.firestore.collection("orders").delete(id);
  }

  function toggleAuto() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
    } else {
      emit();
      intervalRef.current = setInterval(emit, 2500);
      setRunning(true);
    }
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status !== "entregado").length;

  return (
    <DemoFrame
      icon="◷"
      title="Dashboard del comercio · Firestore"
      subtitle="onSnapshot(collection('orders'), …)"
    >
      <div className="grid min-h-[480px] grid-cols-1 lg:grid-cols-2">
        {/* Left — order list */}
        <div className="border-b border-line bg-paper p-6 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-display text-[20px] font-semibold tracking-tight">
                Pedidos en vivo
              </div>
              <div className="font-mono text-[11px] text-ink-mute">
                {pending} pendientes · {money(totalRevenue)} acumulado
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={emit}
                className="rounded-lg border border-line bg-cream-deep px-3 py-1.5 text-[12px] text-ink transition hover:bg-cream"
              >
                + pedido
              </button>
              <button
                onClick={toggleAuto}
                aria-pressed={running}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                  running ? "bg-rose-500 text-cream" : "bg-ink text-cream"
                }`}
              >
                {running ? "■ pausar" : "▶ auto"}
              </button>
            </div>
          </div>

          <div className="space-y-2 overflow-auto" style={{ maxHeight: 380 }}>
            {orders.length === 0 ? (
              <div className="py-8 text-center text-[13px] italic text-ink-mute">
                Aún no hay pedidos. Dale a{" "}
                <strong className="text-ink">▶ auto</strong> para simular tráfico real.
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="anim-fade-up flex items-start gap-3 rounded-xl border border-line bg-cream p-3"
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sea-100 font-display text-[14px] font-medium italic text-sea-700"
                    aria-hidden="true"
                  >
                    {o.customer[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-ink">{o.customer}</span>
                      <span className="font-mono text-[11px] text-ink-mute">
                        {new Date(o.createdAt).toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink-soft">
                      {o.items.map((it, i) => (
                        <span key={i}>
                          {it.qty}× {it.name}
                          {i < o.items.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[12px] text-ink">{money(o.total)}</span>
                      <div className="flex items-center gap-1">
                        <StatusPill status={o.status} />
                        <label htmlFor={`status-${o.id}`} className="sr-only">
                          Estado del pedido de {o.customer}
                        </label>
                        <select
                          id={`status-${o.id}`}
                          value={o.status}
                          onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                          className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10.5px]"
                        >
                          <option value="recibido">recibido</option>
                          <option value="preparando">preparando</option>
                          <option value="enviado">enviado</option>
                          <option value="entregado">entregado</option>
                        </select>
                        <button
                          onClick={() => removeOrder(o.id)}
                          aria-label={`Eliminar pedido de ${o.customer}`}
                          className="px-1 text-ink-mute hover:text-rose-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — Firestore state panel */}
        <div className="flex flex-col gap-3 bg-ink p-6 font-mono text-[12px] text-cream">
          <div className="text-[10.5px] tracking-widest text-sun-500 uppercase">
            Colección · orders ({orders.length} docs)
          </div>

          <div
            className="flex-1 overflow-auto rounded-xl border border-white/10 bg-white/5 p-3.5"
            style={{ maxHeight: 260 }}
            aria-label="Estado de la colección orders"
          >
            {orders.length === 0 ? (
              <span className="italic text-cream/40">[ ]</span>
            ) : (
              <div className="space-y-2 text-[11px] leading-relaxed">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="border-b border-white/5 pb-2 last:border-b-0">
                    <div className="text-rose-300">&quot;{o.id.slice(0, 12)}…&quot;</div>
                    <div className="pl-3 text-cream/80">
                      <div>
                        <span className="text-sun-500">customer</span>:{" "}
                        <span className="text-mint-100">&quot;{o.customer}&quot;</span>
                      </div>
                      <div>
                        <span className="text-sun-500">total</span>:{" "}
                        <span className="text-sun-500">{o.total}</span>
                      </div>
                      <div>
                        <span className="text-sun-500">status</span>:{" "}
                        <span className="text-mint-100">&quot;{o.status}&quot;</span>
                      </div>
                    </div>
                  </div>
                ))}
                {orders.length > 5 && (
                  <div className="text-cream/40">… y {orders.length - 5} más</div>
                )}
              </div>
            )}
          </div>

          <div className="text-[10.5px] tracking-widest text-sun-500 uppercase">
            Eventos del listener
          </div>
          <div
            className="overflow-auto rounded-xl border border-white/10 bg-white/5 p-3.5"
            style={{ minHeight: 90 }}
            aria-live="polite"
            aria-label="Log de eventos Firestore"
          >
            {log.length === 0 ? (
              <div className="italic text-cream/40">esperando cambios…</div>
            ) : (
              log.map((e, i) => (
                <div
                  key={i}
                  className={`mb-0.5 text-[11px] ${i === log.length - 1 ? "anim-fade-up" : ""}`}
                >
                  <span
                    className={
                      e.kind === "add"
                        ? "text-mint-100"
                        : e.kind === "update"
                          ? "text-sea-300"
                          : "text-rose-300"
                    }
                  >
                    {e.kind.toUpperCase()}
                  </span>
                  <span className="text-cream/40"> · </span>
                  <span className="text-rose-300">&quot;{e.id.slice(0, 12)}…&quot;</span>
                </div>
              ))
            )}
          </div>

          <div className="text-[10.5px] leading-relaxed text-cream/50">
            Tu app no hace polling: Firestore{" "}
            <strong className="text-cream">empuja</strong> los cambios. Cada vez que llega un
            pedido, esta pantalla y la del cliente y la del cocinero se actualizan juntas.
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
