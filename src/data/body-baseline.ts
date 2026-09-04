/* Первый замер Григория — 5.12.2025 (context/08-telo-zamery.md).
   Сидится один раз (фикс. id), дальше уезжает в Neon синком.
   «+1–2 см к 22.01.2026» — оценка без точных цифр, отдельной записью не заводим. */

import type { BodyLog } from "~/db/schema";

export const BODY_BASELINE: Omit<BodyLog, "updatedAt" | "deleted"> = {
  id: "body-2025-12-05",
  date: new Date(2025, 11, 5, 12, 0, 0).getTime(),
  note: "Первый замер. К 22.01.2026 Григорий отметил +1–2 см почти везде (точных цифр нет).",
  weight: null,
  neck: 41,
  shoulders: 64, // фронтальная ширина плеч, не обхват
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
};
