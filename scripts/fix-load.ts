/* Разовый фикс: проставить exercises.load в Neon по канону из program-v1.
   `npx tsx --env-file=.env scripts/fix-load.ts`
   Понадобился, потому что колонка добавлена с DEFAULT 'weight', а корректные
   значения (bw/time) живут в коде. Дальше клиенты подтянут через синк. */

import { eq } from "drizzle-orm";
import { getDb, schema } from "../api/_lib/db.js";
import { EXERCISES } from "../src/data/program-v1.js";

const db = getDb();
const now = Date.now();

for (const e of EXERCISES) {
  const load = e.load ?? "weight";
  await db
    .update(schema.exercises)
    .set({ load, updatedAt: now })
    .where(eq(schema.exercises.id, e.id));
  console.log(e.id, "→", load);
}
console.log("done");
