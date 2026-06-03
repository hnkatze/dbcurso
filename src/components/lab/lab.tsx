"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Database,
  run,
  type Column,
  type EngineEvent,
  type Row,
  type SelectResult,
  type SqlValue,
  type Table,
} from "@/lib/engines/sql";
import { HighlightedCode } from "./highlight";

interface Sample {
  label: string;
  sql: string;
}

interface Status {
  ok: boolean;
  message: string;
}

/* ---------- SQL Editor ---------- */
function SqlEditor({
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
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    const pre = preRef.current;
    if (!ta || !pre) return;
    const sync = () => {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    };
    ta.addEventListener("scroll", sync);
    return () => ta.removeEventListener("scroll", sync);
  }, []);

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
      const next = v.slice(0, s) + "  " + v.slice(en);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 2;
      });
    }
  };

  return (
    <div className="border-line bg-cream flex flex-col border-b lg:border-r lg:border-b-0">
      <div className="bg-paper border-line-soft flex gap-1 border-b px-3 pt-2">
        <div className="bg-cream text-ink border-line-soft rounded-t-md border border-b-0 px-3 py-1.5 font-mono text-[11px] tracking-wider">
          query.sql
        </div>
      </div>
      <div className="editor-wrap bg-cream relative min-h-[280px] flex-1">
        <HighlightedCode source={value + (value.endsWith("\n") ? " " : "")} />
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Editor SQL"
        />
        <pre ref={preRef} style={{ display: "none" }} />
      </div>
      <div className="bg-paper border-line-soft flex flex-wrap items-center gap-2 border-t px-3 py-2.5">
        <button
          onClick={onRun}
          title="Cmd/Ctrl + Enter"
          className="bg-ink text-cream inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition hover:bg-[#2a221a] active:translate-y-px"
        >
          <span className="border-l-sun-500 inline-block h-0 w-0 border-y-[5px] border-l-[7px] border-y-transparent" />
          Ejecutar
        </button>
        <button
          onClick={onReset}
          title="Reiniciar base de datos"
          className="text-ink-mute hover:text-ink hover:bg-cream-deep rounded-lg px-3 py-2 text-[13px] transition"
        >
          ↺ Reiniciar
        </button>
        {samples && samples.length > 0 && (
          <div className="ml-1 flex flex-wrap items-center gap-1.5">
            {samples.map((s, i) => (
              <button
                key={i}
                onClick={() => onChange(s.sql)}
                title={s.label}
                className="bg-paper border-line text-ink-soft hover:bg-sun-100 hover:text-ink hover:border-sun-500 rounded-full border px-2.5 py-1 font-mono text-[11.5px] transition"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="text-ink-mute ml-auto font-mono text-[11px]" role="status" aria-live="polite">
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

/* ---------- Animated table viz ---------- */
const TINTS: Record<string, { head: string; ring: string }> = {
  "": { head: "bg-sun-100", ring: "border-b-sun-500" },
  b: { head: "bg-sea-100", ring: "border-b-sea-500" },
  p: { head: "bg-rose-100", ring: "border-b-rose-500" },
  g: { head: "bg-mint-100", ring: "border-b-mint-500" },
  v: { head: "bg-lav-100", ring: "border-b-lav-500" },
};
const TINT_ORDER = ["", "b", "p", "g", "v"];
function tintFor(name: string, allNames: string[]): string {
  const idx = allNames.indexOf(name);
  return TINT_ORDER[idx % TINT_ORDER.length]!;
}

function formatCell(v: SqlValue): React.ReactNode {
  if (v === null || v === undefined) return <span className="text-ink-mute italic">NULL</span>;
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function TableCard({
  table,
  tint,
  hitIndices,
  addedIndices,
  deletedRows,
  updatedIndices,
}: {
  table: Table;
  tint: string;
  hitIndices?: number[];
  addedIndices?: number[];
  deletedRows: Row[];
  updatedIndices?: number[];
}) {
  const t = TINTS[tint] || TINTS[""]!;
  const pkCol = table.cols.find((c) => c.pk);
  return (
    <div className="anim-table-in bg-paper border-line shadow-paper2 min-w-[200px] overflow-hidden rounded-2xl border">
      <div className={`flex items-center justify-between gap-3 border-b-2 px-3.5 py-2.5 ${t.head} ${t.ring}`}>
        <span className="text-ink font-mono text-[13px] font-semibold">{table.name}</span>
        <span className="font-display text-ink-soft text-base italic">∷</span>
      </div>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {table.cols.map((c: Column) => (
              <th
                key={c.name}
                className="text-ink-mute bg-paper-soft border-line-soft border-b border-dashed px-3.5 py-1.5 text-left font-mono text-[11px] font-medium tracking-wider whitespace-nowrap uppercase"
              >
                {c.name}
                <span className="text-ink-mute ml-1 text-[9.5px] tracking-normal opacity-70 normal-case">
                  {c.type}
                  {c.typeArgs ? `(${c.typeArgs})` : ""}
                </span>
                {c.pk && (
                  <span className="text-sun-500 ml-1" title="Primary Key" aria-label="Primary Key">
                    🔑
                  </span>
                )}
                {c.fk && (
                  <span className="text-sea-500 ml-1" title={`FK → ${c.fk.refTable}.${c.fk.refCol}`} aria-label="Foreign Key">
                    ↗
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.length === 0 && deletedRows.length === 0 && (
            <tr>
              <td colSpan={table.cols.length} className="text-ink-mute px-4 py-4 text-center text-[12.5px] italic">
                — sin filas —
              </td>
            </tr>
          )}
          {table.rows.map((r, i) => {
            const cls = ["border-b", "border-dashed", "border-line-soft", "last:border-b-0"];
            if (hitIndices && hitIndices.includes(i)) cls.push("bg-sun-100/60", "font-semibold");
            if (addedIndices && addedIndices.includes(i)) cls.push("anim-row-in");
            if (updatedIndices && updatedIndices.includes(i)) cls.push("anim-row-upd");
            return (
              <tr key={pkCol ? `${pkCol.name}:${r[pkCol.name]}` : `r:${i}`} className={cls.join(" ")}>
                {table.cols.map((c) => (
                  <td key={c.name} className="px-3.5 py-1.5 font-mono whitespace-nowrap">
                    {formatCell(r[c.name] ?? null)}
                  </td>
                ))}
              </tr>
            );
          })}
          {deletedRows.map((r, idx) => (
            <tr key={`del-${idx}`} className="anim-row-out border-line-soft border-b border-dashed">
              {table.cols.map((c) => (
                <td key={c.name} className="px-3.5 py-1.5 font-mono whitespace-nowrap">
                  {formatCell(r[c.name] ?? null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Result panel ---------- */
function formatResultCell(v: SqlValue): React.ReactNode {
  if (v === null || v === undefined) return <span className="italic opacity-50">NULL</span>;
  if (typeof v === "number" && !Number.isInteger(v)) return v.toFixed(2);
  return String(v);
}

function ResultPanel({
  result,
  error,
  logs,
}: {
  result: SelectResult | null;
  error: string | null;
  logs: string[];
}) {
  if (error) {
    return (
      <div className="bg-ink text-cream border-ink mt-4 rounded-2xl border px-5 py-4 font-mono text-[12.5px]">
        <div className="text-sun-500 mb-2 flex justify-between text-[10.5px] tracking-widest uppercase">
          <span>Error</span>
          <span>—</span>
        </div>
        <div className="text-rose-300 border-rose-300 mt-1.5 border-l-2 pl-3">{error}</div>
      </div>
    );
  }
  if (!result && (!logs || logs.length === 0)) return null;
  const isSelect = result && result.type === "select";
  return (
    <div className="bg-ink text-cream border-ink mt-4 rounded-2xl border px-5 py-4 font-mono text-[12.5px]">
      <div className="text-sun-500 mb-2 flex justify-between text-[10.5px] tracking-widest uppercase">
        <span>
          {isSelect ? `${result.rows.length} fila${result.rows.length === 1 ? "" : "s"}` : "Resultado"}
        </span>
        <span>↳ ok</span>
      </div>
      {logs && logs.length > 0 && (
        <div className="text-[11.5px] whitespace-pre-wrap text-white/70">
          {logs.map((l) => `→ ${l}`).join("\n")}
        </div>
      )}
      {isSelect &&
        (result.rows.length === 0 ? (
          <div className="text-white/50 italic">— sin filas —</div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  {result.cols.map((c) => (
                    <th
                      key={c}
                      className="text-sun-500 py-1.5 pr-3.5 text-left text-[11px] font-medium tracking-wider uppercase border-b border-white/10"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i}>
                    {result.cols.map((c) => (
                      <td key={c} className="border-b border-white/5 py-1.5 pr-3.5">
                        {formatResultCell(r[c] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

/* ---------- Lab (editor + viz + result) ---------- */
type IndexMap = Record<string, number[]>;
type RowMap = Record<string, Row[]>;

export interface LabProps {
  initialSql?: string;
  initialState?: { sql: string };
  samples?: Sample[];
  autorun?: boolean;
  labId?: string;
}

export function Lab({ initialSql, initialState, samples, autorun, labId = "lab" }: LabProps) {
  function buildInitialDb(state?: { sql: string }): Database {
    const d = new Database();
    if (state && state.sql) run(d, state.sql);
    return d;
  }

  const [sql, setSql] = useState(initialSql || "");
  const [db, setDb] = useState<Database>(() => buildInitialDb(initialState));
  const [result, setResult] = useState<SelectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [hits, setHits] = useState<IndexMap>({});
  const [added, setAdded] = useState<IndexMap>({});
  const [updated, setUpdated] = useState<IndexMap>({});
  const [deleted, setDeleted] = useState<RowMap>({});
  const [status, setStatus] = useState<Status | null>(null);
  const initialRef = useRef(initialState);
  const ranOnceRef = useRef(false);

  const applyEvents = useCallback((events: EngineEvent[]) => {
    const nA: IndexMap = {};
    const nU: IndexMap = {};
    const nH: IndexMap = {};
    const nD: RowMap = {};
    for (const e of events) {
      if (e.type === "row-add") (nA[e.table] = nA[e.table] || []).push(e.index);
      else if (e.type === "row-update") (nU[e.table] = nU[e.table] || []).push(e.index);
      else if (e.type === "select-hit") nH[e.table] = e.indices;
      else if (e.type === "row-delete") (nD[e.table] = nD[e.table] || []).push(e.row);
    }
    setAdded(nA);
    setUpdated(nU);
    setHits(nH);
    setDeleted(nD);
    setTimeout(() => {
      setAdded({});
      setUpdated({});
      setDeleted({});
    }, 900);
    setTimeout(() => setHits({}), 1800);
  }, []);

  const reset = useCallback(() => {
    setDb(buildInitialDb(initialRef.current));
    setResult(null);
    setError(null);
    setLogs([]);
    setHits({});
    setAdded({});
    setUpdated({});
    setDeleted({});
    setStatus({ ok: true, message: "base reiniciada" });
  }, []);

  const run_ = useCallback(() => {
    const res = run(db, sql);
    setDb(Object.assign(Object.create(Database.prototype) as Database, db));
    if (!res.ok) {
      setError(res.error);
      setResult(null);
      setLogs([]);
      setStatus({ ok: false, message: "error" });
      applyEvents(res.events);
      return;
    }
    setError(null);
    const logMsgs: string[] = [];
    let lastResult: SelectResult | null = null;
    for (const r of res.results) {
      if (r.type === "select") lastResult = r;
      else if (r.message) logMsgs.push(r.message);
    }
    setLogs(logMsgs);
    setResult(lastResult);
    setStatus({
      ok: true,
      message: lastResult ? `${lastResult.rows.length} fila(s)` : logMsgs[0] || "ok",
    });
    applyEvents(res.events);
  }, [db, sql, applyEvents]);

  useEffect(() => {
    if (autorun && !ranOnceRef.current && initialSql) {
      ranOnceRef.current = true;
      const id = setTimeout(() => run_(), 50);
      return () => clearTimeout(id);
    }
  }, [autorun, initialSql, run_]);

  const tableNames = Object.keys(db.tables);

  return (
    <div id={labId} className="bg-paper border-line shadow-paper2 my-8 overflow-hidden rounded-3xl border">
      <div className="bg-cream-deep border-line flex items-center gap-3 border-b px-4 py-3">
        <div className="flex gap-1.5">
          <span className="bg-rose-300 h-2.5 w-2.5 rounded-full" />
          <span className="bg-sun-500 h-2.5 w-2.5 rounded-full" />
          <span className="bg-mint-500 h-2.5 w-2.5 rounded-full" />
        </div>
        <span className="text-ink-mute font-mono text-[12px] tracking-wide">~/sql-lab</span>
        <span className="bg-paper text-ink-soft border-line ml-auto rounded-full border px-2.5 py-1 font-mono text-[11px]">
          postgres · in-memory
        </span>
      </div>
      <div className="grid min-h-[360px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <SqlEditor value={sql} onChange={setSql} onRun={run_} onReset={reset} status={status} samples={samples} />
        <div className="bg-cream overflow-auto p-5">
          <div className="viz-dots min-h-[320px] rounded-xl p-5">
            {tableNames.length === 0 ? (
              <div className="text-ink-mute grid h-[280px] place-items-center text-center text-[13.5px]">
                <div>
                  <div className="font-display text-line mb-2 text-[64px] leading-none italic">∅</div>
                  <div>
                    Aún no hay tablas. Escribe{" "}
                    <code className="bg-cream-deep rounded px-1.5 py-0.5 font-mono">CREATE TABLE</code> y dale{" "}
                    <strong>Ejecutar</strong>.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-7">
                {tableNames.map((name) => (
                  <TableCard
                    key={name}
                    table={db.tables[name]!}
                    tint={tintFor(name, tableNames)}
                    hitIndices={hits[name]}
                    addedIndices={added[name]}
                    updatedIndices={updated[name]}
                    deletedRows={deleted[name] || []}
                  />
                ))}
              </div>
            )}
          </div>
          <ResultPanel result={result} error={error} logs={logs} />
        </div>
      </div>
    </div>
  );
}
