import { useState } from "preact/hooks";
import { db, type Exercise } from "~/db/schema";
import { useLive } from "~/lib/live";
import { plural } from "~/lib/plural";
import { formatSet } from "~/lib/format-set";
import { DAY_TITLES } from "~/data/program-v1";
import { softDelete } from "~/db/write";
import { downloadBackup } from "~/session/export";
import "./diary.css";

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

export function Diary({
  exerciseById,
  onBack,
  onOpenExercise,
}: {
  exerciseById: Map<string, Exercise>;
  onBack: () => void;
  onOpenExercise: (id: string) => void;
}) {
  const sessions = useLive(
    () =>
      db.sessions
        .filter((s) => !s.deleted && s.finishedAt !== null)
        .sortBy("startedAt")
        .then((a) => a.reverse()),
    [],
  );
  const allLogs = useLive(() => db.setLogs.filter((l) => !l.deleted).toArray(), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  if (!sessions || !allLogs) return <div class="boot">загрузка…</div>;

  const logsBySession = new Map<string, typeof allLogs>();
  for (const l of allLogs) {
    const arr = logsBySession.get(l.sessionId) ?? [];
    arr.push(l);
    logsBySession.set(l.sessionId, arr);
  }

  async function del(id: string) {
    for (const l of logsBySession.get(id) ?? []) await softDelete("setLogs", l.id);
    await softDelete("sessions", id);
    setConfirmDel(null);
    setOpenId(null);
  }

  return (
    <main class="diary">
      <header class="diary__head">
        <button class="diary__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1>Дневник</h1>
        <button class="diary__export" onClick={() => void downloadBackup()}>
          выгрузить
        </button>
      </header>

      {sessions.length === 0 ? (
        <p class="diary__empty">Пока пусто. Проведёшь тренировку — появится здесь.</p>
      ) : (
        <ol class="diary__list">
          {sessions.map((s) => {
            const ls = logsBySession.get(s.id) ?? [];
            const tonnage = ls.reduce((sum, l) => sum + l.weight * l.reps, 0);
            const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
            const open = openId === s.id;
            const byEx = new Map<string, typeof ls>();
            for (const l of ls) {
              const a = byEx.get(l.exerciseId) ?? [];
              a.push(l);
              byEx.set(l.exerciseId, a);
            }
            return (
              <li class="drow" key={s.id}>
                <button class="drow__head" onClick={() => setOpenId(open ? null : s.id)}>
                  <span class="drow__date">
                    {DATE_FMT.format(new Date(s.startedAt))}
                    {s.day ? ` · День ${s.day}` : s.source === "import" ? " · импорт" : ""}
                  </span>
                  <span class="drow__sub num">
                    {ls.length} {plural(ls.length, ["подход", "подхода", "подходов"])}
                    {tonnage > 0 ? ` · ${Math.round(tonnage).toLocaleString("ru-RU")} кг` : ""}
                    {mins > 0 ? ` · ${mins} мин` : ""}
                  </span>
                </button>

                {open ? (
                  <div class="drow__body">
                    {s.day ? <p class="drow__title">{DAY_TITLES[s.day]}</p> : null}
                    {s.note ? <p class="drow__note">{s.note}</p> : null}
                    <ul class="drow__ex">
                      {[...byEx].map(([exId, exls]) => (
                        <li key={exId}>
                          <button class="drow__exname" onClick={() => onOpenExercise(exId)}>
                            {exerciseById.get(exId)?.nameRu ?? exId}
                          </button>
                          <span class="drow__exsets num">
                            {exls
                              .sort((a, b) => a.setNumber - b.setNumber)
                              .map((l) =>
                                formatSet(exerciseById.get(exId)?.load ?? "weight", l.weight, l.reps),
                              )
                              .join("   ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      class={`drow__del ${confirmDel === s.id ? "drow__del--armed" : ""}`}
                      onClick={() => {
                        if (confirmDel === s.id) void del(s.id);
                        else {
                          setConfirmDel(s.id);
                          window.setTimeout(() => setConfirmDel(null), 3000);
                        }
                      }}
                    >
                      {confirmDel === s.id ? "точно удалить?" : "удалить тренировку"}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
