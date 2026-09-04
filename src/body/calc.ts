/* Замеры тела — выборки для экрана «Тело». Поверх bodyLogs, ничего не хранится. */

import { db, type BodyField, type BodyLog } from "~/db/schema";

export async function bodyHistory(): Promise<BodyLog[]> {
  const rows = await db.bodyLogs.filter((b) => !b.deleted).toArray();
  return rows.sort((a, b) => a.date - b.date);
}

/** Последнее значение поля + дельта к предыдущему замеру, где оно было. */
export interface FieldNow {
  field: BodyField;
  value: number;
  delta: number | null; // null — предыдущего значения нет
  date: number;
}

export function latestByField(history: BodyLog[], fields: readonly BodyField[]): FieldNow[] {
  const out: FieldNow[] = [];
  for (const field of fields) {
    const withVal = history.filter((h) => h[field] != null) as (BodyLog & Record<BodyField, number>)[];
    if (!withVal.length) continue;
    const last = withVal[withVal.length - 1]!;
    const prev = withVal.length > 1 ? withVal[withVal.length - 2]! : null;
    out.push({
      field,
      value: last[field],
      delta: prev ? Math.round((last[field] - prev[field]) * 10) / 10 : null,
      date: last.date,
    });
  }
  return out;
}

/** Ряд значений поля во времени для графика. */
export function fieldSeries(
  history: BodyLog[],
  field: BodyField,
): { x: number; y: number }[] {
  return history
    .filter((h) => h[field] != null)
    .map((h) => ({ x: h.date, y: h[field] as number }));
}

/** Значения последнего замера как заготовка формы (переносим вперёд). */
export function prefill(history: BodyLog[], fields: readonly BodyField[]): Record<BodyField, number> {
  const last = history[history.length - 1];
  const def: Partial<Record<BodyField, number>> = {};
  for (const f of fields) {
    const fromLast = last?.[f];
    if (fromLast != null) def[f] = fromLast;
  }
  return def as Record<BodyField, number>;
}
