import type { ReactNode } from "react";

/**
 * Lesson content primitives — pure presentational components (no hooks),
 * safe to render in Server Components. Ported from DBs/lessons.jsx.
 */

type Tint = "y" | "b" | "p" | "g" | "v";

const TINT_MAP: Record<Tint, { bg: string; border: string; mark: string }> = {
  y: { bg: "bg-sun-50", border: "border-sun-300", mark: "text-sun-700" },
  b: { bg: "bg-sea-50", border: "border-sea-300", mark: "text-sea-700" },
  p: { bg: "bg-rose-50", border: "border-rose-300", mark: "text-rose-700" },
  g: { bg: "bg-mint-50", border: "border-mint-300", mark: "text-mint-700" },
  v: { bg: "bg-lav-50", border: "border-lav-300", mark: "text-lav-700" },
};

export function Concept({
  tint = "y",
  mark,
  title,
  children,
}: {
  tint?: Tint;
  mark: ReactNode;
  title: ReactNode;
  children: ReactNode;
}) {
  const t = TINT_MAP[tint];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 pb-6 ${t.bg} ${t.border}`}>
      <div className={`font-display mb-2.5 text-[38px] leading-none font-medium italic ${t.mark}`}>
        {mark}
      </div>
      <div className="text-ink mb-1 text-[15px] font-semibold">{title}</div>
      <div className="text-ink-soft text-[13.5px] leading-snug">{children}</div>
    </div>
  );
}

export function ConceptRow({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 mb-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
      {children}
    </div>
  );
}

type CalloutVariant = "default" | "note" | "warn" | "ok";

const CALLOUT_VARIANTS: Record<CalloutVariant, string> = {
  default: "border-l-sun-500",
  note: "border-l-sea-500",
  warn: "border-l-rose-500",
  ok: "border-l-mint-500",
};

export function Callout({
  variant = "default",
  label,
  children,
}: {
  variant?: CalloutVariant;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`bg-paper-soft border-line my-5 rounded-2xl border border-l-4 px-5 py-4 ${CALLOUT_VARIANTS[variant]}`}>
      <div className="text-ink-mute mb-1 text-[10px] font-semibold tracking-widest uppercase">
        {label}
      </div>
      <p className="[&_strong]:text-ink text-ink-soft m-0 text-[14.5px]">{children}</p>
    </div>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display [&_em]:text-sun-700 mb-3.5 text-[56px] leading-[1.02] font-medium tracking-tight text-balance [&_em]:italic">
      {children}
    </h1>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <p className="text-ink-soft [&_strong]:text-ink mb-9 max-w-[70ch] text-[19px] leading-snug text-pretty">
      {children}
    </p>
  );
}

export function H2({ num, children }: { num: string; children: ReactNode }) {
  return (
    <h2 className="font-display mt-14 mb-4 text-[30px] leading-[1.1] font-medium tracking-tight text-balance">
      <span className="text-ink-mute mr-3 align-[6px] font-mono text-[13px] font-normal tracking-normal">
        {num}
      </span>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="font-display mt-7 mb-2 text-[21px] font-semibold tracking-tight">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-ink-soft [&_strong]:text-ink [&_code]:bg-cream-deep [&_code]:text-ink mb-3.5 max-w-[70ch] [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.88em] [&_strong]:font-semibold">
      {children}
    </p>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="text-ink-soft [&_li::marker]:text-sun-500 [&_strong]:text-ink [&_code]:bg-cream-deep [&_code]:text-ink mb-5 max-w-[70ch] pl-5 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.88em] [&_li]:mb-1.5 [&_strong]:font-semibold">
      {children}
    </ul>
  );
}
