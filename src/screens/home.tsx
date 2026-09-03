import type { DayCode } from "~/db/schema";
import type { SyncState } from "~/sync/engine";
import "./home.css";

interface Props {
  day: DayCode;
  dayTitle: string;
  exerciseCount: number;
  sync: SyncState;
  hasOpenSession: boolean;
  onOpenToday: () => void;
  onResume: () => void;
  onOpenDiary: () => void;
}

const TODAY_FMT = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function syncLabel(s: SyncState): { text: string; tone: "ok" | "wait" | "bad" } {
  if (s.status === "bad-token") return { text: "код отклонён", tone: "bad" };
  if (s.pending > 0) return { text: `${s.pending} ждут сети`, tone: "wait" };
  if (s.status === "syncing") return { text: "синхронизация…", tone: "wait" };
  if (s.status === "offline") return { text: "оффлайн", tone: "wait" };
  return { text: "сохранено", tone: "ok" };
}

export function Home({
  day,
  dayTitle,
  exerciseCount,
  sync,
  hasOpenSession,
  onOpenToday,
  onResume,
  onOpenDiary,
}: Props) {
  const sl = syncLabel(sync);
  return (
    <main class="home">
      <header class="home__head">
        <span class="home__title">Тренировки</span>
        <span class="home__date">{TODAY_FMT.format(new Date())}</span>
      </header>

      {hasOpenSession ? (
        <button class="card card--resume" onClick={onResume}>
          <span class="label">Идёт тренировка</span>
          <span class="card__day">Продолжить</span>
          <span class="card__go" aria-hidden="true">→</span>
        </button>
      ) : (
        <button class="card card--today" onClick={onOpenToday}>
          <span class="label">Сегодня</span>
          <span class="card__day">День {day}</span>
          <span class="card__sub">{dayTitle}</span>
          <span class="card__meta num">{exerciseCount} упражнений</span>
          <span class="card__go" aria-hidden="true">→</span>
        </button>
      )}

      <nav class="tiles">
        <button class="tile tile--on" onClick={onOpenDiary}>
          <span class="tile__name">Дневник</span>
        </button>
        <div class="tile" aria-disabled="true">
          <span class="tile__name">Тело</span>
          <span class="tile__soon">скоро</span>
        </div>
        <div class="tile" aria-disabled="true">
          <span class="tile__name">Программа</span>
          <span class="tile__soon">скоро</span>
        </div>
      </nav>

      <p class={`home__sync home__sync--${sl.tone}`}>{sl.text}</p>
    </main>
  );
}
