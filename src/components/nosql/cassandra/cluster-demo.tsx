"use client";

import { useCallback, useRef, useState } from "react";
import { Cluster, hash32 } from "@/lib/engines/cassandra";
import type { CassandraNode, StoredRow } from "@/lib/engines/cassandra";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface ChatChannel {
  id: string;
  color: string;
  tint: "sun" | "sea" | "mint" | "rose" | "lav";
}

const CHATS: ChatChannel[] = [
  { id: "general", color: "#f59e0b", tint: "sun" },
  { id: "random", color: "#3b82f6", tint: "sea" },
  { id: "project-x", color: "#22c55e", tint: "mint" },
  { id: "help", color: "#f472b6", tint: "rose" },
  { id: "jokes", color: "#8b5cf6", tint: "lav" },
];

const TINT_BG: Record<ChatChannel["tint"], string> = {
  sun: "bg-sun-100 text-sun-700 border-sun-300",
  sea: "bg-sea-100 text-sea-700 border-sea-300",
  mint: "bg-mint-100 text-mint-700 border-mint-300",
  rose: "bg-rose-100 text-rose-700 border-rose-300",
  lav: "bg-lav-100 text-lav-700 border-lav-300",
};

interface SeedMessage {
  chat: string;
  by: string;
  text: string;
}

