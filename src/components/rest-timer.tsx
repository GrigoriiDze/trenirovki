import { useEffect, useRef, useState } from "preact/hooks";
import "./rest-timer.css";

/** Отсчёт отдыха. Не персистится: ушёл и вернулся — отдых наверняка кончился. */
export function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  const start = useRef(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const l = Math.ceil((seconds * 1000 - (Date.now() - start.current)) / 1000);
      setLeft(l);
      if (l <= 0) {
        window.clearInterval(id);
        navigator.vibrate?.(180);
        onDone();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [seconds, onDone]);

  const pct = Math.max(0, Math.min(100, (left / seconds) * 100));

  return (
    <div class="rest">
      <div class="rest__bar" style={{ width: `${pct}%` }} />
      <div class="rest__body">
        <span class="rest__num num">{Math.max(0, left)}</span>
        <span class="rest__label">отдых</span>
        <button class="rest__skip" onClick={onDone}>
          пропустить
        </button>
      </div>
    </div>
  );
}
