"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exec, RedisDB, type RedisEntry, type RedisType } from "@/lib/engines/redis";
import { highlightRedis, type HlPart } from "./highlight";

/* ---------- Types ---------- */

interface Sample {
  label: string;
  sql: string; // kept as "sql" to match legacy shape used in lesson
}

interface Status {
  ok: boolean;
  message: string;
}

interface CommandOutputEntry {
  ok: boolean;
  cmd: string;
  args: string[];
  result?: unknown;
  error?: string;
}

/* ---------- Type metadata ---------- */

const TYPE_META: Record<
  RedisType,
  { tint: string; ring: string; label: string; mark: string; text: string }
> = {
  string: { tint: "bg-sun-100",  ring: "border-sun-500",  label: "STRING", mark: '"abc"',   text: "text-sun-700"  },
  list:   { tint: "bg-sea-100",  ring: "border-sea-500",  label: "LIST",   mark: "[ ↦ ]",   text: "text-sea-700"  },
  hash:   { tint: "bg-rose-100", ring: "border-rose-500", label: "HASH",   mark: "{ k:v }",  text: "text-rose-700" },
  set:    { tint: "bg-mint-100", ring: "border-mint-500", label: "SET",    mark: "{ • }",    text: "text-mint-700" },
  zset:   { tint: "bg-lav-100",  ring: "border-lav-500",  label: "ZSET",   mark: "↧ #↧",    text: "text-lav-700"  },
};

/* ---------- TTL badge ---------- */

