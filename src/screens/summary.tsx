import { db, type Exercise, type Session as Sess } from "~/db/schema";
import { useLive } from "~/lib/live";
import { plural } from "~/lib/plural";
import { formatSet } from "~/lib/format-set";
import "./summary.css";

export function Summary({
  session,
  exerciseById,
  onHome,
}: {
  session: Sess;
  exerciseById: Map<string, Exercise>;
  onHome: () => void;
}) {
  const logs = useLive(
    () => db.setLogs.where("sessionId").equals(session.id).filter((l) => !l.deleted).sortBy("loggedAt"),
    [session.id],
  );
  if (!logs) return <div class="boot">…</div>;

  const byEx = new Map<string, typeof logs>();
  for (const l of logs) {
    const arr = byEx.get(l.exerciseId) ?? [];
    arr.push(l);
    byEx.set(l.exerciseId, arr);
  }

  const tonnage = logs.reduce((s, l) => s + l.weight * l.reps, 0);
  const mins = session.finishedAt
    ? Math.round((session.finishedAt - session.startedAt) / 60000)
    : 0;
  const nSets = logs.length;

  return (
    <main class="sum">
      <header class="sum__head">
        <div class="label">Готово{session.day ? ` · День ${session.day}` : ""}</div>
        <h1>Тренировка записана</h1>
        <p class="sum__stats num">
          {nSets} {plural(nSets, ["подход", "подхода", "подходов"])}
          {tonnage > 0 ? ` · ${Math.round(tonnage).toLocaleString("ru-RU")} кг` : ""}
          {mins > 0 ? ` · ${mins} мин` : ""}
        </p>
      </header>

      <ol class="sum__list">
        {[...byEx].map(([exId, ls]) => {
          const ex = exerciseById.get(exId);
          return (
            <li class="sum__ex" key={exId}>
              <span class="sum__name">{ex?.nameRu ?? exId}</span>
              <span class="sum__sets num">
                {ls.map((l) => formatSet(ex?.load ?? "weight", l.weight, l.reps)).join("   ")}
              </span>
            </li>
          );
        })}
      </ol>

      <button class="btn btn--primary" onClick={onHome}>
        На главный
      </button>
    </main>
  );
}
