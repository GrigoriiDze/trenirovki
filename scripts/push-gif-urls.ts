/* Разовая догрузка gifUrl в Neon для существующих строк exercises —
   без этого клиентский syncCatalog() тоже справится (patchRow бампает
   updatedAt и уедет в push), но не ждём следующего открытия приложения.
   Идемпотентно. Запуск: npx tsx --env-file=.env scripts/push-gif-urls.ts */

import { eq } from "drizzle-orm";
import { getDb, schema } from "../api/_lib/db.ts";
import { EXERCISES } from "../src/data/program-v1.ts";
import { EXERCISES_EXTRA } from "../src/data/exercises-extra.ts";

const withGif = [...EXERCISES, ...EXERCISES_EXTRA].filter((e) => e.gifUrl);
const db = getDb();
let n = 0;
for (const e of withGif) {
  const res = await db
    .update(schema.exercises)
    .set({ gifUrl: e.gifUrl, updatedAt: Date.now() })
    .where(eq(schema.exercises.id, e.id));
  n++;
}
console.log(`Обновлено gifUrl в Neon: ${n} упражнений.`);