const SEED_MSGS: SeedMessage[] = [
  { chat: "general", by: "ana", text: "Buenos días equipo" },
  { chat: "general", by: "luis", text: "Hola 👋" },
  { chat: "project-x", by: "ana", text: "Revisemos el sprint" },
  { chat: "random", by: "maria", text: "Vieron el partido?" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtHash(n: number): string {
  return "0x" + n.toString(16).padStart(8, "0");
}

function buildInitialCluster(): Cluster {
  const c = new Cluster({ nodes: 5, rf: 3 });
  const baseTs = Date.now() - 5 * 60 * 1000;
  SEED_MSGS.forEach((m, i) => {
    const ts = baseTs + i * 60 * 1000;
    c.insert(m.chat, ts, { by: m.by, text: m.text });
  });
  return c;
}

// ---------------------------------------------------------------------------
// DemoFrame
// ---------------------------------------------------------------------------

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
    <div className="bg-paper border-line shadow-paper2 my-8 overflow-hidden rounded-3xl border">
      <div className="bg-cream-deep border-line flex items-center gap-3 border-b px-5 py-3">
        <span className="font-display text-ink-soft text-[22px] leading-none italic">
          {icon}
        </span>
        <div className="leading-tight">
          <div className="text-ink font-display text-[15px] font-semibold">{title}</div>
          <div className="text-ink-mute font-mono text-[10.5px] tracking-wider uppercase">
            {subtitle}
          </div>
        </div>
        <span className="ml-auto flex gap-1.5">
          <span className="bg-rose-300 h-2.5 w-2.5 rounded-full" aria-hidden="true" />
          <span className="bg-sun-500 h-2.5 w-2.5 rounded-full" aria-hidden="true" />
          <span className="bg-mint-500 h-2.5 w-2.5 rounded-full" aria-hidden="true" />
        </span>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClusterRing (SVG)
// ---------------------------------------------------------------------------

interface FlyingDot {
  toIdx: number;
  color: string;
}

interface HighlightInfo {
  chat: string;
  ownerIdx: number;
  replicas: number[];
  hash: number;
}

function ClusterRing({
  cluster,
  highlight,
  focused,
  onClickNode,
  flying,
}: {
  cluster: Cluster;
  highlight: HighlightInfo | null;
  focused: number | null;
  onClickNode: (i: number) => void;
  flying: FlyingDot[];
}) {
  const N = cluster.nodes.length;
  const cx = 200;
  const cy = 200;
  const R = 130;
  const NODE_R = 36;
  const angles = cluster.nodes.map(
    (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / N,
  );
  const positions = angles.map((a) => ({
    x: cx + R * Math.cos(a),
    y: cy + R * Math.sin(a),
  }));

  return (
    <svg
      viewBox="0 0 400 400"
      className="mx-auto block w-full max-w-[400px]"
      aria-label="Anillo del clúster Cassandra con 5 nodos"
    >
      {/* Ring */}
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke="rgba(26,22,17,0.15)"
        strokeWidth="1"
        strokeDasharray="3 5"
      />
      {/* Center labels */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="#8a7766"
        fontSize="11"
        fontStyle="italic"
        letterSpacing="1"
      >
        cluster
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="#4a3d2f"
        fontSize="14"
        fontWeight="600"
      >
        RF = {cluster.rf}
      </text>

      {/* Replication highlight arcs */}
      {highlight?.replicas.map((idx, i) => {
        const p = positions[idx]!;
        const isOwner = i === 0;
        return (
          <circle
            key={`hl-${idx}`}
            cx={p.x}
            cy={p.y}
            r={NODE_R + 6 + i * 4}
            fill="none"
            stroke={isOwner ? "#f59e0b" : "#fbcfe8"}
            strokeWidth={isOwner ? 2.5 : 1.5}
            strokeDasharray={isOwner ? undefined : "4 3"}
            opacity={0.7 - i * 0.15}
          >
            {!isOwner && (
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-14"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        );
      })}

      {/* Flying dots (insert animation) */}
      {flying.map((f, i) => (
        <circle key={i} r="6" fill={f.color}>
          <animate
            attributeName="cx"
            from={cx}
            to={positions[f.toIdx]!.x}
            dur="0.7s"
            fill="freeze"
          />
          <animate
            attributeName="cy"
            from={cy}
            to={positions[f.toIdx]!.y}
            dur="0.7s"
            fill="freeze"
          />
          <animate
            attributeName="opacity"
            from="1"
            to="0"
            dur="0.7s"
            begin="0.5s"
            fill="freeze"
          />
        </circle>
      ))}

      {/* Node circles */}
      {cluster.nodes.map((node, i) => {
        const p = positions[i]!;
        const isFocus = focused === i;
        const rowCount = [...node.partitions.values()].reduce(
          (s, arr) => s + arr.length,
          0,
        );
        return (
          <g
            key={node.id}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`Nodo ${i + 1}, ${rowCount} filas`}
            onClick={() => onClickNode(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClickNode(i);
              }
            }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={NODE_R}
              fill={isFocus ? "#1a1611" : "#fff"}
              stroke={isFocus ? "#f59e0b" : "#1a1611"}
              strokeWidth="2"
            />
            <text
              x={p.x}
              y={p.y - 4}
              textAnchor="middle"
              fontSize="13"
              fill={isFocus ? "#fbf7ed" : "#1a1611"}
              fontWeight="600"
            >
              N{i + 1}
            </text>
            <text
              x={p.x}
              y={p.y + 11}
              textAnchor="middle"
              fontSize="9"
              fill={isFocus ? "#fbf7ed" : "#8a7766"}
            >
              {rowCount} fila{rowCount === 1 ? "" : "s"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// NodeInspector
// ---------------------------------------------------------------------------

function NodeInspector({ node, idx }: { node: CassandraNode; idx: number }) {
  const partitions = [...node.partitions.entries()];
  if (partitions.length === 0) {
    return (
      <p className="text-cream/40 py-3 text-[12px] italic">
        Node N{idx + 1} no contiene aún ninguna partición. Insertá un mensaje
        cuya partition key caiga aquí.
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {partitions.map(([pk, rows]) => {
        const chat = CHATS.find((c) => c.id === pk);
        const color = chat ? chat.color : "#f59e0b";
        return (
          <div
            key={pk}
            className="overflow-hidden rounded-lg border border-white/10 bg-white/5"
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: color }}
                aria-hidden="true"
              />
              <span className="text-cream/60 font-mono text-[10.5px] tracking-widest uppercase">
                partition
              </span>
              <span className="text-cream font-mono text-[12px]">
                &quot;{pk}&quot;
              </span>
              <span className="text-cream/40 ml-auto font-mono text-[10.5px]">
                {rows.length} fila{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="font-mono text-[11px] divide-y divide-white/5">
              {rows.map((r: StoredRow, i: number) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1">
                  <span className="text-sun-500 w-20 shrink-0">
                    {fmtTime(r._clustering)}
                  </span>
                  <span className="text-rose-300">{String(r.by)}:</span>
                  <span className="text-cream/80 truncate">{String(r.text)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClusterDemo
// ---------------------------------------------------------------------------

interface HistoryEntry {
  cmd: string;
  info: string;
}

export function ClusterDemo() {
  const [cluster] = useState<Cluster>(buildInitialCluster);
  // Increment to force a re-render after mutating the cluster
  const [tick, setTick] = useState(0);
  const [chat, setChat] = useState<string>("general");
  const [author, setAuthor] = useState<string>("tu");
  const [text, setText] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [highlight, setHighlight] = useState<HighlightInfo | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [flying, setFlying] = useState<FlyingDot[]>([]);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const insertedCount = cluster.totalRows();

  const insertMsg = useCallback(() => {
    if (!text.trim()) return;
    const ts = Date.now();
    const row = { by: author || "tu", text: text.trim() };
    cluster.insert(chat, ts, row);
    const ownerIdx = cluster.ownerIndex(chat);
    const replicas = cluster.replicaIndices(chat);
    const h = hash32(chat);
    setHighlight({ chat, ownerIdx, replicas, hash: h });

    const chatObj = CHATS.find((c) => c.id === chat)!;
    const fly: FlyingDot[] = replicas.map((idx) => ({
      toIdx: idx,
      color: chatObj.color,
    }));
    setFlying(fly);
    if (flyTimer.current) clearTimeout(flyTimer.current);
    flyTimer.current = setTimeout(() => setFlying([]), 1300);

    const cmdText = `INSERT INTO messages (chat_id, ts, by, text) VALUES ('${chat}', ${ts}, '${author || "tu"}', '${text.trim().replace(/'/g, "''")}')`;
    const infoText = `hash("${chat}") = ${fmtHash(h)} → N${ownerIdx + 1} (+ N${replicas.slice(1).map((i) => i + 1).join(", N")})`;
    setHistory((prev) => [...prev, { cmd: cmdText, info: infoText }].slice(-6));
    setText("");
    setTick((x) => x + 1);
  }, [chat, author, text, cluster]);

  const queryChat = useCallback(
    (c: string) => {
      const rows = cluster.selectPartition(c);
      const ownerIdx = cluster.ownerIndex(c);
      const replicas = cluster.replicaIndices(c);
      const h = hash32(c);
      setHighlight({ chat: c, ownerIdx, replicas, hash: h });
      const infoText = `hash("${c}") → leer de N${ownerIdx + 1} · ${rows.length} fila${rows.length === 1 ? "" : "s"}`;
      setHistory((prev) =>
        [...prev, { cmd: `SELECT * FROM messages WHERE chat_id = '${c}'`, info: infoText }].slice(-6),
      );
    },
    [cluster],
  );

  const handleNodeClick = useCallback(
    (i: number) => {
      setFocused((prev) => (prev === i ? null : i));
    },
    [],
  );

  // Suppress unused-variable warning for tick — it forces re-renders only
  void tick;

  return (
    <DemoFrame
      icon="◉"
      title="Clúster Cassandra · 5 nodos · RF 3"
      subtitle="hash(partition_key) → owner + 2 réplicas"
    >
      <div className="grid min-h-[520px] grid-cols-1 xl:grid-cols-[1fr_1.2fr]">
        {/* LEFT: form + recent messages */}
        <div className="bg-paper border-line overflow-auto border-b p-6 xl:border-b-0 xl:border-r">
          {/* Insert form */}
          <div className="bg-cream-deep border-line mb-5 rounded-2xl border p-4">
            <div className="text-ink-mute mb-2 font-mono text-[10.5px] tracking-widest uppercase">
              Insertar mensaje
            </div>
            {/* Channel selector */}
            <div className="mb-2 flex flex-wrap gap-2">
              {CHATS.map((c) => {
                const active = chat === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChat(c.id)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[11.5px] transition ${
                      active
                        ? "bg-ink text-cream border-ink"
                        : `${TINT_BG[c.tint]} hover:opacity-80`
                    }`}
                  >
                    #{c.id}
                  </button>
                );
              })}
            </div>
            {/* Author + text inputs */}
            <div className="mb-2 flex items-center gap-2">
              <label htmlFor="cass-author" className="sr-only">
                Autor
              </label>
              <input
                id="cass-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="bg-paper border-line w-24 rounded border px-2 py-1.5 font-mono text-[12px] focus:outline-none focus:border-sun-500"
                placeholder="autor"
              />
              <label htmlFor="cass-text" className="sr-only">
                Texto del mensaje
              </label>
              <input
                id="cass-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") insertMsg();
                }}
                placeholder="texto del mensaje…"
                className="bg-paper border-line flex-1 rounded border px-2 py-1.5 font-mono text-[12.5px] focus:outline-none focus:border-sun-500"
              />
              <button
                type="button"
                onClick={insertMsg}
                disabled={!text.trim()}
                className="bg-ink text-cream rounded-md px-3 py-1.5 text-[12px] disabled:opacity-40"
              >
                INSERT
              </button>
            </div>
            <p className="text-ink-mute font-mono text-[10.5px] leading-relaxed">
              <strong className="text-ink">partition_key</strong> ={" "}
              <span className="text-sun-700">&apos;{chat}&apos;</span> → el hash
              decide el nodo. La fila{" "}
              <strong className="text-ink">
                se replica en {cluster.rf} nodos
              </strong>
              .
            </p>
          </div>

          {/* SELECT buttons */}
          <div className="text-ink-mute mb-2 font-mono text-[10.5px] tracking-widest uppercase">
            SELECT por partition key
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {CHATS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => queryChat(c.id)}
                className="bg-paper border-line text-ink-soft hover:bg-cream-deep rounded-full border px-2.5 py-1 font-mono text-[11px]"
              >
                WHERE chat_id = &apos;{c.id}&apos;
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="text-ink-mute mb-2 font-mono text-[10.5px] tracking-widest uppercase">
            Total en el clúster · {insertedCount} fila(s) lógicas
          </div>
          <p className="text-ink-soft text-[12px] leading-relaxed">
            Cada fila se almacena {cluster.rf} veces (replicación). Los nodos
            comparten el espacio del anillo y cada partición vive completa en su
            nodo dueño + sus {cluster.rf - 1} réplicas siguientes.
          </p>
        </div>

        {/* RIGHT: ring + node panel + CQL log */}
        <div className="bg-ink text-cream flex flex-col gap-3 p-6 font-mono text-[12px]">
          <ClusterRing
            cluster={cluster}
            highlight={highlight}
            focused={focused}
            onClickNode={handleNodeClick}
            flying={flying}
          />

          {/* Hash info panel */}
          {highlight && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11.5px]">
              <span className="text-sun-500">hash(</span>
              <span className="text-mint-100">&quot;{highlight.chat}&quot;</span>
              <span className="text-sun-500">) = </span>
              <span className="text-rose-300">{fmtHash(highlight.hash)}</span>
              <span className="text-cream/40"> → </span>
              <span className="text-cream">owner: N{highlight.ownerIdx + 1}</span>
              <span className="text-cream/40">
                , réplicas en N
                {highlight.replicas
                  .slice(1)
                  .map((i) => i + 1)
                  .join(" / N")}
              </span>
            </div>
          )}

          {/* Node inspector */}
          <div
            className="text-sun-500 text-[10.5px] tracking-widest uppercase"
            aria-live="polite"
          >
            {focused !== null
              ? `Contenido de N${focused + 1}`
              : "Selecciona un nodo para inspeccionarlo"}
          </div>
          <div
            className="max-h-[180px] min-h-[100px] overflow-auto rounded-xl border border-white/10 bg-white/5 p-3.5"
          >
            {focused !== null ? (
              <NodeInspector node={cluster.nodes[focused]!} idx={focused} />
            ) : (
              <p className="text-cream/40 text-[12px] italic">
                Tocá un nodo del anillo para ver qué particiones guarda.
              </p>
            )}
          </div>

          {/* CQL log */}
          <div className="text-sun-500 text-[10.5px] tracking-widest uppercase">
            CQL log
          </div>
          <div
            className="max-h-[180px] min-h-[100px] overflow-auto rounded-xl border border-white/10 bg-white/5 p-3.5"
            aria-live="polite"
            aria-label="Historial de comandos CQL"
          >
            {history.length === 0 ? (
              <p className="text-cream/40 italic">Esperando comandos…</p>
            ) : (
              history.map((h, i) => (
                <div
                  key={i}
                  className={`mb-1.5 ${i === history.length - 1 ? "anim-fade-up" : ""}`}
                >
                  <div className="text-mint-100 break-all text-[11px]">
                    <span className="text-cream/40">cqlsh&gt; </span>
                    {h.cmd};
                  </div>
                  <div className="text-cream/60 pl-4 text-[10.5px]">
                    {h.info}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
