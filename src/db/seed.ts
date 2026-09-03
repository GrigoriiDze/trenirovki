/* Заливка справочника и программы v1 в БД. Идемпотентно: гоняется при
   каждом старте, но пишет только если версии v1 ещё нет. */

import { db } from "~/db/schema";
import type { ProgramSlot } from "~/db/schema";
import {
  DAYS,
  EXERCISES,
  PROGRAM_NAME,
  PROGRAM_VERSION_ID,
} from "~/data/program-v1";

export async function seedIfNeeded(): Promise<void> {
  const existing = await db.programVersions.get(PROGRAM_VERSION_ID);
  if (existing) return;

  const slots: ProgramSlot[] = [];
  for (const [day, seeds] of Object.entries(DAYS)) {
    seeds.forEach((s, i) => {
      const order = i + 1;
      slots.push({
        id: `${PROGRAM_VERSION_ID}:${day}:${order}`,
        versionId: PROGRAM_VERSION_ID,
        day: day as ProgramSlot["day"],
        order,
        exerciseId: s.exerciseId,
        targetSets: s.targetSets,
        repLow: s.repLow,
        repHigh: s.repHigh,
        perSide: s.perSide ?? false,
        origin: s.origin,
      });
    });
  }

  await db.transaction("rw", db.exercises, db.programVersions, db.programSlots, async () => {
    await db.exercises.bulkPut(EXERCISES);
    await db.programVersions.put({
      id: PROGRAM_VERSION_ID,
      programName: PROGRAM_NAME,
      createdAt: Date.now(),
      active: true,
      note: "Стартовая программа. Источник — context/03-programma-abc.md",
    });
    await db.programSlots.bulkPut(slots);
  });
}
