import { useMemo, useState } from "preact/hooks";
import { db, type Exercise } from "~/db/schema";
import { useLive } from "~/lib/live";
import { formatSet } from "~/lib/format-set";
import { plural } from "~/lib/plural";
import { personalBests, topSetSeries } from "~/progress/calc";
import { ProgressChart, type ChartPoint } from "~/components/progress-chart";
import "./exercise.css";

const DATE = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

export function ExerciseScreen({
  exerciseId,
  exercise,
  onBack,
}: {
  exerciseId: string;
  exercise: Exercise | undefined;
  onBack: () => void;
}) {
  const [metric, setMetric] = useState<"weight" | "e1rm">("weight");
  const series = useLive(() => topSetSeries(exerciseId), [exerciseId]);
  const best = useLive(() => personalBests(exerciseId), [exerciseId]);
  const sessions = useLive(
    () =>
      db.sessions.filter((s) => !s.deleted && s.finishedAt !== null).toArray(),
    [],
  );
  const logs = useLive(
    () => db.setLogs.where("exerciseId").equals(exerciseId).filter((l) => !l.deleted).toArray(),
    [exerciseId],
  );

  const load = exercise?.load ?? "weight";
  const showChart = load === "weight";

  const points: ChartPoint[] = useMemo(() => {
    if (!series) return [];
    let runMax = -Infinity;
    return series.map((t) => {
      const y = metric === "weight" ? t.weight : Math.round(t.e1rm * 10) / 10;
      const pr = y > runMax;
      runMax = Math.max(runMax, y);
      return {
        x: t.date,
        y,
        label: formatSet(load, t.weight, t.reps),
        pr: pr && series.length > 1,
      };
    });
  }, [series, metric, load]);

  const perSession = useMemo(() => {
    if (!sessions || !logs) return [];
    const byId = new Map(sessions.map((s) => [s.id, s]));
    const bySession = new Map<string, typeof logs>();
    for (const l of logs) {
      if (!byId.has(l.sessionId)) continue;
      const a = bySession.get(l.sessionId) ?? [];
      a.push(l);
      bySession.set(l.sessionId, a);
    }
    return [...bySession.entries()]
      .map(([sid, ls]) => ({
        date: byId.get(sid)!.startedAt,
        imported: byId.get(sid)!.source === "import",
        sets: ls.sort((a, b) => a.setNumber - b.setNumber),
      }))
      .sort((a, b) => b.date - a.date);
  }, [sessions, logs]);

  return (
    <main class="exs">
      <header class="exs__head">
        <button class="exs__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1>{exercise?.nameRu ?? exerciseId}</h1>
      </header>

      {exercise?.cue ? <p class="exs__cue">{exercise.cue}</p> : null}

      {best?.byWeight ? (
        <p class="exs__pr num">
          Рекорд: {formatSet(load, best.byWeight.weight, best.byWeight.reps)} ·{" "}
          {DATE.format(new Date(best.byWeight.date))}
        </p>
      ) : null}

      {showChart ? (
        <>
          <div class="exs__metric" role="group" aria-label="Что на графике">
            <button
              class={metric === "weight" ? "on" : ""}
              onClick={() => setMetric("weight")}
            >
              вес
            </button>
            <button class={metric === "e1rm" ? "on" : ""} onClick={() => setMetric("e1rm")}>
              оценка 1ПМ
            </button>
          </div>
          <ProgressChart points={points} />
        </>
      ) : null}

      <ol class="exs__list">
        {perSession.length === 0 ? (
          <li class="exs__none">Ещё не делал это упражнение.</li>
        ) : (
          perSession.map((s) => (
            <li class="exs__row" key={s.date}>
              <span class="exs__date">
                {DATE.format(new Date(s.date))}
                {s.imported ? <span class="exs__imp"> · импорт</span> : null}
              </span>
              <span class="exs__sets num">
                {s.sets.map((l) => formatSet(load, l.weight, l.reps)).join("  ")}
              </span>
              <span class="exs__n num">
                {s.sets.length} {plural(s.sets.length, ["подход", "подхода", "подходов"])}
              </span>
            </li>
          ))
        )}
      </ol>
    </main>
  );
}
