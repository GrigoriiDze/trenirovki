/* Жизненный цикл тренировки. Сессия и подходы — в Dexie через write.ts,
   значит уезжают в синк. UI-курсор (какое упражнение открыто) НЕ храним:
   на перезагрузке возвращаемся к первому недоделанному. */

import {
  db,
  type DayCode,
  type Session,
  type SessionExercise,
  type SetLog,
} from "~/db/schema";
import { putRow, putRows, patchRow } from "~/db/write";

export async function startSession(day: DayCode, versionId: string): Promise<Session> {
  // выкинуть брошенную пустую сессию, если была
  const stale = await openSession();
  if (stale) await exitSession(stale.id);

  const s: Omit<Session, "updatedAt" | "deleted"> = {
    id: crypto.randomUUID(),
    versionId,
    day,
    startedAt: Date.now(),
    finishedAt: null,
    source: "app",
    note: null,
  };
  await putRow("sessions", s);

  // копия слотов дня → список упражнений сессии (дальше правится руками)
  const slots = await db.programSlots
    .where({ versionId, day })
    .filter((sl) => !sl.deleted)
    .sortBy("ord");
  await putRows(
    "sessionExercises",
    slots.map((sl, i) => ({
      id: `${s.id}:${sl.exerciseId}`,
      sessionId: s.id,
      exerciseId: sl.exerciseId,
      ord: i + 1,
      source: "plan" as const,
      skipped: false,
      targetSets: sl.targetSets,
      repLow: sl.repLow,
      repHigh: sl.repHigh,
      perSide: sl.perSide,
    })),
  );

  return (await db.sessions.get(s.id))!;
}

/** Живой список упражнений сессии по порядку, без убранных. */
export function sessionExercises(sessionId: string): Promise<SessionExercise[]> {
  return db.sessionExercises
    .where("sessionId")
    .equals(sessionId)
    .filter((e) => !e.deleted && !e.skipped)
    .sortBy("ord");
}

/** A.4 — добавить упражнение в сессию на лету, встаёт в конец.
 *  Если было убрано раньше — возвращаем обратно. */
export async function addExercise(sessionId: string, exerciseId: string): Promise<void> {
  const id = `${sessionId}:${exerciseId}`;
  const existing = await db.sessionExercises.get(id);
  if (existing) {
    if (existing.skipped || existing.deleted) {
      await patchRow("sessionExercises", id, { skipped: false, deleted: false });
    }
    return;
  }
  const all = await db.sessionExercises.where("sessionId").equals(sessionId).toArray();
  const maxOrd = all.reduce((m, e) => Math.max(m, e.ord), 0);
  await putRow("sessionExercises", {
    id,
    sessionId,
    exerciseId,
    ord: maxOrd + 1,
    source: "added" as const,
    skipped: false,
    targetSets: null,
    repLow: null,
    repHigh: null,
    perSide: false,
  });
}

/** A.5 — убрать упражнение из сессии (не из программы).
 *  С записанными подходами не убираем — сначала удали подходы. */
export async function removeExercise(sessionId: string, exerciseId: string): Promise<boolean> {
  const n = await db.setLogs
    .where("sessionId")
    .equals(sessionId)
    .filter((l) => !l.deleted && l.exerciseId === exerciseId)
    .count();
  if (n > 0) return false;
  await patchRow("sessionExercises", `${sessionId}:${exerciseId}`, { skipped: true });
  return true;
}

/** A.6 — переставить упражнение в порядке сессии на одну позицию. */
export async function moveExercise(
  sessionId: string,
  exerciseId: string,
  dir: -1 | 1,
): Promise<void> {
  const list = await sessionExercises(sessionId);
  const i = list.findIndex((e) => e.exerciseId === exerciseId);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= list.length) return;
  await Promise.all([
    patchRow("sessionExercises", list[i]!.id, { ord: list[j]!.ord }),
    patchRow("sessionExercises", list[j]!.id, { ord: list[i]!.ord }),
  ]);
}

export async function openSession(): Promise<Session | undefined> {
  return db.sessions.filter((s) => !s.deleted && s.finishedAt === null).last();
}

export async function finishSession(id: string): Promise<void> {
  await patchRow("sessions", id, { finishedAt: Date.now() });
}

/** Выход из сессии без единого подхода = отмена (мягкое удаление).
 *  Если что-то записано — оставляем открытой («Продолжить»). */
export async function exitSession(id: string): Promise<void> {
  const n = await db.setLogs.where("sessionId").equals(id).filter((l) => !l.deleted).count();
  if (n === 0) await patchRow("sessions", id, { deleted: true });
}

/** Записать подход. setNumber считается сам по уже записанным в этой сессии. */
export async function logSet(
  sessionId: string,
  exerciseId: string,
  data: Pick<SetLog, "weight" | "reps" | "rir" | "backFeel">,
): Promise<void> {
  const done = await db.setLogs
    .where("sessionId")
    .equals(sessionId)
    .filter((l) => !l.deleted && l.exerciseId === exerciseId)
    .count();
  await putRow("setLogs", {
    id: crypto.randomUUID(),
    sessionId,
    exerciseId,
    setNumber: done + 1,
    loggedAt: Date.now(),
    ...data,
  });
}

export async function editSet(
  id: string,
  patch: Partial<Pick<SetLog, "weight" | "reps" | "backFeel" | "rir">>,
): Promise<void> {
  await patchRow("setLogs", id, patch);
}

export async function removeSet(id: string): Promise<void> {
  // мягкое удаление + пересчёт номеров оставшихся — чтобы не было дыр
  const row = await db.setLogs.get(id);
  if (!row) return;
  await patchRow("setLogs", id, { deleted: true });
  const rest = await db.setLogs
    .where("sessionId")
    .equals(row.sessionId)
    .filter((l) => !l.deleted && l.exerciseId === row.exerciseId)
    .sortBy("setNumber");
  await Promise.all(rest.map((l, i) => (l.setNumber === i + 1 ? null : patchRow("setLogs", l.id, { setNumber: i + 1 }))));
}
