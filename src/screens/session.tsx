import { useEffect, useMemo, useState } from "preact/hooks";
import { db, type Exercise, type ProgramSlot, type Session as Sess } from "~/db/schema";
import { useLive } from "~/lib/live";
import { formatSet } from "~/lib/format-set";
import { editSet, finishSession, logSet } from "~/session/store";
import { Stepper } from "~/components/stepper";
import { RestTimer } from "~/components/rest-timer";
import "./session.css";

interface Props {
  session: Sess;
  slots: ProgramSlot[];
  exerciseById: Map<string, Exercise>;
  onExit: () => void;
  onFinish: () => void;
}

export function Session({ session, slots, exerciseById, onExit, onFinish }: Props) {
  const logs = useLive(
    () => db.setLogs.where("sessionId").equals(session.id).filter((l) => !l.deleted).sortBy("setNumber"),
    [session.id],
  );

  const [exIdx, setExIdx] = useState(0);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [back, setBack] = useState<0 | 1 | 2 | null>(null);
  const [resting, setResting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const slot = slots[exIdx]!;
  const ex = exerciseById.get(slot.exerciseId)!;
  const load = ex.load;

  const exLogs = useMemo(
    () => (logs ?? []).filter((l) => l.exerciseId === slot.exerciseId),
    [logs, slot.exerciseId],
  );

  const firstUndone = useMemo(() => {
    if (!logs) return 0;
    const i = slots.findIndex(
      (s) => logs.filter((l) => l.exerciseId === s.exerciseId).length < s.targetSets,
    );
    return i === -1 ? slots.length - 1 : i;
  }, [logs, slots]);

  useEffect(() => {
    setExIdx(firstUndone);
  }, [firstUndone]);

  useEffect(() => {
    const last = exLogs[exLogs.length - 1];
    if (load === "time") {
      setReps(last ? last.reps : slot.repLow);
      setWeight(0);
    } else if (load === "bw") {
      setReps(last ? last.reps : slot.repLow);
      setWeight(0);
    } else {
      setWeight(last ? last.weight : 20);
      setReps(last ? last.reps : slot.repLow);
    }
    setBack(null);
    setEditing(null);
    setResting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.id]);

  if (!logs) return <div class="boot">загрузка…</div>;

  const done = exLogs.length;
  const target = slot.targetSets;
  const targetReps =
    slot.repLow === slot.repHigh ? `${slot.repLow}` : `${slot.repLow}–${slot.repHigh}`;
  const targetStr = load === "time" ? `${target} × ${targetReps} сек` : `${target} × ${targetReps}`;
  const allDone = slots.every(
    (s) => logs.filter((l) => l.exerciseId === s.exerciseId).length >= s.targetSets,
  );

  async function commit() {
    if (editing) {
      await editSet(editing, { weight, reps, backFeel: back });
      setEditing(null);
      return;
    }
    await logSet(session.id, slot.exerciseId, { weight, reps, backFeel: back, rir: null });
    setBack(null);
    if (ex.restSec > 0) setResting(true);
  }

  return (
    <main class="sess">
      <header class="sess__top">
        <button class="sess__x" onClick={onExit} aria-label="На главный">
          ✕
        </button>
        <div class="sess__nav">
          <button
            class="sess__arrow"
            disabled={exIdx === 0}
            onClick={() => setExIdx((i) => Math.max(0, i - 1))}
            aria-label="Предыдущее"
          >
            ‹
          </button>
          <span class="sess__count num">
            {exIdx + 1} / {slots.length}
          </span>
          <button
            class="sess__arrow"
            disabled={exIdx === slots.length - 1}
            onClick={() => setExIdx((i) => Math.min(slots.length - 1, i + 1))}
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

      <div class="sess__ex">
        <h1>{ex.nameRu}</h1>
        <p class="sess__target num">
          {targetStr}
          {slot.perSide ? " · каждая сторона" : ""}
        </p>
        <p class="sess__cue">{ex.cue}</p>
      </div>

      <ol class="setlist">
        {Array.from({ length: Math.max(target, done) }).map((_, i) => {
          const log = exLogs[i];
          const isCurrent = !log && i === done && !editing;
          return (
            <li
              class={`setrow ${log ? "setrow--done" : ""} ${isCurrent ? "setrow--now" : ""} ${
                editing && log?.id === editing ? "setrow--edit" : ""
              }`}
              key={log?.id ?? `p${i}`}
              onClick={
                log
                  ? () => {
                      setEditing(log.id);
                      setWeight(log.weight);
                      setReps(log.reps);
                      setBack(log.backFeel);
                      setResting(false);
                    }
                  : undefined
              }
            >
              <span class="setrow__n num">{i + 1}</span>
              {log ? (
                <span class="setrow__val num">{formatSet(load, log.weight, log.reps)}</span>
              ) : (
                <span class="setrow__val setrow__val--pending">{isCurrent ? "сейчас" : "—"}</span>
              )}
              {log?.backFeel != null ? (
                <span class={`setrow__back setrow__back--${log.backFeel}`}>спина {log.backFeel}</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div class="sess__input">
        {resting ? (
          <RestTimer seconds={ex.restSec} onDone={() => setResting(false)} />
        ) : (
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

            <div class="sess__back">
              <span class="label">спина</span>
              {[0, 1, 2].map((n) => (
                <button
                  key={n}
                  class={`backbtn backbtn--${n} ${back === n ? "backbtn--on" : ""}`}
                  onClick={() => setBack(back === n ? null : (n as 0 | 1 | 2))}
                >
                  {n}
                </button>
              ))}
            </div>

            <button class="sess__log" onClick={commit}>
              {editing ? "Сохранить" : allDone ? "Записать ещё" : `Записать подход ${done + 1}`}
            </button>

            {allDone ? (
              <button class="sess__finish" onClick={() => void finishSession(session.id).then(onFinish)}>
                Завершить тренировку
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
