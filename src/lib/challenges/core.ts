/**
 * Challenge system — validates a learner's SQL by comparing RESULTS, not text.
 *
 * The expected result is generated on the fly by running `challenge.solution`
 * against the same schema, so challenges keep validating even if the sample
 * data changes. Row order is ignored (multiset compare) unless the challenge
 * sets `ordered: true`.
 *
 * For mutation/DDL challenges (INSERT/UPDATE/DELETE/CREATE) the query itself
 * returns no rows, so set `verify` to a SELECT that inspects the resulting
 * state. The learner's query and the solution are each applied to a fresh DB,
 * then `verify` runs on both and the two SELECT results are compared.
 */

import { Database, run, type Row, type SelectResult } from "../engines/sql";

export type Nivel = "basico" | "intermedio" | "avanzado";

export interface Challenge {
  readonly id: string;
  readonly nivel: Nivel;
  readonly enunciado: string;
  /** The correct query — the expected result is derived from running this. */
  readonly solution: string;
  /**
   * A SELECT run AFTER `solution`/the learner's query to inspect the resulting
   * state. Required for challenges whose main query mutates data or DDL.
   */
  readonly verify?: string;
  /** Set true when the prompt requires a specific row order (ORDER BY). */
  readonly ordered?: boolean;
  readonly pista?: string;
}

/** A lesson's challenges plus the schema they all run against. */
export interface LessonChallenges {
  /** Matches the curriculum lesson id (e.g. "select", "joins"). */
  readonly lessonId: string;
  readonly title: string;
  readonly href: string;
  readonly schema: string;
  readonly challenges: readonly Challenge[];
}

export interface CheckResult {
  readonly ok: boolean;
  readonly message: string;
  /** The learner's own SELECT result, for echoing back in the UI. */
  readonly userResult?: SelectResult | null;
}

/** Run a schema then a series of statements; return the last SELECT result. */
function runPipeline(...sqls: string[]): { result: SelectResult | null; error: string | null } {
  const db = new Database();
  let last: SelectResult | null = null;
  for (const sql of sqls) {
    if (!sql.trim()) continue;
    const res = run(db, sql);
    if (!res.ok) return { result: null, error: res.error };
    for (const r of res.results) if (r.type === "select") last = r;
  }
  return { result: last, error: null };
}

/** Serialize one row to its positional values, so column NAMES don't matter. */
function rowKey(cols: string[], row: Row): string {
  return JSON.stringify(cols.map((c) => row[c] ?? null));
}

/** Compare two result sets as multisets of rows (order-insensitive). */
function sameMultiset(eCols: string[], eRows: Row[], uCols: string[], uRows: Row[]): boolean {
  const counts = new Map<string, number>();
  for (const r of eRows) {
    const k = rowKey(eCols, r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const r of uRows) {
    const k = rowKey(uCols, r);
    const c = counts.get(k);
    if (!c) return false;
    counts.set(k, c - 1);
  }
  for (const c of counts.values()) if (c !== 0) return false;
  return true;
}

export function checkChallenge(schema: string, challenge: Challenge, userSql: string): CheckResult {
  if (!userSql.trim()) return { ok: false, message: "Escribí una consulta antes de comprobar." };

  const verify = challenge.verify;
  // For mutation/DDL challenges, the result that matters is `verify` run after
  // the query. For SELECT challenges, the query's own result is what we compare.
  const expected = verify
    ? runPipeline(schema, challenge.solution, verify)
    : runPipeline(schema, challenge.solution);
  if (!expected.result) {
    return { ok: false, message: "Este desafío tiene un error de configuración. Avisá al instructor." };
  }

  const user = verify ? runPipeline(schema, userSql, verify) : runPipeline(schema, userSql);
  if (user.error) return { ok: false, message: "Tu consulta tiene un error: " + user.error };
  if (!user.result) {
    return {
      ok: false,
      message: verify
        ? "Tu consulta no dejó datos para verificar. Revisá que modifique la tabla correcta."
        : "Tu consulta no devolvió un resultado SELECT.",
    };
  }

  const e = expected.result;
  const u = user.result;

  if (u.cols.length !== e.cols.length) {
    return {
      ok: false,
      message: `Se esperaban ${e.cols.length} columna(s) y trajiste ${u.cols.length}. Revisá qué columnas pide el enunciado.`,
      userResult: u,
    };
  }
  if (u.rows.length !== e.rows.length) {
    return {
      ok: false,
      message: `Se esperaban ${e.rows.length} fila(s) y trajiste ${u.rows.length}. Revisá tu filtro.`,
      userResult: u,
    };
  }
  if (!sameMultiset(e.cols, e.rows, u.cols, u.rows)) {
    return {
      ok: false,
      message: "El número de filas coincide, pero los datos no. Revisá tu filtro o las columnas que seleccionás.",
      userResult: u,
    };
  }
  if (challenge.ordered) {
    const sameOrder = e.rows.every((er, i) => rowKey(e.cols, er) === rowKey(u.cols, u.rows[i]!));
    if (!sameOrder) {
      return {
        ok: false,
        message: "Las filas son las correctas, pero el orden no. ¿Te falta un ORDER BY?",
        userResult: u,
      };
    }
  }

  return { ok: true, message: "¡Cabal! Recuperaste exactamente los datos correctos.", userResult: u };
}
