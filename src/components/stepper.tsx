import { useRef } from "preact/hooks";
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

/** Крупные зоны нажатия, удержание = автоповтор с ускорением. Без клавиатуры. */
export function Stepper({ label, value, step, min = 0, unit, onChange }: Props) {
  const timer = useRef<number>();

  const hold = (dir: number) => {
    let acc = value;
    let delay = 300;
    const tick = () => {
      acc = Math.max(min, round(acc + dir * step));
      onChange(acc);
      delay = Math.max(45, delay * 0.8);
      timer.current = window.setTimeout(tick, delay);
    };
    tick();
  };
  const release = () => window.clearTimeout(timer.current);

  return (
    <div class="stepper">
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
        <span class="stepper__value num">
          {value}
          {unit ? <span class="stepper__unit">{unit}</span> : null}
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
