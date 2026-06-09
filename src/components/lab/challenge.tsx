"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Lightbulb, X } from "lucide-react";
import { HighlightedCode } from "./highlight";
import { checkChallenge, type Challenge, type CheckResult, type Nivel } from "@/lib/challenges/core";
import type { SqlValue } from "@/lib/engines/sql";

const NIVEL_META: Record<Nivel, { label: string; cls: string }> = {
  basico: { label: "Básico", cls: "bg-mint-100 text-mint-700 border-mint-300" },
  intermedio: { label: "Intermedio", cls: "bg-sun-100 text-sun-700 border-sun-300" },
  avanzado: { label: "Avanzado", cls: "bg-rose-100 text-rose-700 border-rose-300" },
};

function cell(v: SqlValue): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" && !Number.isInteger(v)) return v.toFixed(2);
  return String(v);
}

/** localStorage key for a solved challenge — also read by the /desafios hub. */
export const solvedKey = (id: string) => `db-challenge:${id}`;

export function ChallengeCard({
  schema,
  challenge,
  source,
  onSolved,
}: {
  schema: string;
  challenge: Challenge;
  /** When shown in the hub, links back to the lesson the challenge came from. */
  source?: { title: string; href: string };
  /** Fired the first time this challenge is solved (for hub progress). */
  onSolved?: () => void;
}) {
  const [sql, setSql] = useState("");
  const [res, setRes] = useState<CheckResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const meta = NIVEL_META[challenge.nivel];

  // Reading persisted progress on mount (not during render) avoids a hydration
  // mismatch, since localStorage is client-only.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(solvedKey(challenge.id)) === "1") setSolved(true);
  }, [challenge.id]);

  // Keep the highlighted <pre> scrolled in lockstep with the textarea.
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

  const check = () => {
    const r = checkChallenge(schema, challenge, sql);
    setRes(r);
    if (r.ok) {
      if (!solved) onSolved?.();
      setSolved(true);
      localStorage.setItem(solvedKey(challenge.id), "1");
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      check();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      // Prefer execCommand so the browser's native undo/redo stack survives.
      if (!document.execCommand("insertText", false, "  ")) {
        const s = ta.selectionStart;
        const en = ta.selectionEnd;
        const v = ta.value;
        setSql(v.slice(0, s) + "  " + v.slice(en));
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = s + 2;
        });
      }
    }
  };

  const u = res?.userResult;

  return (
    <div className="border-line bg-paper shadow-paper2 overflow-hidden rounded-2xl border">
      <div className="border-line-soft flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          {source && (
            <Link
              href={source.href}
              className="text-ink-mute hover:text-ink mb-1 inline-block font-mono text-[10.5px] tracking-wider uppercase transition"
            >
              {source.title} ↗
            </Link>
          )}
          <p className="text-ink m-0 text-[14.5px] leading-snug font-medium">{challenge.enunciado}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {solved && (
            <span className="text-mint-700 inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase">
              <Check size={13} aria-hidden="true" /> resuelto
            </span>
          )}
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${meta.cls}`}
          >
            {meta.label}
          </span>
        </div>
      </div>

      <div className="editor-wrap bg-cream relative min-h-[88px]">
        <HighlightedCode ref={preRef} source={sql + (sql.endsWith("\n") ? " " : "")} />
        <textarea
          ref={taRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Escribí tu consulta…"
          aria-label={`Editor SQL para el desafío: ${challenge.enunciado}`}
        />
      </div>

      <div className="bg-paper border-line-soft flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
        <button
          onClick={check}
          title="Cmd/Ctrl + Enter"
          className="bg-ink text-cream inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition hover:bg-[#2a221a] active:translate-y-px"
        >
          <Check size={15} aria-hidden="true" />
          Comprobar
        </button>
        {challenge.pista && (
          <button
            onClick={() => setShowHint((s) => !s)}
            aria-expanded={showHint}
            className="text-ink-mute hover:text-ink hover:bg-cream-deep inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] transition"
          >
            <Lightbulb size={15} aria-hidden="true" />
            {showHint ? "Ocultar pista" : "Pista"}
          </button>
        )}
        {res && (
          <span
            role="status"
            aria-live="polite"
            className={`ml-auto inline-flex items-center gap-1.5 font-mono text-[12px] ${
              res.ok ? "text-mint-700" : "text-rose-700"
            }`}
          >
            {res.ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
            {res.message}
          </span>
        )}
      </div>

      {showHint && challenge.pista && (
        <div className="bg-sun-50 border-sun-300 text-ink-soft border-t px-4 py-2.5 text-[13px]">
          💡 {challenge.pista}
        </div>
      )}

      {u && u.rows.length > 0 && (
        <div className="border-line-soft overflow-x-auto border-t px-4 py-3">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {u.cols.map((c) => (
                  <th
                    key={c}
                    className="text-ink-mute border-line-soft border-b px-2 py-1 text-left font-mono text-[11px] tracking-wider uppercase"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {u.rows.map((r, i) => (
                <tr key={i}>
                  {u.cols.map((c) => (
                    <td key={c} className="border-line-soft text-ink-soft border-b px-2 py-1 font-mono">
                      {cell(r[c] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ChallengeBoard({ schema, challenges }: { schema: string; challenges: readonly Challenge[] }) {
  return (
    <section aria-label="Desafíos de la lección" className="my-8 flex flex-col gap-4">
      {challenges.map((c) => (
        <ChallengeCard key={c.id} schema={schema} challenge={c} />
      ))}
    </section>
  );
}
