import { useRef, useState } from "preact/hooks";
import { haptic } from "~/lib/haptic";
import "./stepper.css";

interface Props {
  label: string;
  value: number;
  step: number;
  min?: number;
  unit?: string;
  onChange: (v: number) => void;
}

const round = (n: number) => Math.round(n * 100) / 100;
const tick = () => haptic(4);

/** Ввод без клавиатуры: ±кнопки (удержание = автоповтор с ускорением) +
 *  протаскивание пальцем по числу влево-вправо. */
export function Stepper({ label, value, step, min = 0, unit, onChange }: Props) {
  const timer = useRef<number>();
  const drag = useRef<{ x: number; v: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const hold = (dir: number) => {
    haptic(6);
    let acc = value;
    let delay = 300;
    const run = () => {
      acc = Math.max(min, round(acc + dir * step));
      onChange(acc);
      tick();
      delay = Math.max(45, delay * 0.8);
      timer.current = window.setTimeout(run, delay);
    };
    run();
  };
  const release = () => window.clearTimeout(timer.current);

  const dragStart = (e: PointerEvent) => {
    drag.current = { x: e.clientX, v: value };
    setDragging(true);
    haptic(6);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const dragMove = (e: PointerEvent) => {
    if (!drag.current) return;
    const steps = Math.round((e.clientX - drag.current.x) / 14);
    const next = Math.max(min, round(drag.current.v + steps * step));
    if (next !== value) {
      onChange(next);
      tick();
    }
  };
  const dragEnd = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div class={`stepper ${dragging ? "stepper--drag" : ""}`}>
      <span class="stepper__label label">{label}</span>
      <div class="stepper__row">
        <button
          class="stepper__btn"
          aria-label={`${label} меньше`}
          onPointerDown={() => hold(-1)}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
        >
          −
        </button>
        <span
          class="stepper__value num"
          onPointerDown={dragStart}
          onPointerMove={dragMove}
          onPointerUp={dragEnd}
          onPointerCancel={dragEnd}
        >
          {value}
          {unit ? <span class="stepper__unit">{unit}</span> : null}
          <span class="stepper__grip" aria-hidden="true" />
        </span>
        <button
          class="stepper__btn"
          aria-label={`${label} больше`}
          onPointerDown={() => hold(1)}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
        >
          +
        </button>
      </div>
    </div>
  );
}
