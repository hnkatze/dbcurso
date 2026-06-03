"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { prevNext } from "@/lib/curriculum";

export function LessonFooter() {
  const pathname = usePathname();
  const { prev, next } = prevNext(pathname);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Navegación entre lecciones"
      className="border-line text-ink-mute mt-20 flex items-center justify-between gap-4 border-t pt-8 text-[12px]"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group flex max-w-[260px] flex-col items-start text-left"
        >
          <span className="text-[10px] tracking-widest uppercase">← Anterior</span>
          <span className="font-display text-ink group-hover:text-sun-700 mt-1 text-[18px] italic transition">
            {prev.label}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex max-w-[260px] flex-col items-end text-right"
        >
          <span className="text-[10px] tracking-widest uppercase">Siguiente →</span>
          <span className="font-display text-ink group-hover:text-sun-700 mt-1 text-[18px] italic transition">
            {next.label}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
