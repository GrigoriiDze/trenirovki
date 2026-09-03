/* Проверка api/sync против живой БД. `npm run test:sync`
   Пишет и удаляет строку с id "__test__". */

import handler from "../api/sync.ts";
import { getDb, schema } from "../src/server/db.ts";
import { eq } from "drizzle-orm";

const TOKEN = process.env.APP_TOKEN;

function mockRes() {
  const res = { statusCode: 200, _body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (o) => ((res._body = o), res);
  return res;
}
async function call(body, token = TOKEN) {
  const req = {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body,
  };
  const res = mockRes();
  await handler(req, res);
  return res;
}

let r = await call({}, "wrong");
console.log("1. wrong token →", r.statusCode, "(ждём 401)");

r = await call({ since: 0 });
console.log(
  "2. empty pull →",
  Object.fromEntries(Object.entries(r._body.pull).map(([k, v]) => [k, v.length])),
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
const got = r._body.pull.exercises.find((e) => e.id === "__test__");
console.log("3. push+pull →", got ? `ок, updatedAt=${got.updatedAt}` : "НЕ НАЙДЕНО");

r = await call({ since: now + 1000 });
console.log("4. pull since future →", r._body.pull.exercises.length, "(ждём 0)");

await getDb().delete(schema.exercises).where(eq(schema.exercises.id, "__test__"));
console.log("5. cleaned up");
