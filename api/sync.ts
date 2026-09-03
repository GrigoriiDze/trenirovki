/* Единственная точка синхронизации. POST /api/sync
   Auth: Authorization: Bearer <APP_TOKEN>

   Запрос:  { since: number, push?: { [table]: Row[] } }
   Ответ:   { now: number, pull: { [table]: Row[] } }

   push — upsert по первичному ключу (last-write-wins, один пользователь).
   pull — все строки с updated_at > since, включая deleted:true. */

import { gt } from "drizzle-orm";
import { db, schema } from "../src/server/db.ts";

const TABLES = {
  exercises: schema.exercises,
  programVersions: schema.programVersions,
  programSlots: schema.programSlots,
  sessions: schema.sessions,
  setLogs: schema.setLogs,
} as const;

type TableName = keyof typeof TABLES;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function POST(request: Request): Promise<Response> {
  const token = process.env.APP_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { since?: number; push?: Partial<Record<TableName, Record<string, unknown>[]>> };
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const since = typeof body.since === "number" ? body.since : 0;
  const push = body.push ?? {};

  // ── PUSH ──────────────────────────────────────────────
  for (const name of Object.keys(TABLES) as TableName[]) {
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

  // ── PULL ──────────────────────────────────────────────
  const pull: Record<TableName, unknown[]> = {
    exercises: [],
    programVersions: [],
    programSlots: [],
    sessions: [],
    setLogs: [],
  };
  for (const name of Object.keys(TABLES) as TableName[]) {
    const table = TABLES[name];
    pull[name] = await db.select().from(table).where(gt(table.updatedAt, since));
  }

  return json({ now: Date.now(), pull });
}

export function GET(): Response {
  return json({ error: "use POST" }, 405);
}
