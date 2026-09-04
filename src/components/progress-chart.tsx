import { useState } from "preact/hooks";
import "./progress-chart.css";

export interface ChartPoint {
  x: number; // epoch ms
  y: number;
  label: string; // «40 × 10» — показывается по тапу
  pr?: boolean;
}

/** Мини-график одной серии во времени. Тап по точке — подпись.
 *  Тема — через токены (var(--accent) / var(--text-3)). */
export function ProgressChart({ points }: { points: ChartPoint[] }) {
  const [sel, setSel] = useState<number | null>(null);

  if (points.length < 2) {
    return <p class="chart__empty">Мало данных для графика — нужно хотя бы две тренировки.</p>;
  }

  const W = 320;
  const H = 120;
  const PAD = { l: 8, r: 8, t: 14, b: 16 };

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const yPad = (y1 - y0) * 0.15 || 1;

  const px = (x: number) =>
    PAD.l + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
  const py = (y: number) =>
    H - PAD.b - ((y - (y0 - yPad)) / (y1 + yPad - (y0 - yPad))) * (H - PAD.t - PAD.b);

  const d = points.map((p, i) => `${i ? "L" : "M"}${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join(" ");
  const last = points[points.length - 1]!;

  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

  return (
    <figure class="chart">
      <svg viewBox={`0 0 ${W} ${H}`} class="chart__svg" role="img" aria-label="График прогресса">
        {/* базовая линия */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} class="chart__axis" />
        <path d={d} class="chart__line" fill="none" />
        {points.map((p, i) => (
          <g
            key={i}
            onClick={() => setSel(sel === i ? null : i)}
            class={`chart__pt ${p.pr ? "chart__pt--pr" : ""} ${sel === i ? "chart__pt--sel" : ""}`}
          >
            {/* невидимая крупная зона нажатия */}
            <circle cx={px(p.x)} cy={py(p.y)} r="12" fill="transparent" />
            <circle cx={px(p.x)} cy={py(p.y)} r={p.pr ? 3.5 : 2.5} class="chart__dot" />
          </g>
        ))}
        {/* подпись последней точки */}
        <text x={px(last.x)} y={py(last.y) - 6} class="chart__last" text-anchor="end">
          {last.label}
        </text>
        {sel !== null && sel !== points.length - 1 ? (
          <text
            x={Math.min(W - PAD.r, Math.max(PAD.l + 30, px(points[sel]!.x)))}
            y={py(points[sel]!.y) - 6}
            class="chart__tip"
            text-anchor="middle"
          >
            {points[sel]!.label}
          </text>
        ) : null}
      </svg>
      <figcaption class="chart__cap num">
        {fmt.format(new Date(x0))} — {fmt.format(new Date(x1))}
      </figcaption>
    </figure>
  );
}
