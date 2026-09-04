/* Заливка справочника и программы v1 в локальную БД. Идемпотентно:
   гоняется при каждом старте, пишет только если версии v1 ещё нет.
   Дальше эти строки уедут в Neon через синк. */

import { db } from "~/db/schema";
import { putRow, putRows } from "~/db/write";
import {
  DAYS,
  EXERCISES,
  PROGRAM_NAME,
  PROGRAM_VERSION_ID,
} from "~/data/program-v1";
import { EXERCISES_EXTRA } from "~/data/exercises-extra";
import { BODY_BASELINE } from "~/data/body-baseline";

export async function seedIfNeeded(): Promise<void> {
  const existing = await db.programVersions.get(PROGRAM_VERSION_ID);
  if (existing) return;

  await putRows(
    "exercises",
    [...EXERCISES, ...EXERCISES_EXTRA].map((e) => ({
      ...e,
      gifUrl: e.gifUrl ?? null,
      load: e.load ?? "weight",
    })),
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

/* Справочник = канон в коде. seedIfNeeded заливает его один раз при
   первом запуске; для уже засиденных баз новые упражнения из кода
   добавляем здесь (только отсутствующие — свои правки не трогаем).
   Гоняется каждый старт после seedIfNeeded. */
export async function syncCatalog(): Promise<void> {
  const all = [...EXERCISES, ...EXERCISES_EXTRA];
  const present = new Set(
    (await db.exercises.bulkGet(all.map((e) => e.id))).filter(Boolean).map((e) => e!.id),
  );
  const missing = all.filter((e) => !present.has(e.id));
  if (missing.length) {
    await putRows(
      "exercises",
      missing.map((e) => ({ ...e, gifUrl: e.gifUrl ?? null, load: e.load ?? "weight" })),
    );
  }
}

/* Первый замер тела. get() возвращает и мягко удалённые — если Григорий
   удалит запись, назад не воскреснет. Гоняется каждый старт. */
export async function seedBody(): Promise<void> {
  if (await db.bodyLogs.get(BODY_BASELINE.id)) return;
  await putRow("bodyLogs", BODY_BASELINE);
}
