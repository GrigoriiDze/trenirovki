import type { DayCode, Exercise, ProgramSlot } from "~/db/schema";
import "./today.css";

const DAYS: DayCode[] = ["A", "B", "C"];

interface Props {
  day: DayCode;
  suggested: DayCode;
  title: string;
  note: string;
  slots: ProgramSlot[];
  exerciseById: Map<string, Exercise>;
  onPickDay: (d: DayCode) => void;
  onBack: () => void;
  onStart: () => void;
}

export function Today({
  day,
  suggested,
  title,
  note,
  slots,
  exerciseById,
  onPickDay,
  onBack,
  onStart,
}: Props) {
  return (
    <main class="today">
      <header class="today__head">
        <button class="today__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <div class="today__daypick" role="group" aria-label="День программы">
          {DAYS.map((d) => (
            <button
              key={d}
              class={`daychip ${d === day ? "daychip--on" : ""}`}
              onClick={() => onPickDay(d)}
            >
              {d}
              {d === suggested ? <span class="daychip__dot" aria-label="сегодня" /> : null}
            </button>
          ))}
        </div>
      </header>

      <div class="today__title">
        <h1>День {day}</h1>
        <p class="today__sub">{title}</p>
      </div>

      <p class="today__note">{note}</p>

      <ol class="exlist">
        {slots.map((s) => {
          const ex = exerciseById.get(s.exerciseId);
          if (!ex) return null;
          const reps = s.repLow === s.repHigh ? `${s.repLow}` : `${s.repLow}–${s.repHigh}`;
          const unit = ex.load === "time" ? " сек" : "";
          return (
            <li class="exrow" key={s.id}>
              <div class="exrow__top">
                <span class="exrow__name">
                  {s.ord}. {ex.nameRu}
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
        <button class="btn btn--primary" onClick={onStart}>
          Начать тренировку{day !== suggested ? ` · день ${day}` : ""}
        </button>
      </div>
    </main>
  );
}
