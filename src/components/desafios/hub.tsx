"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import {
  ALL_LESSONS,
  challengesByNivel,
  NIVEL_LABEL,
  NIVEL_ORDER,
  type Nivel,
} from "@/lib/challenges";
import { ChallengeCard, solvedKey } from "@/components/lab/challenge";

const TAB_TINT: Record<Nivel, string> = {
  basico: "border-mint-500 text-mint-700",
  intermedio: "border-sun-500 text-sun-700",
  avanzado: "border-rose-500 text-rose-700",
};

const TOTAL = ALL_LESSONS.reduce((n, l) => n + l.challenges.length, 0);
const ALL_IDS = ALL_LESSONS.flatMap((l) => l.challenges.map((c) => c.id));

export function ChallengesHub() {
  const [nivel, setNivel] = useState<Nivel>("basico");
  const [solvedCount, setSolvedCount] = useState(0);

  // Count persisted solves on mount (client-only localStorage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSolvedCount(ALL_IDS.filter((id) => localStorage.getItem(solvedKey(id)) === "1").length);
  }, []);

  const items = challengesByNivel(nivel);
  const pct = TOTAL === 0 ? 0 : Math.round((solvedCount / TOTAL) * 100);

  return (
    <div>
      <div className="border-line bg-paper shadow-paper2 mb-8 flex items-center gap-4 rounded-2xl border px-5 py-4">
        <div className="bg-ink text-sun-500 grid h-11 w-11 shrink-0 place-items-center rounded-xl">
          <Trophy size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-ink mb-1.5 flex items-baseline justify-between text-[13px] font-medium">
            <span>Tu progreso</span>
            <span className="text-ink-soft font-mono">
              {solvedCount} / {TOTAL} resueltos
            </span>
          </div>
          <div className="bg-cream-deep h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-mint-500 h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Nivel de dificultad" className="border-line mb-6 flex gap-1 border-b">
        {NIVEL_ORDER.map((n) => {
          const active = n === nivel;
          const count = challengesByNivel(n).length;
          return (
            <button
              key={n}
              role="tab"
              aria-selected={active}
              onClick={() => setNivel(n)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-medium transition ${
                active ? TAB_TINT[n] : "text-ink-mute hover:text-ink border-transparent"
              }`}
            >
              {NIVEL_LABEL[n]}
              <span className="text-ink-mute ml-1.5 font-mono text-[11px]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {items.map(({ lesson, challenge }) => (
          <ChallengeCard
            key={challenge.id}
            schema={lesson.schema}
            challenge={challenge}
            source={{ title: lesson.title, href: lesson.href }}
            onSolved={() => setSolvedCount((c) => Math.min(c + 1, TOTAL))}
          />
        ))}
      </div>
    </div>
  );
}
