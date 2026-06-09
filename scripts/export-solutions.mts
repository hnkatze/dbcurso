/**
 * Generates SOLUCIONES-DESAFIOS.md from the real challenge registry, including
 * each solution and its expected result table. Run with:
 *   npx -y tsx scripts/export-solutions.mts
 */

import { writeFileSync } from "node:fs";
import { ALL_LESSONS } from "../src/lib/challenges/index.ts";
import { Database, run, type SelectResult, type SqlValue } from "../src/lib/engines/sql.ts";

const NIVEL_LABEL: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

function result(schema: string, solution: string, verify?: string): SelectResult | null {
  const db = new Database();
  let last: SelectResult | null = null;
  for (const sql of [schema, solution, verify]) {
    if (!sql || !sql.trim()) continue;
    const res = run(db, sql);
    if (!res.ok) throw new Error(res.error);
    for (const r of res.results) if (r.type === "select") last = r;
  }
  return last;
}

function fmt(v: SqlValue): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" && !Number.isInteger(v)) return v.toFixed(2);
  return String(v).replace(/\|/g, "\\|");
}

function table(r: SelectResult): string {
  if (r.rows.length === 0) return "_(sin filas)_\n";
  const head = `| ${r.cols.join(" | ")} |`;
  const sep = `| ${r.cols.map(() => "---").join(" | ")} |`;
  const body = r.rows.map((row) => `| ${r.cols.map((c) => fmt(row[c] ?? null)).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}\n`;
}

const lines: string[] = [];
lines.push("# Soluciones de los desafíos · Curso DBs\n");
lines.push(
  "> Machete para la exposición. La validación de cada desafío compara el **resultado**, " +
    "no el texto: cualquier consulta que produzca estas mismas filas se acepta como correcta.\n",
);
lines.push("\n**Índice**\n");
for (const l of ALL_LESSONS) lines.push(`- [${l.title}](#${l.lessonId})`);
lines.push("\n---\n");

for (const lesson of ALL_LESSONS) {
  lines.push(`\n## ${lesson.title}\n`);
  lines.push(`<a id="${lesson.lessonId}"></a>\n`);
  lines.push(`Ruta: \`${lesson.href}\`\n`);
  lines.push("\n<details>\n<summary>Esquema base (datos sobre los que se resuelve)</summary>\n");
  lines.push("\n```sql\n" + lesson.schema.trim() + "\n```\n</details>\n");

  for (const c of lesson.challenges) {
    lines.push(`\n### ${NIVEL_LABEL[c.nivel] ?? c.nivel} — \`${c.id}\`\n`);
    lines.push(`**Enunciado.** ${c.enunciado}\n`);
    lines.push("\n**Solución**\n");
    lines.push("```sql\n" + c.solution.trim() + "\n```\n");
    if (c.verify) {
      lines.push("\n**Verificación** (SELECT que inspecciona el estado tras la operación)\n");
      lines.push("```sql\n" + c.verify.trim() + "\n```\n");
    }
    if (c.pista) lines.push(`\n💡 _Pista:_ ${c.pista}\n`);
    const res = result(lesson.schema, c.solution, c.verify);
    if (res) {
      lines.push(`\n**Resultado esperado** (${res.rows.length} fila${res.rows.length === 1 ? "" : "s"})\n`);
      lines.push("\n" + table(res));
    }
  }
  lines.push("\n---\n");
}

writeFileSync("SOLUCIONES-DESAFIOS.md", lines.join("\n"));
const total = ALL_LESSONS.reduce((n, l) => n + l.challenges.length, 0);
console.log(`✅ SOLUCIONES-DESAFIOS.md generado — ${ALL_LESSONS.length} lecciones, ${total} desafíos.`);
