/**
 * Central registry of every lesson's challenges. Pages import their own lesson
 * to render the embedded board; the /desafios hub imports ALL_LESSONS to group
 * every challenge by level.
 */

export * from "./core";

import type { LessonChallenges, Nivel } from "./core";
import { SELECT_LESSON } from "./select";
import { CREATE_LESSON } from "./create";
import { WRITE_LESSON } from "./write";
import { KEYS_LESSON } from "./keys";
import { JOINS_LESSON } from "./joins";
import { GROUP_LESSON } from "./group";
import { VENTAS_LESSON } from "./ventas";
import { AUDITORIA_LESSON } from "./auditoria";

/** Ordered to mirror the SQL track in the curriculum. */
export const ALL_LESSONS: readonly LessonChallenges[] = [
  CREATE_LESSON,
  WRITE_LESSON,
  SELECT_LESSON,
  KEYS_LESSON,
  JOINS_LESSON,
  GROUP_LESSON,
  VENTAS_LESSON,
  AUDITORIA_LESSON,
];

export const NIVEL_ORDER: readonly Nivel[] = ["basico", "intermedio", "avanzado"];

export const NIVEL_LABEL: Record<Nivel, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export function lessonById(id: string): LessonChallenges | undefined {
  return ALL_LESSONS.find((l) => l.lessonId === id);
}

export interface ChallengeWithSource {
  readonly lesson: LessonChallenges;
  readonly challenge: LessonChallenges["challenges"][number];
}

/** Every challenge of a given level, paired with its lesson (for the hub). */
export function challengesByNivel(nivel: Nivel): readonly ChallengeWithSource[] {
  return ALL_LESSONS.flatMap((lesson) =>
    lesson.challenges.filter((c) => c.nivel === nivel).map((challenge) => ({ lesson, challenge })),
  );
}
