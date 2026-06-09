/**
 * Verifies every challenge's `solution` actually runs on the toy SQL engine and
 * that the validation pipeline accepts it. Run with:  npx -y tsx scripts/check-challenges.mts
 *
 * A challenge is OK when checkChallenge(schema, challenge, solution) === ok,
 * which means: the solution parses, runs, produces a result (or verify state),
 * and the multiset/order comparison passes against itself. Empty results are
 * flagged as warnings (usually a sign the challenge data is off).
 */

import { ALL_LESSONS } from "../src/lib/challenges/index.ts";
import { checkChallenge } from "../src/lib/challenges/core.ts";
import { Database, run, type SelectResult } from "../src/lib/engines/sql.ts";

function expectedRows(schema: string, solution: string, verify?: string): number | string {
  const db = new Database();
  for (const sql of [schema, solution, verify]) {
    if (!sql || !sql.trim()) continue;
    const res = run(db, sql);
    if (!res.ok) return `ERROR: ${res.error}`;
  }
  // Re-run verify (or solution) on a fresh db to read the final SELECT.
  const db2 = new Database();
  let last: SelectResult | null = null;
  for (const sql of [schema, solution, verify]) {
    if (!sql || !sql.trim()) continue;
    const res = run(db2, sql);
    if (!res.ok) return `ERROR: ${res.error}`;
    for (const r of res.results) if (r.type === "select") last = r;
  }
  return last ? last.rows.length : "no-select";
}

let failures = 0;
let warnings = 0;

for (const lesson of ALL_LESSONS) {
  console.log(`\n■ ${lesson.lessonId.toUpperCase()} — ${lesson.title}  (${lesson.href})`);
  for (const c of lesson.challenges) {
    const res = checkChallenge(lesson.schema, c, c.solution);
    const rows = expectedRows(lesson.schema, c.solution, c.verify);
    const tag = res.ok ? "  OK " : "FAIL";
    let note = "";
    if (!res.ok) {
      failures++;
      note = `  → ${res.message}`;
    } else if (typeof rows === "string" && rows.startsWith("ERROR")) {
      failures++;
      note = `  → ${rows}`;
    } else if (rows === 0 || rows === "no-select") {
      warnings++;
      note = `  ⚠ resultado vacío (${rows})`;
    }
    console.log(`  [${tag}] ${c.nivel.padEnd(11)} ${c.id.padEnd(22)} rows=${String(rows).padEnd(6)}${note}`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`Total fallas: ${failures}   advertencias: ${warnings}`);
if (failures > 0) {
  console.log("❌ Hay desafíos rotos — revisar arriba.");
  process.exit(1);
}
console.log("✅ Todos los desafíos corren y validan.");
