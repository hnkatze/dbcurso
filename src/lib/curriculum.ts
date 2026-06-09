/**
 * Course map — the single source of truth for the sidebar and prev/next
 * navigation. Each lesson maps to a real App Router route.
 */

export interface Lesson {
  readonly id: string;
  readonly num: string;
  readonly label: string;
  readonly href: string;
}

export interface CourseSection {
  readonly section: string;
  readonly items: readonly Lesson[];
}

export const MODULES: readonly CourseSection[] = [
  {
    section: "Empezar aquí",
    items: [{ id: "intro", num: "00", label: "Introducción", href: "/" }],
  },
  {
    section: "SQL · Relacional",
    items: [
      { id: "create", num: "01", label: "CREATE / ALTER", href: "/sql/create" },
      { id: "write", num: "02", label: "INSERT / UPDATE / DELETE", href: "/sql/write" },
      { id: "select", num: "03", label: "SELECT, WHERE, ORDER", href: "/sql/select" },
      { id: "keys", num: "04", label: "Llaves PK / FK", href: "/sql/keys" },
      { id: "joins", num: "05", label: "JOINs", href: "/sql/joins" },
      { id: "group", num: "06", label: "GROUP BY · Subconsultas", href: "/sql/group" },
      { id: "ventas", num: "07", label: "Caso real · Ventas", href: "/sql/ventas" },
    ],
  },
  {
    section: "NoSQL",
    items: [
      { id: "redis", num: "08", label: "Redis", href: "/nosql/redis" },
      { id: "mongo", num: "09", label: "MongoDB", href: "/nosql/mongo" },
      { id: "firebase", num: "10", label: "Firebase", href: "/nosql/firebase" },
      { id: "cassandra", num: "11", label: "Cassandra", href: "/nosql/cassandra" },
    ],
  },
  {
    section: "Práctica",
    items: [{ id: "desafios", num: "12", label: "Desafíos", href: "/desafios" }],
  },
] as const;

/** Flat, ordered list of every lesson — used for prev/next. */
export const FLAT: readonly Lesson[] = MODULES.flatMap((s) => s.items);

export function findByHref(href: string): Lesson | undefined {
  return FLAT.find((l) => l.href === href);
}

export function sectionTitleForHref(href: string): string {
  return MODULES.find((s) => s.items.some((i) => i.href === href))?.section ?? "";
}

export interface PrevNext {
  readonly prev: Lesson | null;
  readonly next: Lesson | null;
}

export function prevNext(href: string): PrevNext {
  const idx = FLAT.findIndex((l) => l.href === href);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? FLAT[idx - 1]! : null,
    next: idx < FLAT.length - 1 ? FLAT[idx + 1]! : null,
  };
}
