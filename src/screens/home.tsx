import type { DayCode } from "~/db/schema";
import "./home.css";

interface Props {
  day: DayCode;
  dayTitle: string;
  exerciseCount: number;
  onOpenToday: () => void;
}

const TODAY_FMT = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function Home({ day, dayTitle, exerciseCount, onOpenToday }: Props) {
  return (
    <main class="home">
      <header class="home__head">
        <span class="home__title">Тренировки</span>
        <span class="home__date">{TODAY_FMT.format(new Date())}</span>
      </header>

      <button class="card card--today" onClick={onOpenToday}>
        <span class="label">Сегодня</span>
        <span class="card__day">День {day}</span>
        <span class="card__sub">{dayTitle}</span>
        <span class="card__meta num">{exerciseCount} упражнений</span>
        <span class="card__go" aria-hidden="true">→</span>
      </button>

      <nav class="tiles">
        <div class="tile" aria-disabled="true">
          <span class="tile__name">Дневник</span>
          <span class="tile__soon">скоро</span>
        </div>
        <div class="tile" aria-disabled="true">
          <span class="tile__name">Тело</span>
          <span class="tile__soon">скоро</span>
        </div>
        <div class="tile" aria-disabled="true">
          <span class="tile__name">Программа</span>
          <span class="tile__soon">скоро</span>
        </div>
      </nav>
    </main>
  );
}
