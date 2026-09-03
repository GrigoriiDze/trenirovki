/* Подключение к Neon для API-функций (Vercel, serverless).
   @neondatabase/serverless — по HTTP, без пула соединений. */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL не задан");

export const db = drizzle(neon(url), { schema });
export { schema };
