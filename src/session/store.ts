/* Жизненный цикл тренировки. Сессия и подходы — в Dexie через write.ts,
   значит уезжают в синк. UI-курсор (какое упражнение открыто) НЕ храним:
   на перезагрузке возвращаемся к первому недоделанному. */

import { db, type DayCode, type Session, type SetLog } from "~/db/schema";
import { putRow, patchRow } from "~/db/write";

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
  };
  await putRow("sessions", s);
  return (await db.sessions.get(s.id))!;
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
