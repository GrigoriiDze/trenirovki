/* Заливка справочника и программы v1 в локальную БД. Идемпотентно:
   гоняется при каждом старте, пишет только если версии v1 ещё нет.
   Дальше эти строки уедут в Neon через синк. */

import { db } from "~/db/schema";
import { putRows } from "~/db/write";
import {
  DAYS,
  EXERCISES,
  PROGRAM_NAME,
  PROGRAM_VERSION_ID,
} from "~/data/program-v1";

export async function seedIfNeeded(): Promise<void> {
  const existing = await db.programVersions.get(PROGRAM_VERSION_ID);
  if (existing) return;

  await putRows(
    "exercises",
    EXERCISES.map((e) => ({ ...e, gifUrl: e.gifUrl ?? null })),
  );

  await putRows("programVersions", [
    {
      id: PROGRAM_VERSION_ID,
      programName: PROGRAM_NAME,
      createdAt: Date.now(),
      active: true,
      note: "Стартовая программа. Источник — context/03-programma-abc.md",
    },
  ]);

  const slots = Object.entries(DAYS).flatMap(([day, seeds]) =>
    seeds.map((s, i) => ({
      id: `${PROGRAM_VERSION_ID}:${day}:${i + 1}`,
      versionId: PROGRAM_VERSION_ID,
      day,
      ord: i + 1,
      exerciseId: s.exerciseId,
      targetSets: s.targetSets,
      repLow: s.repLow,
      repHigh: s.repHigh,
      perSide: s.perSide ?? false,
      origin: s.origin,
    })),
  );
  await putRows("programSlots", slots);
}
