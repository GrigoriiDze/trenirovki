import type { DayCode, Exercise } from "~/db/schema";
import type { SyncState } from "~/sync/engine";
import { useLive } from "~/lib/live";
import { plural } from "~/lib/plural";
import { formatSet } from "~/lib/format-set";
import { recentWeightPRs, weekStats, WEEK_BAND } from "~/progress/calc";
import { bodyHistory } from "~/body/calc";
import "./home.css";

interface Props {
  day: DayCode;
  dayTitle: string;
  exerciseCount: number;
  exerciseById: Map<string, Exercise>;
  sync: SyncState;
  hasOpenSession: boolean;
  onOpenToday: () => void;
  onResume: () => void;
  onOpenDiary: () => void;
  onOpenProgress: () => void;
  onOpenBody: () => void;
}

const TODAY_FMT = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const PR_FMT = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

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
  exerciseById,
  sync,
  hasOpenSession,
  onOpenToday,
  onResume,
  onOpenDiary,
  onOpenProgress,
  onOpenBody,
}: Props) {
  const sl = syncLabel(sync);
  const week = useLive(() => weekStats(), []);
  const lastPR = useLive(async () => (await recentWeightPRs(1))[0] ?? null, []);
  const body = useLive(() => bodyHistory(), []);

  const lastBody = body && body.length ? body[body.length - 1]! : null;
  const daysSinceBody = lastBody
    ? Math.floor((Date.now() - lastBody.date) / 86400000)
    : null;

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

      <button class="week" onClick={onOpenProgress}>
        <div class="week__top">
          <span class="label">Неделя</span>
          <span class="week__count num">
            {week
              ? `${week.sessions} ${plural(week.sessions, ["тренировка", "тренировки", "тренировок"])} · ${week.sets} ${plural(week.sets, ["подход", "подхода", "подходов"])}`
              : "…"}
          </span>
        </div>
        {week && week.top.length ? (
          <>
            <ul class="week__bars">
              {week.top.slice(0, 5).map((t) => (
                <li class="week__bar" key={t.muscle}>
                  <span class="week__m">{t.muscle}</span>
                  <span class="week__track">
                    <span
                      class={`week__fill ${t.sets < WEEK_BAND[0] ? "week__fill--low" : ""}`}
                      style={{ width: `${Math.min(100, (t.sets / WEEK_BAND[1]) * 100)}%` }}
                    />
                  </span>
                  <span class="week__n num">{t.sets}</span>
                </li>
              ))}
            </ul>
            <p class="week__legend">
              Ориентир — {WEEK_BAND[0]}–{WEEK_BAND[1]} подходов на группу в неделю
            </p>
          </>
        ) : week ? (
          <p class="week__none">На этой неделе тренировок не было.</p>
        ) : null}
      </button>

      {lastPR ? (
        <button class="strip" onClick={onOpenProgress}>
          <span class="label">Последний рекорд</span>
          <span class="strip__body">
            <span class="strip__name">{exerciseById.get(lastPR.exerciseId)?.nameRu ?? lastPR.exerciseId}</span>
            <span class="strip__val num">
              {formatSet(exerciseById.get(lastPR.exerciseId)?.load ?? "weight", lastPR.weight, lastPR.reps)}
              {" · "}
              {PR_FMT.format(new Date(lastPR.date))}
            </span>
          </span>
        </button>
      ) : null}

      <nav class="tiles">
        <button class="tile tile--on" onClick={onOpenDiary}>
          <span class="tile__name">Дневник</span>
        </button>
        <button class="tile tile--on" onClick={onOpenProgress}>
          <span class="tile__name">Прогресс</span>
        </button>
        <button class="tile tile--on" onClick={onOpenBody}>
          <span class="tile__name">Тело</span>
          {daysSinceBody != null && daysSinceBody >= 28 ? (
            <span class="tile__soon">{daysSinceBody} дн</span>
          ) : null}
        </button>
      </nav>

      <p class={`home__sync home__sync--${sl.tone}`}>{sl.text}</p>
    </main>
  );
}
