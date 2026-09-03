import type { Load } from "~/db/schema";

/** Короткая запись подхода под режим ввода. */
export function formatSet(load: Load, weight: number, reps: number): string {
  if (load === "time") return `${reps} сек`;
  if (load === "bw") return `× ${reps}`;
  return `${weight} × ${reps}`;
}
