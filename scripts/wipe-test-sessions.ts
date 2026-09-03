/* Разовая уборка: удалить незавершённые/тестовые сессии из Neon.
   `npx tsx --env-file=.env scripts/wipe-test-sessions.ts [sessionId ...]`
   Без аргументов — удаляет все сессии с finished_at IS NULL (брошенные). */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const ids = process.argv.slice(2);

const targets = ids.length
  ? ids.map((id) => ({ id }))
  : await sql`select id from sessions where finished_at is null`;

for (const { id } of targets) {
  await sql`delete from set_logs where session_id = ${id}`;
  await sql`delete from sessions where id = ${id}`;
  console.log("удалена сессия", id);
}
console.log(`готово, удалено ${targets.length}`);
