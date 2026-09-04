import { useState } from "preact/hooks";
import type { Exercise } from "~/db/schema";
import { useLive } from "~/lib/live";
import { formatSet } from "~/lib/format-set";
import { plural } from "~/lib/plural";
import { MAJOR_BAND, MINOR_BAND, recentWeightPRs, volumeSummary } from "~/progress/calc";
import { BodyMap } from "~/components/body-map";
import "./progress.css";

const DATE = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const RANGES = [4, 8, 12] as const;

export function Progress({
  exerciseById,
  onBack,
  onOpenExercise,
}: {
  exerciseById: Map<string, Exercise>;
  onBack: () => void;
  onOpenExercise: (id: string) => void;
}) {
  const [weeks, setWeeks] = useState<(typeof RANGES)[number]>(4);
  const vol = useLive(() => volumeSummary(weeks), [weeks]);
  const prs = useLive(() => recentWeightPRs(15), []);

  const under = vol?.byMuscle.filter((m) => m.sets < m.band[0]).sort((a, b) => a.sets - b.sets);

  return (
    <main class="prog">
      <header class="prog__head">
        <button class="prog__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1>Прогресс</h1>
        <div class="prog__range" role="group" aria-label="Период">
          {RANGES.map((r) => (
            <button key={r} class={weeks === r ? "on" : ""} onClick={() => setWeeks(r)}>
              {r} нед
            </button>
          ))}
        </div>
      </header>

      {!vol ? (
        <p class="prog__empty">…</p>
      ) : (
        <>
          <div class="stats">
            <div class="stat">
              <span class="stat__n num">{vol.totalSets}</span>
              <span class="stat__l">
                {plural(vol.totalSets, ["подход", "подхода", "подходов"])} за период
              </span>
            </div>
            <div class="stat">
              <span class="stat__n num">
                {vol.inCorridor}
                <span class="stat__of">/{vol.byMuscle.length}</span>
              </span>
              <span class="stat__l">групп в коридоре</span>
            </div>
            <div class="stat">
              <span class="stat__n num">{vol.sessions}</span>
              <span class="stat__l">{plural(vol.sessions, ["тренировка", "тренировки", "тренировок"])}</span>
            </div>
          </div>

          <section class="prog__sec">
            <h2>Что нагружено за {weeks} нед.</h2>
            <BodyMap data={vol.byMuscle} />
          </section>

          {under && under.length > 0 ? (
            <section class="prog__sec">
              <h2>Меньше всего нагружено</h2>
              <ul class="bars">
                {under.map((v) => (
                  <li class="bar" key={v.muscle}>
                    <span class="bar__name">{v.muscle}</span>
                    <span class="bar__track">
                      <span
                        class="bar__fill"
                        style={{ width: `${Math.min(100, (v.sets / v.band[1]) * 100)}%` }}
                      />
                    </span>
                    <span class="bar__val num">{v.sets}</span>
                  </li>
                ))}
              </ul>
              <p class="prog__note">
                Ориентир в неделю: крупные группы {MAJOR_BAND[0]}–{MAJOR_BAND[1]} подходов,
                мелкие/вспомогательные {MINOR_BAND[0]}–{MINOR_BAND[1]}.
              </p>
            </section>
          ) : null}
        </>
      )}

      <section class="prog__sec">
        <h2>Личные рекорды</h2>
        {!prs ? (
          <p class="prog__empty">…</p>
        ) : prs.length === 0 ? (
          <p class="prog__empty">Пока нет. Запишешь пару тренировок — появятся.</p>
        ) : (
          <ol class="prs">
            {prs.map((p) => {
              const ex = exerciseById.get(p.exerciseId);
              return (
                <li class="pr" key={`${p.exerciseId}-${p.date}`}>
                  <button class="pr__btn" onClick={() => onOpenExercise(p.exerciseId)}>
                    <span class="pr__name">{ex?.nameRu ?? p.exerciseId}</span>
                    <span class="pr__val num">
                      {formatSet(ex?.load ?? "weight", p.weight, p.reps)}
                    </span>
                    <span class="pr__date num">{DATE.format(new Date(p.date))}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
