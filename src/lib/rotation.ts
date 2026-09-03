import { db, type DayCode } from "~/db/schema";
import { ROTATION } from "~/data/program-v1";

/** Следующий день по ротации A→B→C. Считается от последней ЗАВЕРШЁННОЙ
 *  сессии — пропущенная неделя очередь не сбивает. */
export async function nextDay(): Promise<DayCode> {
  const last = await db.sessions
    .orderBy("startedAt")
    .filter((s) => s.finishedAt !== null)
    .last();

  if (!last) return ROTATION[0]!;
  const idx = ROTATION.indexOf(last.day);
  return ROTATION[(idx + 1) % ROTATION.length]!;
}

/** Незавершённая сессия, если есть — на неё ведёт кнопка «Продолжить». */
export async function openSession() {
  return db.sessions.filter((s) => s.finishedAt === null).last();
}
