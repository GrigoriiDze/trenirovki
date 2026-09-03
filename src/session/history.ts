/* «Прошлый раз» — подходы этого упражнения из последней ЗАВЕРШЁННОЙ
   сессии (кроме текущей). Упражнение может встречаться в разных днях
   (напр. средняя дельта в A и C) — берём просто последнюю по времени. */

import { db, type SetLog } from "~/db/schema";

export async function lastSetsFor(
  exerciseId: string,
  exceptSessionId?: string,
): Promise<SetLog[]> {
  const [logs, sessions] = await Promise.all([
    db.setLogs.where("exerciseId").equals(exerciseId).filter((l) => !l.deleted).toArray(),
    db.sessions.filter((s) => !s.deleted && s.finishedAt !== null).toArray(),
  ]);

  const startedAt = new Map(sessions.map((s) => [s.id, s.startedAt]));
  const bySession = new Map<string, SetLog[]>();
  for (const l of logs) {
    if (l.sessionId === exceptSessionId || !startedAt.has(l.sessionId)) continue;
    const arr = bySession.get(l.sessionId) ?? [];
    arr.push(l);
    bySession.set(l.sessionId, arr);
  }
  if (bySession.size === 0) return [];

  const latest = [...bySession.entries()].sort(
    (a, b) => (startedAt.get(b[0]) ?? 0) - (startedAt.get(a[0]) ?? 0),
  )[0]!;
  return latest[1].sort((a, b) => a.setNumber - b.setNumber);
}
