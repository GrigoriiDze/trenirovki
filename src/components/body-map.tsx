import { useState } from "preact/hooks";
import type { MuscleGroup } from "~/db/schema";
import "./body-map.css";

type Shape =
  | { k: "e"; cx: number; cy: number; rx: number; ry: number }
  | { k: "r"; x: number; y: number; w: number; h: number; rx: number };

interface Part {
  muscle: MuscleGroup;
  shapes: Shape[];
}

const e = (cx: number, cy: number, rx: number, ry: number): Shape => ({ k: "e", cx, cy, rx, ry });
const r = (x: number, y: number, w: number, h: number, rx = 5): Shape => ({ k: "r", x, y, w, h, rx });

// Стилизованная фигура, не анатомический атлас — виевбокс 0 0 100 220,
// левое/правое зеркально несут одно и то же значение (данные не по сторонам).
const FRONT: Part[] = [
  { muscle: "передняя дельта", shapes: [e(27, 38, 8, 9), e(73, 38, 8, 9)] },
  { muscle: "средняя дельта", shapes: [e(17, 43, 5, 8), e(83, 43, 5, 8)] },
  { muscle: "грудь", shapes: [r(33, 33, 34, 23, 7)] },
  { muscle: "бицепс", shapes: [r(13, 49, 10, 27, 5), r(77, 49, 10, 27, 5)] },
  { muscle: "кор", shapes: [r(35, 58, 30, 29, 6)] },
  { muscle: "квадрицепс", shapes: [r(29, 92, 13, 54, 5), r(58, 92, 13, 54, 5)] },
  { muscle: "приводящие", shapes: [r(42, 92, 6, 40, 3), r(52, 92, 6, 40, 3)] },
];
const FRONT_NEUTRAL: Shape[] = [
  e(50, 15, 10, 10), // голова
  r(44, 24, 12, 8, 3), // шея
  r(29, 148, 13, 42, 6), // левая голень+стопа
  r(58, 148, 13, 42, 6), // правая
  r(30, 88, 40, 6, 3), // таз-перемычка
];

const BACK: Part[] = [
  { muscle: "трапеция", shapes: [r(37, 25, 26, 19, 6)] },
  { muscle: "верх спины", shapes: [r(33, 44, 34, 18, 6)] },
  { muscle: "широчайшие", shapes: [r(23, 48, 14, 29, 6), r(63, 48, 14, 29, 6)] },
  { muscle: "задняя дельта", shapes: [e(22, 40, 7, 8), e(78, 40, 7, 8)] },
  { muscle: "трицепс", shapes: [r(12, 50, 10, 27, 5), r(78, 50, 10, 27, 5)] },
  { muscle: "поясница", shapes: [r(39, 77, 22, 14, 5)] },
  { muscle: "ягодицы", shapes: [r(31, 91, 38, 18, 8)] },
  { muscle: "бицепс бедра", shapes: [r(29, 109, 17, 36, 6), r(54, 109, 17, 36, 6)] },
  { muscle: "икры", shapes: [r(31, 148, 14, 42, 6), r(55, 148, 14, 42, 6)] },
];
const BACK_NEUTRAL: Shape[] = [
  e(50, 15, 10, 10),
  r(44, 24, 12, 8, 3),
  r(30, 88, 40, 4, 2),
];

function shapeEl(s: Shape, fill: string, onClick?: () => void) {
  if (s.k === "e") {
    return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={fill} onClick={onClick} />;
  }
  return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={fill} onClick={onClick} />;
}

/** Заливка по объёму: 0 — нейтральный тон, дальше один hue (accent) —
 *  светлее-темнее долей от верхней границы коридора (sequential, не радуга). */
function fillFor(sets: number, band: [number, number]): string {
  if (sets <= 0) return "var(--surface-2)";
  const pct = Math.max(0.22, Math.min(1, sets / band[1]));
  return `color-mix(in srgb, var(--accent) ${Math.round(pct * 100)}%, var(--surface-2))`;
}

function Figure({
  parts,
  neutral,
  data,
  selected,
  onSelect,
}: {
  parts: Part[];
  neutral: Shape[];
  data: Map<MuscleGroup, { sets: number; band: [number, number] }>;
  selected: MuscleGroup | null;
  onSelect: (m: MuscleGroup) => void;
}) {
  return (
    <svg viewBox="0 0 100 220" class="bmap__fig" role="img" aria-label="Карта тела">
      {neutral.map((s, i) => (
        <g key={`n${i}`} class="bmap__neutral">
          {shapeEl(s, "var(--surface-2)")}
        </g>
      ))}
      {parts.map((p) => {
        const d = data.get(p.muscle);
        return (
          <g key={p.muscle} class={`bmap__part ${selected === p.muscle ? "bmap__part--on" : ""}`}>
            {/* клик на каждой фигуре отдельно — общий <g> дал бы кликабельный
                прямоугольник по обеим сторонам сразу (bbox L+R), перехватывая
                тапы по соседним зонам в промежутке */}
            {p.shapes.map((s, i) => (
              <g key={i} onClick={() => onSelect(p.muscle)}>
                {shapeEl(s, fillFor(d?.sets ?? 0, d?.band ?? [1, 1]))}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function BodyMap({ data }: { data: { muscle: MuscleGroup; sets: number; band: [number, number] }[] }) {
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  const map = new Map(data.map((d) => [d.muscle, { sets: d.sets, band: d.band }]));
  const sel = selected ? data.find((d) => d.muscle === selected) : null;
  const refBand = data[0]?.band ?? ([4, 10] as [number, number]); // для образца в легенде

  return (
    <div class="bmap">
      <div class="bmap__row">
        <div class="bmap__col">
          <Figure parts={FRONT} neutral={FRONT_NEUTRAL} data={map} selected={selected} onSelect={setSelected} />
          <span class="bmap__label">спереди</span>
        </div>
        <div class="bmap__col">
          <Figure parts={BACK} neutral={BACK_NEUTRAL} data={map} selected={selected} onSelect={setSelected} />
          <span class="bmap__label">сзади</span>
        </div>
      </div>

      <p class="bmap__caption">
        {sel ? (
          <>
            <b>{sel.muscle}</b> · {sel.sets} {sel.sets === 1 ? "подход" : "подходов"}
            {sel.sets < sel.band[0] ? " · ниже ориентира" : ""}
          </>
        ) : (
          "Тронь зону — покажу подходы за период"
        )}
      </p>

      <div class="bmap__legend">
        <span class="bmap__sw" style={{ background: "var(--surface-2)" }} /> не грузится
        <span class="bmap__sw" style={{ background: fillFor(refBand[0] - 1, refBand) }} /> мало
        <span class="bmap__sw" style={{ background: fillFor(refBand[1], refBand) }} /> в коридоре
      </div>
    </div>
  );
}
