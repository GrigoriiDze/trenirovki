import { useMemo, useRef, useState } from "preact/hooks";
import { BODY_FIELDS, BODY_LABELS, type BodyField, type BodyLog } from "~/db/schema";
import { useLive } from "~/lib/live";
import { putRow } from "~/db/write";
import { haptic } from "~/lib/haptic";
import { bodyHistory, fieldSeries, latestByField, prefill } from "~/body/calc";
import { ProgressChart, type ChartPoint } from "~/components/progress-chart";
import "./body.css";

const DATE = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const SHORT = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

// шаг ввода: вес — 0.1 кг, обхваты — 0.5 см
const stepOf = (f: BodyField) => (f === "weight" ? 0.1 : 0.5);
const unitOf = (f: BodyField) => (f === "weight" ? "кг" : "см");

export function Body({ onBack }: { onBack: () => void }) {
  const history = useLive(() => bodyHistory(), []);
  const [mode, setMode] = useState<"view" | "form">("view");
  const [chartField, setChartField] = useState<BodyField>("waist");

  if (!history) return <div class="boot">загрузка…</div>;

  if (mode === "form") {
    return (
      <BodyForm
        history={history}
        onDone={() => setMode("view")}
        onCancel={() => setMode("view")}
      />
    );
  }

  const now = latestByField(history, BODY_FIELDS);
  const shownFields = now.map((n) => n.field);
  const series = fieldSeries(history, chartField);
  const points: ChartPoint[] = series.map((s) => ({
    x: s.x,
    y: s.y,
    label: `${s.y} ${unitOf(chartField)}`,
  }));

  return (
    <main class="body">
      <header class="body__head">
        <button class="body__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1>Тело</h1>
        <button class="body__add" onClick={() => setMode("form")}>
          + замер
        </button>
      </header>

      {history.length === 0 ? (
        <p class="body__empty">
          Замеров пока нет. Обхваты сантиметром — раз в 3–4 недели хватит.
        </p>
      ) : (
        <>
          <p class="body__when num">
            Последний замер: {DATE.format(new Date(history[history.length - 1]!.date))}
          </p>

          <ul class="mlist">
            {now.map((n) => (
              <li class="mrow" key={n.field}>
                <span class="mrow__name">{BODY_LABELS[n.field]}</span>
                <span class="mrow__val num">
                  {n.value} {unitOf(n.field)}
                </span>
                <span class="mrow__d num">
                  {n.delta == null
                    ? "—"
                    : n.delta === 0
                      ? "0"
                      : `${n.delta > 0 ? "+" : ""}${n.delta}`}
                </span>
              </li>
            ))}
          </ul>

          {series.length >= 2 ? (
            <section class="body__chart">
              <div class="body__pick">
                {shownFields.map((f) => (
                  <button
                    key={f}
                    class={chartField === f ? "on" : ""}
                    onClick={() => setChartField(f)}
                  >
                    {BODY_LABELS[f]}
                  </button>
                ))}
              </div>
              <ProgressChart points={points} />
            </section>
          ) : null}

          {history.length > 1 ? (
            <ol class="body__log">
              {[...history].reverse().map((h) => (
                <li key={h.id} class="body__logrow num">
                  <span>{SHORT.format(new Date(h.date))}</span>
                  <span class="body__logn">
                    {BODY_FIELDS.filter((f) => h[f] != null).length} полей
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </main>
  );
}

function BodyForm({
  history,
  onDone,
  onCancel,
}: {
  history: BodyLog[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const start = useMemo(() => {
    const pre = prefill(history, BODY_FIELDS);
    // дефолты, если истории нет совсем
    const fallback: Record<BodyField, number> = {
      weight: 80, neck: 40, shoulders: 60, chest: 100, bicepsL: 35, bicepsR: 35,
      forearm: 30, wrist: 18, waist: 85, hips: 100, thigh: 58, calf: 40, ankle: 23,
    };
    const out = { ...fallback };
    for (const f of BODY_FIELDS) if (pre[f] != null) out[f] = pre[f];
    return out;
  }, [history]);

  const [vals, setVals] = useState<Record<BodyField, number>>(start);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    haptic(16);
    await putRow("bodyLogs", {
      id: crypto.randomUUID(),
      date: Date.now(),
      note: null,
      ...vals,
    });
    onDone();
  }

  return (
    <main class="body">
      <header class="body__head">
        <button class="body__back" onClick={onCancel} aria-label="Отмена">
          ✕
        </button>
        <h1>Новый замер</h1>
        <span class="body__today num">{SHORT.format(new Date())}</span>
      </header>

      <p class="body__hint">
        Значения перенесены с прошлого раза — крути только то, что изменилось.
      </p>

      <div class="mform">
        {BODY_FIELDS.map((f) => (
          <RowStepper
            key={f}
            label={BODY_LABELS[f]}
            value={vals[f]}
            step={stepOf(f)}
            unit={unitOf(f)}
            onChange={(v) => setVals((s) => ({ ...s, [f]: v }))}
          />
        ))}
      </div>

      <button class="body__save" onClick={save} disabled={saving}>
        Сохранить замер
      </button>
    </main>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function RowStepper({
  label,
  value,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const timer = useRef<number>();
  const hold = (dir: number) => {
    haptic(6);
    let acc = value;
    let delay = 320;
    const run = () => {
      acc = round2(Math.max(0, acc + dir * step));
      onChange(acc);
      haptic(4);
      delay = Math.max(50, delay * 0.82);
      timer.current = window.setTimeout(run, delay);
    };
    run();
  };
  const release = () => window.clearTimeout(timer.current);

  return (
    <div class="rstep">
      <span class="rstep__label">{label}</span>
      <button
        class="rstep__btn"
        aria-label={`${label} меньше`}
        onPointerDown={() => hold(-1)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
      >
        −
      </button>
      <span class="rstep__val num">
        {value}
        <span class="rstep__unit">{unit}</span>
      </span>
      <button
        class="rstep__btn"
        aria-label={`${label} больше`}
        onPointerDown={() => hold(1)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
      >
        +
      </button>
    </div>
  );
}