function TtlBadge({ expireAt }: { expireAt: number | undefined }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!expireAt) return;
    const update = () => setLeft(Math.max(0, Math.ceil((expireAt - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expireAt]);

  if (!expireAt) return null;
  return (
    <span className="ml-2 font-mono text-[10px] tracking-wider uppercase text-rose-700 bg-rose-50 border border-rose-300 px-1.5 py-0.5 rounded">
      ttl {left}s
    </span>
  );
}

/* ---------- Key value renderer ---------- */

function renderValue(entry: RedisEntry) {
  if (entry.type === "string") {
    const isNum = /^-?\d+(\.\d+)?$/.test(entry.val as string);
    return (
      <div
        className={`font-mono text-[14px] break-all ${isNum ? "text-sun-700 font-semibold text-xl" : "text-ink"}`}
      >
        {isNum ? (entry.val as string) : `"${entry.val as string}"`}
      </div>
    );
  }
  if (entry.type === "list") {
    const list = entry.val as string[];
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {list.length === 0 ? (
          <span className="text-ink-mute italic text-[12px]">(vacía)</span>
        ) : (
          list.map((v, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="font-mono text-[12px] bg-sea-50 border border-sea-300 px-2 py-0.5 rounded">{`"${v}"`}</span>
              {i < list.length - 1 && <span className="text-ink-mute text-[10px]">→</span>}
            </span>
          ))
        )}
      </div>
    );
  }
  if (entry.type === "hash") {
    const hash = entry.val as Record<string, string>;
    const keys = Object.keys(hash);
    if (keys.length === 0) return <span className="text-ink-mute italic text-[12px]">(vacío)</span>;
    return (
      <table className="border-collapse text-[12px] w-full">
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-b border-dashed border-line-soft last:border-b-0">
              <td className="font-mono text-rose-700 pr-3 py-1">{k}</td>
              <td className="font-mono text-ink py-1 text-right">{hash[k]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (entry.type === "set") {
    const set = entry.val as string[];
    return (
      <div className="flex flex-wrap gap-1.5">
        {set.length === 0 ? (
          <span className="text-ink-mute italic text-[12px]">(vacío)</span>
        ) : (
          set.map((v, i) => (
            <span
              key={i}
              className="font-mono text-[12px] bg-mint-50 border border-mint-300 px-2 py-0.5 rounded-full"
            >{`"${v}"`}</span>
          ))
        )}
      </div>
    );
  }
  if (entry.type === "zset") {
    const zset = entry.val as Record<string, number>;
    const sorted = Object.entries(zset).sort((a, b) => a[1] - b[1]);
    if (sorted.length === 0) return <span className="text-ink-mute italic text-[12px]">(vacío)</span>;
    return (
      <div className="flex flex-col gap-1">
        {sorted.map(([m, s]) => (
          <div key={m} className="flex items-center gap-2 text-[12px]">
            <span className="font-mono text-[10px] text-lav-700 bg-lav-50 border border-lav-300 px-1.5 py-0.5 rounded w-12 text-center">
              {s}
            </span>
            <span className="font-mono text-ink">{`"${m}"`}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

/* ---------- Key card ---------- */

function KeyCard({
  keyName,
  entry,
  justSet,
  justTouched,
}: {
  keyName: string;
  entry: RedisEntry;
  justSet: boolean;
  justTouched: boolean;
}) {
  const m = TYPE_META[entry.type] ?? TYPE_META.string;
  return (
    <div
      className={[
        "anim-table-in bg-paper rounded-2xl border border-line shadow-paper2 overflow-hidden flex flex-col",
        justSet ? "ring-2 ring-sun-500 ring-offset-2 ring-offset-cream" : "",
        justTouched ? "ring-2 ring-sea-500 ring-offset-2 ring-offset-cream" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`flex items-center gap-2 px-3.5 py-2 ${m.tint} border-b-2 ${m.ring}`}>
        <span className="font-mono text-[11px] tracking-wider uppercase text-ink/70 font-semibold">
          {m.label}
        </span>
        <span className="font-mono text-[13px] font-semibold text-ink truncate">{keyName}</span>
        <TtlBadge expireAt={entry.expireAt} />
      </div>
      <div className="p-3.5 bg-paper">{renderValue(entry)}</div>
    </div>
  );
}

/* ---------- Result log (Redis CLI style) ---------- */

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "(nil)";
  if (Array.isArray(v)) {
    if (v.length === 0) return "(empty array)";
    return v.map((x, i) => `${i + 1}) ${typeof x === "string" ? `"${x}"` : String(x)}`).join("\n");
  }
  if (typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>);
    if (keys.length === 0) return "(empty hash)";
    const out: string[] = [];
    keys.forEach((k, i) => {
      out.push(`${i * 2 + 1}) "${k}"`);
      out.push(`${i * 2 + 2}) "${(v as Record<string, unknown>)[k]}"`);
    });
    return out.join("\n");
  }
  if (typeof v === "string") return `"${v}"`;
  return String(v);
}

function ResultLog({ outputs }: { outputs: CommandOutputEntry[] }) {
  if (!outputs || outputs.length === 0) return null;
  return (
    <div className="bg-ink text-cream rounded-2xl px-5 py-4 mt-4 font-mono text-[12.5px] border border-ink">
      <div className="flex justify-between text-sun-500 text-[10.5px] tracking-widest uppercase mb-2">
        <span>
          {outputs.length} comando{outputs.length === 1 ? "" : "s"}
        </span>
        <span>↳ redis-cli</span>
      </div>
      <div className="space-y-1.5">
        {outputs.map((o, i) => (
          <div key={i}>
            <div className="text-sun-500">
              <span className="text-white/40">{"127.0.0.1:6379> "}</span>
              {o.cmd}
              {o.args && o.args.length
                ? " " + o.args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")
                : ""}
            </div>
            {o.ok ? (
              <div className="text-mint-100 whitespace-pre-wrap pl-4">{fmtVal(o.result)}</div>
            ) : (
              <div className="text-rose-300 pl-4">(error) {o.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Highlighted Redis editor ---------- */

function HighlightedRedis({ source }: { source: string }) {
  const parts: HlPart[] = useMemo(() => highlightRedis(source), [source]);
  return (
    <pre>
      {parts.map((p, i) => (
        <span key={i} className={p.cls}>
          {p.text}
        </span>
      ))}
    </pre>
  );
}

/* ---------- Redis editor panel ---------- */

function RedisEditor({
  value,
  onChange,
  onRun,
  onReset,
  status,
  samples,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onReset: () => void;
  status: Status | null;
  samples?: Sample[];
}) {
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onRun();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const en = ta.selectionEnd;
      const v = ta.value;
      onChange(v.slice(0, s) + "  " + v.slice(en));
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 2;
      });
    }
  };

  return (
    <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-line bg-cream">
      <div className="flex gap-1 px-3 pt-2 bg-paper border-b border-line-soft">
        <div className="font-mono text-[11px] tracking-wider px-3 py-1.5 rounded-t-md bg-cream text-ink border border-b-0 border-line-soft">
          redis-cli
        </div>
      </div>
      <div className="editor-wrap relative bg-cream min-h-[280px] flex-1">
        <HighlightedRedis source={value + (value.endsWith("\n") ? " " : "")} />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Editor Redis CLI"
        />
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-paper border-t border-line-soft flex-wrap">
        <button
          onClick={onRun}
          title="Cmd/Ctrl + Enter"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-ink text-cream text-[13px] font-medium hover:bg-[#2a221a] active:translate-y-px transition"
        >
          <span
            className="inline-block w-0 h-0 border-l-[7px] border-l-sun-500 border-y-[5px] border-y-transparent"
            aria-hidden="true"
          />
          Ejecutar
        </button>
        <button
          onClick={onReset}
          className="px-3 py-2 rounded-lg text-ink-mute hover:text-ink hover:bg-cream-deep text-[13px] transition"
        >
          ↺ Reiniciar
        </button>
        {samples && samples.length > 0 && (
          <div className="flex gap-1.5 ml-1 flex-wrap items-center">
            {samples.map((s, i) => (
              <button
                key={i}
                onClick={() => onChange(s.sql)}
                title={s.label}
                className="font-mono text-[11.5px] bg-paper border border-line px-2.5 py-1 rounded-full text-ink-soft hover:bg-sun-100 hover:text-ink hover:border-sun-500 transition"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div
          className="ml-auto font-mono text-[11px] text-ink-mute"
          role="status"
          aria-live="polite"
        >
          {status ? (
            status.ok ? (
              <span className="text-mint-700">● {status.message}</span>
            ) : (
              <span className="text-rose-700">● {status.message}</span>
            )
          ) : (
            <span>listo</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- RedisLab (public export) ---------- */

export interface RedisLabProps {
  initialCommands?: string;
  initialState?: { cmds: string };
  samples?: Sample[];
  autorun?: boolean;
  labId?: string;
}

export function RedisLab({
  initialCommands,
  initialState,
  samples,
  autorun,
  labId = "redis-lab",
}: RedisLabProps) {
  function buildInitial(state?: { cmds: string }): RedisDB {
    const d = new RedisDB();
    if (state?.cmds) exec(d, state.cmds);
    return d;
  }

  const [src, setSrc] = useState(initialCommands ?? "");
  const [db, setDb] = useState<RedisDB>(() => buildInitial(initialState));
  const [outputs, setOutputs] = useState<CommandOutputEntry[]>([]);
  const [justSet, setJustSet] = useState<Record<string, boolean>>({});
  const [justTouched, setJustTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [, force] = useState(0);
  const initialRef = useRef(initialState);
  const ranOnce = useRef(false);

  // Tick every second for TTL countdowns
  useEffect(() => {
    const hasTtl = Object.values(db.data).some((v) => v.expireAt !== undefined);
    if (!hasTtl) return;
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [db]);

  const reset = useCallback(() => {
    setDb(buildInitial(initialRef.current));
    setOutputs([]);
    setJustSet({});
    setJustTouched({});
    setStatus({ ok: true, message: "base reiniciada" });
  }, []);

  const runCommands = useCallback(() => {
    const res = exec(db, src);
    // Shallow-clone the db so React sees a new reference
    setDb(Object.assign(Object.create(RedisDB.prototype) as RedisDB, db));
    setOutputs(res.outputs as CommandOutputEntry[]);
    const hasErr = res.outputs.some((o) => !o.ok);
    setStatus({ ok: !hasErr, message: hasErr ? "error" : `${res.outputs.length} ok` });

    const setKeys: Record<string, boolean> = {};
    const touchedKeys: Record<string, boolean> = {};
    for (const e of res.events) {
      if (e.type === "key-set") setKeys[e.key] = true;
      else if (e.type === "key-touch") touchedKeys[e.key] = true;
    }
    setJustSet(setKeys);
    setJustTouched(touchedKeys);
    const id = setTimeout(() => {
      setJustSet({});
      setJustTouched({});
    }, 1200);
    return () => clearTimeout(id);
  }, [db, src]);

  useEffect(() => {
    if (autorun && !ranOnce.current && initialCommands) {
      ranOnce.current = true;
      const id = setTimeout(() => runCommands(), 50);
      return () => clearTimeout(id);
    }
  }, [autorun, initialCommands, runCommands]);

  const keys = db.keyOrder;

  return (
    <div
      id={labId}
      className="my-8 rounded-3xl bg-paper border border-line shadow-paper2 overflow-hidden"
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-cream-deep border-b border-line">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-sun-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-mint-500" />
        </div>
        <span className="font-mono text-[12px] text-ink-mute tracking-wide">~/redis-lab</span>
        <span className="ml-auto font-mono text-[11px] bg-paper px-2.5 py-1 rounded-full text-ink-soft border border-line">
          redis · in-memory
        </span>
      </div>

      {/* Editor + visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] min-h-[360px]">
        <RedisEditor
          value={src}
          onChange={setSrc}
          onRun={runCommands}
          onReset={reset}
          status={status}
          samples={samples}
        />
        <div className="bg-cream p-5 overflow-auto">
          <div className="viz-dots rounded-xl min-h-[320px] p-5">
            {keys.length === 0 ? (
              <div className="grid place-items-center h-[280px] text-center text-ink-mute text-[13.5px]">
                <div>
                  <div className="font-display italic text-[64px] leading-none text-line mb-2" aria-hidden="true">
                    ∅
                  </div>
                  <div>
                    La base está vacía. Escribe un{" "}
                    <code className="font-mono bg-cream-deep px-1.5 py-0.5 rounded">
                      SET clave valor
                    </code>{" "}
                    y ejecuta.
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {keys.map((k) => (
                  <KeyCard
                    key={k}
                    keyName={k}
                    entry={db.data[k]!}
                    justSet={Boolean(justSet[k])}
                    justTouched={Boolean(justTouched[k])}
                  />
                ))}
              </div>
            )}
          </div>
          <ResultLog outputs={outputs} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Snippet (Redis CLI syntax) ---------- */

export function RedisSnippet({ code }: { code: string }) {
  const parts: HlPart[] = useMemo(() => highlightRedis(code), [code]);
  return (
    <pre className="snippet-dark bg-ink text-cream rounded-lg px-5 py-4 font-mono text-[13px] leading-[1.55] overflow-x-auto my-4 mb-6">
      {parts.map((p, i) => (
        <span key={i} className={p.cls}>
          {p.text}
        </span>
      ))}
    </pre>
  );
}
