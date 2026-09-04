import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { db, type Exercise, type SessionExercise, type Session as Sess } from "~/db/schema";
import { useLive } from "~/lib/live";
import { formatSet } from "~/lib/format-set";
import {
  addExercise,
  editSet,
  exitSession,
  finishSession,
  logSet,
  moveExercise,
  removeExercise,
} from "~/session/store";
import { lastSetsFor } from "~/session/history";
import { haptic } from "~/lib/haptic";
import { Stepper } from "~/components/stepper";
import { RestTimer } from "~/components/rest-timer";
import "./session.css";

interface Props {
  session: Sess;
  items: SessionExercise[]; // без убранных, по порядку
  exerciseById: Map<string, Exercise>;
  allExercises: Exercise[];
  onExit: () => void;
  onFinish: () => void;
}

export function Session({ session, items, exerciseById, allExercises, onExit, onFinish }: Props) {
  const logs = useLive(
    () => db.setLogs.where("sessionId").equals(session.id).filter((l) => !l.deleted).sortBy("setNumber"),
    [session.id],
  );

  const [exIdx, setExIdx] = useState(0);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [resting, setResting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);

  // общее время тренировки — тикает раз в 20 сек
  const [elapsed, setElapsed] = useState(() => Date.now() - session.startedAt);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed(Date.now() - session.startedAt), 20_000);
    return () => window.clearInterval(id);
  }, [session.startedAt]);
  const mins = Math.floor(elapsed / 60000);

  const idx = Math.min(exIdx, items.length - 1);
  const item = items[idx] as SessionExercise | undefined;
  const ex = item ? exerciseById.get(item.exerciseId) : undefined;
  const load = ex?.load ?? "weight";

  const exLogs = useMemo(
    () => (item ? (logs ?? []).filter((l) => l.exerciseId === item.exerciseId) : []),
    [logs, item?.exerciseId],
  );

  const prev = useLive(
    () => (item ? lastSetsFor(item.exerciseId, session.id) : Promise.resolve([])),
    [item?.exerciseId, session.id],
  );

  /** Прикидка для подхода i (с нуля): подход i прошлого раза → его последний → минимум. */
  function guess(i: number): { weight: number; reps: number } {
    const p = prev?.[i] ?? prev?.[prev.length - 1];
    if (p) return { weight: p.weight, reps: p.reps };
    return { weight: load === "weight" ? 20 : 0, reps: item?.repLow ?? 10 };
  }

  // на входе встаём на первое недоделанное — дальше навигация ручная
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !logs || items.length === 0) return;
    const i = items.findIndex(
      (it) => logs.filter((l) => l.exerciseId === it.exerciseId).length < (it.targetSets ?? 1),
    );
    setExIdx(i === -1 ? 0 : i);
    jumped.current = true;
  }, [logs, items]);

  // сброс режима при смене упражнения
  useEffect(() => {
    setEditing(null);
    setResting(false);
  }, [item?.id]);

  // дефолт ввода: подход из этой же сессии → прикидка по прошлому разу.
  // Не трогаем во время правки и отдыха.
  useEffect(() => {
    if (editing || resting || !item) return;
    const inSession = exLogs[exLogs.length - 1];
    const g = inSession ? { weight: inSession.weight, reps: inSession.reps } : guess(exLogs.length);
    setWeight(load === "weight" ? g.weight : 0);
    setReps(g.reps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, exLogs.length, resting, editing, prev]);

  if (!logs) return <div class="boot">загрузка…</div>;

  const done = exLogs.length;
  const target = item?.targetSets ?? null;
  const repRange =
    item && item.repLow != null && item.repHigh != null
      ? item.repLow === item.repHigh
        ? `${item.repLow}`
        : `${item.repLow}–${item.repHigh}`
      : null;
  const targetStr =
    target != null && repRange != null
      ? load === "time"
        ? `${target} × ${repRange} сек`
        : `${target} × ${repRange}`
      : "сам решаешь, сколько подходов";
  const hasNext = idx < items.length - 1;
  const nextName = hasNext
    ? exerciseById.get(items[idx + 1]!.exerciseId)?.nameRu ?? ""
    : "";
  // «цель закрыта» — подсветить переход дальше, но подход всё равно доступен
  const metTarget = target != null ? done >= target : done >= 1;

  async function commit() {
    if (!item) return;
    haptic(16);
    if (editing) {
      await editSet(editing, { weight, reps });
      setEditing(null);
      return;
    }
    const at = exLogs.length;
    await logSet(session.id, item.exerciseId, { weight, reps, backFeel: null, rir: null });
    setFlash(at);
    window.setTimeout(() => setFlash(null), 600);
    if (ex && ex.restSec > 0) setResting(true);
  }

  const inSession = new Set(items.map((it) => it.exerciseId));
  const addable = allExercises
    .filter((e) => !inSession.has(e.id))
    .sort((a, b) => a.muscle.localeCompare(b.muscle, "ru") || a.nameRu.localeCompare(b.nameRu, "ru"));

  return (
    <main class="sess">
      <header class="sess__top">
        <button
          class="sess__x"
          onClick={() => {
            void exitSession(session.id);
            onExit();
          }}
          aria-label="На главный"
        >
          ✕
        </button>
        <div class="sess__nav">
          <button
            class="sess__arrow"
            disabled={idx <= 0}
            onClick={() => setExIdx(Math.max(0, idx - 1))}
            aria-label="Предыдущее"
          >
            ‹
          </button>
          <span class="sess__count num">
            {items.length ? idx + 1 : 0}/{items.length}
            <span class="sess__time"> · {mins} мин</span>
          </span>
          <button
            class="sess__arrow"
            disabled={idx >= items.length - 1}
            onClick={() => setExIdx(Math.min(items.length - 1, idx + 1))}
            aria-label="Следующее"
          >
            ›
          </button>
        </div>
        <button
          class={`sess__end ${confirmEnd ? "sess__end--armed" : ""}`}
          onClick={() => {
            if (confirmEnd) void finishSession(session.id).then(onFinish);
            else {
              setConfirmEnd(true);
              window.setTimeout(() => setConfirmEnd(false), 3000);
            }
          }}
        >
          {confirmEnd ? "точно?" : "завершить"}
        </button>
      </header>

      {item && ex ? (
        <>
          <div class="sess__ex">
            <h1>{ex.nameRu}</h1>
            <p class="sess__target num">
              {targetStr}
              {item.perSide ? " · каждая сторона" : ""}
            </p>
            <p class="sess__cue">{ex.cue}</p>
          </div>

          <ol class="setlist">
            {Array.from({ length: Math.max(target ?? 0, done + 1) }).map((_, i) => {
              const log = exLogs[i];
              const isCurrent = !log && i === done && !editing;
              const wasHint = prev?.[i] ? formatSet(load, prev[i]!.weight, prev[i]!.reps) : null;
              return (
                <li
                  class={`setrow ${log ? "setrow--done" : ""} ${isCurrent ? "setrow--now" : ""} ${
                    editing && log?.id === editing ? "setrow--edit" : ""
                  } ${flash === i ? "setrow--flash" : ""}`}
                  key={log?.id ?? `p${i}`}
                  onClick={
                    log
                      ? () => {
                          setEditing(log.id);
                          setWeight(log.weight);
                          setReps(log.reps);
                          setResting(false);
                        }
                      : undefined
                  }
                >
                  <span class="setrow__n num">{i + 1}</span>
                  {log ? (
                    <span class="setrow__val num">{formatSet(load, log.weight, log.reps)}</span>
                  ) : isCurrent ? (
                    <span class="setrow__val setrow__val--now num">{formatSet(load, weight, reps)}</span>
                  ) : (
                    <span class="setrow__val setrow__val--pending">—</span>
                  )}
                  {wasHint && !log ? <span class="setrow__was num">было {wasHint}</span> : null}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <div class="sess__empty">
          <p>В тренировке нет упражнений.</p>
          <button class="sess__addbig" onClick={() => setSheet(true)}>
            + упражнение
          </button>
        </div>
      )}

      <div class="sess__input">
        {resting ? (
          <RestTimer seconds={ex?.restSec ?? 60} onDone={() => setResting(false)} />
        ) : item && ex ? (
          <>
            <div class="sess__steppers">
              {load === "weight" ? (
                <Stepper label="вес" value={weight} step={2.5} unit="кг" onChange={setWeight} />
              ) : null}
              {load === "time" ? (
                <Stepper label="секунды" value={reps} step={5} min={5} unit="сек" onChange={setReps} />
              ) : (
                <Stepper label="повторы" value={reps} step={1} min={1} onChange={setReps} />
              )}
            </div>

            <button class="sess__log" onClick={commit}>
              {editing ? "Сохранить" : `Записать подход ${done + 1}`}
            </button>

            {!editing ? (
              <>
                {hasNext ? (
                  <button
                    class={`sess__next ${metTarget ? "sess__next--go" : ""}`}
                    onClick={() => setExIdx(idx + 1)}
                  >
                    Дальше: {nextName} →
                  </button>
                ) : (
                  <button
                    class="sess__next sess__next--go"
                    onClick={() => void finishSession(session.id).then(onFinish)}
                  >
                    Завершить тренировку · {mins} мин
                  </button>
                )}
                <button class="sess__manage" onClick={() => setSheet(true)}>
                  + упражнение · порядок
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {sheet ? (
        <ManageSheet
          session={session}
          items={items}
          exerciseById={exerciseById}
          addable={addable}
          currentIdx={idx}
          onClose={() => setSheet(false)}
          onGoto={(i) => {
            setExIdx(i);
            setSheet(false);
          }}
        />
      ) : null}
    </main>
  );
}

function ManageSheet({
  session,
  items,
  exerciseById,
  addable,
  currentIdx,
  onClose,
  onGoto,
}: {
  session: Sess;
  items: SessionExercise[];
  exerciseById: Map<string, Exercise>;
  addable: Exercise[];
  currentIdx: number;
  onClose: () => void;
  onGoto: (i: number) => void;
}) {
  const [denied, setDenied] = useState<string | null>(null);

  return (
    <div class="sheet" onClick={onClose}>
      <div class="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <header class="sheet__head">
          <h2>Упражнения тренировки</h2>
          <button class="sheet__close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>

        <ol class="sheet__cur">
          {items.map((it, i) => {
            const ex = exerciseById.get(it.exerciseId);
            return (
              <li class={`sheet__item ${i === currentIdx ? "sheet__item--on" : ""}`} key={it.id}>
                <button class="sheet__name" onClick={() => onGoto(i)}>
                  {i + 1}. {ex?.nameRu ?? it.exerciseId}
                </button>
                <div class="sheet__ctl">
                  <button
                    aria-label="Выше"
                    disabled={i === 0}
                    onClick={() => void moveExercise(session.id, it.exerciseId, -1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Ниже"
                    disabled={i === items.length - 1}
                    onClick={() => void moveExercise(session.id, it.exerciseId, 1)}
                  >
                    ↓
                  </button>
                  <button
                    aria-label="Убрать"
                    onClick={async () => {
                      const ok = await removeExercise(session.id, it.exerciseId);
                      if (!ok) {
                        setDenied(it.exerciseId);
                        window.setTimeout(() => setDenied(null), 2500);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
                {denied === it.exerciseId ? (
                  <p class="sheet__deny">Есть записанные подходы — сначала удали их</p>
                ) : null}
              </li>
            );
          })}
        </ol>

        <p class="sheet__sub">Добавить</p>
        <ol class="sheet__add">
          {addable.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => {
                  void addExercise(session.id, e.id);
                  onClose();
                }}
              >
                <span class="sheet__addname">{e.nameRu}</span>
                <span class="sheet__addmus">{e.muscle}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
