import type { DayCode, Exercise, ProgramSlot, Origin, Rom } from "~/db/schema";
import "./today-preview.css";

const ORIGIN_LABEL: Partial<Record<Origin, string>> = {
  nikita: "по Никите",
  changed: "изменено",
  added: "добавлено",
};

const ROM_LABEL: Record<Rom, string> = {
  full: "полная",
  lengthened: "растяжка",
  short: "короткая",
  iso: "статика",
};

interface Props {
  day: DayCode;
  title: string;
  note: string;
  slots: ProgramSlot[];
  exerciseById: Map<string, Exercise>;
}

export function TodayPreview({ day, title, note, slots, exerciseById }: Props) {
  return (
    <main class="today">
      <header class="today__head">
        <div class="label">Сегодня</div>
        <h1>
          День {day} · {title}
        </h1>
        <p class="today__note">{note}</p>
      </header>

      <ol class="today__list">
        {slots.map((s) => {
          const ex = exerciseById.get(s.exerciseId);
          if (!ex) return null;
          const reps = s.repLow === s.repHigh ? `${s.repLow}` : `${s.repLow}–${s.repHigh}`;
          const unit = ex.rom === "iso" ? " сек" : "";
          const originLabel = ORIGIN_LABEL[s.origin];
          return (
            <li class="ex" key={s.id}>
              <span class="ex__order num">{s.order}</span>
              <div class="ex__body">
                <div class="ex__title">
                  {ex.nameRu}
                  {s.perSide ? <span class="ex__side"> · каждая сторона</span> : null}
                </div>
                <div class="ex__en">{ex.nameEn}</div>
                <div class="ex__tags">
                  <span class={`tag tag--rom tag--${ex.rom}`}>{ROM_LABEL[ex.rom]}</span>
                  {originLabel ? (
                    <span class={`tag tag--origin tag--${s.origin}`}>{originLabel}</span>
                  ) : null}
                </div>
              </div>
              <span class="ex__sets num">
                {s.targetSets}×{reps}
                {unit}
              </span>
            </li>
          );
        })}
      </ol>

      <div class="today__cta">
        <button class="btn btn--primary" disabled>
          Начать тренировку
        </button>
        <p class="today__stub">экран старта — этап 1</p>
      </div>
    </main>
  );
}
