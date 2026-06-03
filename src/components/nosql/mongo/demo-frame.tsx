"use client";

import type { ReactNode } from "react";

interface CmdEntry {
  cmd: string;
  result?: string;
}

export function CmdLog({ entries }: { entries: CmdEntry[] }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-white/40 italic text-[11.5px]">
        Aún no hay comandos. Interactúa a la izquierda →
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {entries.map((e, i) => (
        <div key={i} className={i === entries.length - 1 ? "anim-fade-up" : ""}>
          <div className="font-mono text-[11.5px] text-mint-100 break-all leading-relaxed">
            <span className="text-white/40">{">"} </span>
            {e.cmd}
          </div>
          {e.result !== undefined && (
            <div className="font-mono text-[11px] text-cream/70 pl-4">→ {e.result}</div>
          )}
        </div>
      ))}
    </div>
  );
}

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
    <div className="my-8 rounded-3xl bg-paper border border-line shadow-paper2 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-cream-deep border-b border-line">
        <span
          className="font-display italic text-[22px] text-ink-soft leading-none"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="leading-tight">
          <div className="font-display font-semibold text-[15px] text-ink">{title}</div>
          <div className="font-mono text-[10.5px] tracking-wider uppercase text-ink-mute">
            {subtitle}
          </div>
        </div>
        <span className="ml-auto flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-sun-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-mint-500" />
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[480px]">{children}</div>
    </div>
  );
}

export function LeftPane({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 bg-paper border-b lg:border-b-0 lg:border-r border-line overflow-auto">
      {children}
    </div>
  );
}

export function RightPane({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 bg-ink text-cream font-mono text-[12.5px] flex flex-col gap-3 overflow-auto">
      {children}
    </div>
  );
}

export type { CmdEntry };
