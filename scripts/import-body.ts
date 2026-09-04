/* Разовая заливка исторической базы замеров Григория (context/08) в Neon.
   Одна запись — 5.12.2025. Синкнётся на устройство при заходе.
   Идемпотентно (фикс. id). Запуск: npx tsx --env-file=.env scripts/import-body.ts
*/

import { getDb, schema } from "../api/_lib/db.ts";

const BASELINE = {
  id: "body-2025-12-05",
  date: new Date(2025, 11, 5, 12, 0, 0).getTime(),
  note: "Первый замер. К 22.01.2026 Григорий отметил +1–2 см почти везде (точных цифр нет).",
  weight: null,
  neck: 41,
  shoulders: 64, // фронтальная ширина от середины плеча до середины плеча
  chest: 103,
  bicepsL: 37,
  bicepsR: 38,
  forearm: 31,
  wrist: 19.5,
  waist: 81,
  hips: 101, // с ягодицами
  thigh: 61,
  calf: 40.5,
  ankle: 24,
  updatedAt: Date.now(),
  deleted: false,
};

const db = getDb();
await db
  .insert(schema.bodyLogs)
  .values(BASELINE as never)
  .onConflictDoUpdate({ target: schema.bodyLogs.id, set: BASELINE as never });

console.log("Залито в Neon: 1 замер (5.12.2025).");
