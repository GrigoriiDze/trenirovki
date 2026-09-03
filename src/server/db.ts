/* Подключение к Neon для API-функций (Vercel, serverless).
   Ленивая инициализация — чтобы отсутствие DATABASE_URL давало понятную
   ошибку в ответе, а не падение при загрузке модуля. */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.ts";

export { schema };

type DB = ReturnType<typeof drizzle<typeof schema>>;
let _db: DB | null = null;

export function getDb(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан в окружении");
  _db = drizzle(neon(url), { schema });
  return _db;
}
