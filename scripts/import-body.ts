/* Разовая заливка исторической базы замеров (context/08) в Neon.
   Обычно не нужна — клиент сам сидит `body-2025-12-05` (src/db/seed.ts
   seedBody) и пушит наверх. Скрипт полезен, чтобы освежить updatedAt,
   если устройство пропустило строку из-за закладки синка.
   Запуск: npx tsx --env-file=.env scripts/import-body.ts
*/

import { getDb, schema } from "../api/_lib/db.ts";
import { BODY_BASELINE } from "../src/data/body-baseline.ts";

const row = { ...BODY_BASELINE, updatedAt: Date.now(), deleted: false };

const db = getDb();
await db
  .insert(schema.bodyLogs)
  .values(row as never)
  .onConflictDoUpdate({ target: schema.bodyLogs.id, set: row as never });

console.log(`Залито в Neon: замер ${new Date(row.date).toISOString().slice(0, 10)}, updatedAt освежён.`);
