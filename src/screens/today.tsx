import type { DayCode, Exercise, ProgramSlot } from "~/db/schema";
import "./today.css";

interface Props {
  day: DayCode;
  title: string;
  note: string;
  slots: ProgramSlot[];
  exerciseById: Map<string, Exercise>;
  onBack: () => void;
}

export function Today({ day, title, note, slots, exerciseById, onBack }: Props) {
  return (
    <main class="today">
      <header class="today__head">
        <button class="today__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <div>
          <h1>День {day}</h1>
          <p class="today__sub">{title}</p>
        </div>
      </header>

      <p class="today__note">{note}</p>

      <ol class="exlist">
        {slots.map((s) => {
          const ex = exerciseById.get(s.exerciseId);
          if (!ex) return null;
          const reps = s.repLow === s.repHigh ? `${s.repLow}` : `${s.repLow}–${s.repHigh}`;
          const unit = ex.rom === "iso" ? " сек" : "";
          return (
            <li class="exrow" key={s.id}>
              <div class="exrow__top">
                <span class="exrow__name">
                  {s.order}. {ex.nameRu}
                  {s.perSide ? <span class="exrow__side"> · каждая сторона</span> : null}
                </span>
                <span class="exrow__sets num">
                  {s.targetSets} × {reps}
                  {unit}
                </span>
              </div>
              <p class="exrow__cue">{ex.cue}</p>
            </li>
          );
        })}
      </ol>

      <div class="today__cta">
        <button class="btn btn--primary" disabled>
          Начать тренировку
        </button>
        <p class="today__stub">запуск сессии — этап 1</p>
      </div>
    </main>
  );
}
