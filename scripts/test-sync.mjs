/* Проверка api/sync против живой БД. `node --env-file=.env scripts/test-sync.mjs`
   Пишет и удаляет строку с id "__test__". */

import { POST } from "../api/sync.ts";
import { db, schema } from "../src/server/db.ts";
import { eq } from "drizzle-orm";

const TOKEN = process.env.APP_TOKEN;
const call = (body, token = TOKEN) =>
  POST(
    new Request("http://x/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  );

let r = await call({}, "wrong");
console.log("1. wrong token →", r.status, "(ждём 401)");

r = await call({ since: 0 });
let j = await r.json();
console.log(
  "2. empty pull →",
  Object.fromEntries(Object.entries(j.pull).map(([k, v]) => [k, v.length])),
);

const now = Date.now();
r = await call({
  since: 0,
  push: {
    exercises: [
      {
        id: "__test__",
        nameRu: "Тест",
        nameEn: "test",
        muscle: "x",
        equipment: "x",
        rom: "full",
        cue: "",
        restSec: 60,
        gifUrl: null,
        updatedAt: now,
        deleted: false,
      },
    ],
  },
});
j = await r.json();
const got = j.pull.exercises.find((e) => e.id === "__test__");
console.log("3. push+pull →", got ? `ок, updatedAt=${got.updatedAt}` : "НЕ НАЙДЕНО");

r = await call({ since: now + 1000 });
j = await r.json();
console.log("4. pull since future →", j.pull.exercises.length, "(ждём 0)");

await db.delete(schema.exercises).where(eq(schema.exercises.id, "__test__"));
console.log("5. cleaned up");
