import { useState } from "preact/hooks";
import type { Exercise } from "~/db/schema";
import { useLive } from "~/lib/live";
import { formatSet } from "~/lib/format-set";
import { muscleVolume, recentWeightPRs } from "~/progress/calc";
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
  const vol = useLive(() => muscleVolume(weeks), [weeks]);
  const prs = useLive(() => recentWeightPRs(15), []);

  const max = vol && vol.length ? vol[0]!.sets : 0;

  return (
    <main class="prog">
      <header class="prog__head">
        <button class="prog__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1>Прогресс</h1>
      </header>

      <section class="prog__sec">
        <div class="prog__sectop">
          <h2>Объём по мышцам</h2>
          <div class="prog__range" role="group" aria-label="Период">
            {RANGES.map((r) => (
              <button key={r} class={weeks === r ? "on" : ""} onClick={() => setWeeks(r)}>
                {r} нед
              </button>
            ))}
          </div>
        </div>

        {!vol ? (
          <p class="prog__empty">…</p>
        ) : vol.length === 0 ? (
          <p class="prog__empty">За этот период подходов нет.</p>
        ) : (
          <ul class="bars">
            {vol.map((v) => (
              <li class="bar" key={v.muscle}>
                <span class="bar__name">{v.muscle}</span>
                <span class="bar__track">
                  <span class="bar__fill" style={{ width: `${(v.sets / max) * 100}%` }} />
                </span>
                <span class="bar__val num">{v.sets}</span>
              </li>
            ))}
          </ul>
        )}
        <p class="prog__note">
          Подходов в неделю на группу: ориентир 10–20. Считаются все рабочие подходы.
        </p>
      </section>

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
