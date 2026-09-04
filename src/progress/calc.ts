/* Расчёты прогресса. Всё поверх уже накопленных setLog + session —
   ничего не хранится, считается на показ (данных мало, это дёшево).

   Оценка 1ПМ — формула Эпли: 1ПМ ≈ вес · (1 + повторы/30).
   Грубая, но монотонная — годится, чтобы сравнивать подходы во времени. */

import { db, type MuscleGroup, type SetLog } from "~/db/schema";

export function epley(weight: number, reps: number): number {
  return weight > 0 ? weight * (1 + reps / 30) : 0;
}

export interface TopSet {
  sessionId: string;
  date: number; // session.startedAt
  weight: number;
  reps: number;
  e1rm: number;
  source: "app" | "import";
}

async function finishedSessions() {
  const s = await db.sessions.filter((x) => !x.deleted && x.finishedAt !== null).toArray();
  return new Map(s.map((x) => [x.id, x]));
}

/** Лучший подход (по оценке 1ПМ) в каждой завершённой сессии с этим
 *  упражнением, отсортировано по времени. Пустой — упражнения ещё не делал. */
export async function topSetSeries(exerciseId: string): Promise<TopSet[]> {
  const [logs, sess] = await Promise.all([
    db.setLogs.where("exerciseId").equals(exerciseId).filter((l) => !l.deleted).toArray(),
    finishedSessions(),
  ]);

  const bySession = new Map<string, SetLog[]>();
  for (const l of logs) {
    if (!sess.has(l.sessionId)) continue;
    const arr = bySession.get(l.sessionId) ?? [];
    arr.push(l);
    bySession.set(l.sessionId, arr);
  }

  const out: TopSet[] = [];
  for (const [sid, ls] of bySession) {
    const s = sess.get(sid)!;
    let best = ls[0]!;
    for (const l of ls) if (epley(l.weight, l.reps) > epley(best.weight, best.reps)) best = l;
    out.push({
      sessionId: sid,
      date: s.startedAt,
      weight: best.weight,
      reps: best.reps,
      e1rm: epley(best.weight, best.reps),
      source: s.source,
    });
  }
  return out.sort((a, b) => a.date - b.date);
}

export interface Best {
  weight: number;
  reps: number;
  date: number;
}

/** Личные рекорды упражнения: по абсолютному весу и по оценке 1ПМ. */
export async function personalBests(
  exerciseId: string,
): Promise<{ byWeight: Best | null; byE1rm: Best | null }> {
  const [logs, sess] = await Promise.all([
    db.setLogs.where("exerciseId").equals(exerciseId).filter((l) => !l.deleted).toArray(),
    finishedSessions(),
  ]);
  let byWeight: Best | null = null;
  let byE1rm: Best | null = null;
  for (const l of logs) {
    const s = sess.get(l.sessionId);
    if (!s) continue;
    const b: Best = { weight: l.weight, reps: l.reps, date: s.startedAt };
    if (!byWeight || l.weight > byWeight.weight) byWeight = b;
    if (!byE1rm || epley(l.weight, l.reps) > epley(byE1rm.weight, byE1rm.reps)) byE1rm = b;
  }
  return { byWeight, byE1rm };
}

/** id подходов из данной сессии, которые побили всю историю ДО этой сессии.
 *  weight — новый максимум веса, e1rm — новый максимум оценки 1ПМ. */
export async function prsInSession(
  sessionId: string,
): Promise<Map<string, { weight: boolean; e1rm: boolean }>> {
  const session = await db.sessions.get(sessionId);
  const res = new Map<string, { weight: boolean; e1rm: boolean }>();
  if (!session) return res;

  const sess = await finishedSessions();
  // текущая может быть ещё не завершена — учитываем её тоже
  const startedAt = session.startedAt;

  const logs = await db.setLogs.filter((l) => !l.deleted).toArray();
  const byEx = new Map<string, SetLog[]>();
  for (const l of logs) {
    const s = l.sessionId === sessionId ? session : sess.get(l.sessionId);
    if (!s) continue;
    const arr = byEx.get(l.exerciseId) ?? [];
    arr.push(l);
    byEx.set(l.exerciseId, arr);
  }

  for (const l of logs) {
    if (l.sessionId !== sessionId) continue;
    const priorSameEx = (byEx.get(l.exerciseId) ?? []).filter((o) => {
      if (o.id === l.id) return false;
      const s = o.sessionId === sessionId ? session : sess.get(o.sessionId);
      if (!s) return false;
      // «до» = более ранняя сессия, либо тот же старт но записано раньше
      return s.startedAt < startedAt || (s.startedAt === startedAt && o.loggedAt < l.loggedAt);
    });
    const maxW = priorSameEx.reduce((m, o) => Math.max(m, o.weight), 0);
    const maxE = priorSameEx.reduce((m, o) => Math.max(m, epley(o.weight, o.reps)), 0);
    const weight = priorSameEx.length > 0 && l.weight > maxW && l.weight > 0;
    const e1rm = priorSameEx.length > 0 && epley(l.weight, l.reps) > maxE && l.weight > 0;
    if (weight || e1rm) res.set(l.id, { weight, e1rm });
  }
  return res;
}

export interface PRItem {
  exerciseId: string;
  weight: number;
  reps: number;
  date: number;
}

/** Последние личные рекорды по весу across упражнения (для экрана «Прогресс»). */
export async function recentWeightPRs(limit = 12): Promise<PRItem[]> {
  const [logs, sess] = await Promise.all([
    db.setLogs.filter((l) => !l.deleted).toArray(),
    finishedSessions(),
  ]);
  const byEx = new Map<string, SetLog[]>();
  for (const l of logs) {
    if (!sess.has(l.sessionId)) continue;
    const arr = byEx.get(l.exerciseId) ?? [];
    arr.push(l);
    byEx.set(l.exerciseId, arr);
  }
  const prs: PRItem[] = [];
  for (const [exerciseId, ls] of byEx) {
    ls.sort((a, b) => sess.get(a.sessionId)!.startedAt - sess.get(b.sessionId)!.startedAt);
    let max = 0;
    let cur: PRItem | null = null; // копим максимум внутри одной сессии → одна запись на сессию
    for (const l of ls) {
      const date = sess.get(l.sessionId)!.startedAt;
      if (l.weight > max && l.weight > 0) {
        max = l.weight;
        if (cur && cur.date === date) {
          cur.weight = l.weight;
          cur.reps = l.reps;
        } else {
          cur = { exerciseId, weight: l.weight, reps: l.reps, date };
          prs.push(cur);
        }
      }
    }
  }
  return prs.sort((a, b) => b.date - a.date).slice(0, limit);
}

const WEEK = 7 * 24 * 3600 * 1000;

/** Недельный объём (число рабочих подходов) по мышечным группам за последние
 *  N недель. Возвращает массив групп с суммой подходов, по убыванию. */
export async function muscleVolume(
  weeks: number,
): Promise<{ muscle: MuscleGroup; sets: number }[]> {
  const since = Date.now() - weeks * WEEK;
  const [logs, sess, exs] = await Promise.all([
    db.setLogs.filter((l) => !l.deleted).toArray(),
    finishedSessions(),
    db.exercises.filter((e) => !e.deleted).toArray(),
  ]);
  const muscleOf = new Map(exs.map((e) => [e.id, e.muscle]));
  const tally = new Map<MuscleGroup, number>();
  for (const l of logs) {
    const s = sess.get(l.sessionId);
    if (!s || s.startedAt < since) continue;
    const m = muscleOf.get(l.exerciseId);
    if (!m) continue;
    tally.set(m, (tally.get(m) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
}
