import type { ReactNode } from "react";

/**
 * Shared wrapper for Firebase demo panels.
 * Pure presentational — no hooks — safe in Server Components,
 * but consumed by client demos so it doesn't need "use client".
 */
export function DemoFrame({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="shadow-paper2 my-8 overflow-hidden rounded-3xl border border-line bg-paper">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-line bg-cream-deep px-5 py-3">
        <span
          className="font-display text-[22px] leading-none italic text-ink-soft"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold text-ink">{title}</div>
          <div className="font-mono text-[10.5px] tracking-wider text-ink-mute uppercase">
            {subtitle}
          </div>
        </div>
        {/* Traffic-light dots — decorative */}
        <span className="ml-auto flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-sun-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-mint-500" />
        </span>
      </div>
      {children}
    </div>
  );
}
