/* Проверка api/sync против живой БД. `npm run test:sync` (tsx).
   Пишет и удаляет строку с id "__test__". */

import { eq } from "drizzle-orm";
import handler from "../api/sync";
import { getDb, schema } from "../api/_lib/db";

const TOKEN = process.env.APP_TOKEN;

interface Res {
  statusCode: number;
  _body: { pull: Record<string, { id: string; updatedAt: number }[]> } | null;
  status: (c: number) => Res;
  json: (o: unknown) => Res;
}
function mockRes(): Res {
  const res = { statusCode: 200, _body: null } as Res;
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (o) => ((res._body = o as Res["_body"]), res);
  return res;
}
async function call(body: unknown, token = TOKEN) {
  const req = {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body,
  };
  const res = mockRes();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (handler as any)(req, res);
  return res;
}

let r = await call({}, "wrong");
console.log("1. wrong token →", r.statusCode, "(ждём 401)");

r = await call({ since: 0 });
console.log(
  "2. empty pull →",
  Object.fromEntries(Object.entries(r._body!.pull).map(([k, v]) => [k, v.length])),
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
const got = r._body!.pull.exercises.find((e) => e.id === "__test__");
console.log("3. push+pull →", got ? `ок, updatedAt=${got.updatedAt}` : "НЕ НАЙДЕНО");

r = await call({ since: now + 1000 });
console.log("4. pull since future →", r._body!.pull.exercises.length, "(ждём 0)");

await getDb().delete(schema.exercises).where(eq(schema.exercises.id, "__test__"));
console.log("5. cleaned up");
