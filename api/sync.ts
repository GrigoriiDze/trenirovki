/* Единственная точка синхронизации. POST /api/sync
   Auth: Authorization: Bearer <APP_TOKEN>

   Запрос:  { since: number, push?: { [table]: Row[] } }
   Ответ:   { now: number, pull: { [table]: Row[] } }

   push — upsert по первичному ключу (last-write-wins, один пользователь).
   pull — все строки с updated_at > since, включая deleted:true.

   Расширения .js в относительных импортах обязательны: Vercel держит
   "type":"module", ESM-Node без расширения не резолвит скомпилированный код. */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { gt } from "drizzle-orm";
import { getDb, schema } from "./_lib/db.js";

const TABLES = {
  exercises: schema.exercises,
  programVersions: schema.programVersions,
  programSlots: schema.programSlots,
  sessions: schema.sessions,
  sessionExercises: schema.sessionExercises,
  setLogs: schema.setLogs,
} as const;

type TableName = keyof typeof TABLES;
const NAMES = Object.keys(TABLES) as TableName[];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "use POST" });
    return;
  }
  const token = process.env.APP_TOKEN;
  if (!token || req.headers.authorization !== `Bearer ${token}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
    const since = typeof body.since === "number" ? body.since : 0;
    const push: Partial<Record<TableName, Record<string, unknown>[]>> = body.push ?? {};

    const db = getDb();

    for (const name of NAMES) {
      const rows = push[name];
      if (!rows?.length) continue;
      const table = TABLES[name];
      for (const row of rows) {
        await db
          .insert(table)
          .values(row as never)
          .onConflictDoUpdate({ target: table.id, set: row as never });
      }
    }

    const pull = {} as Record<TableName, unknown[]>;
    for (const name of NAMES) {
      pull[name] = await db.select().from(TABLES[name]).where(gt(TABLES[name].updatedAt, since));
    }

    res.status(200).json({ now: Date.now(), pull });
  } catch (e) {
    console.error("sync error", e);
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
