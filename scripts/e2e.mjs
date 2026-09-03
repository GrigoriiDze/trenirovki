/* Прогон потока тренировки в браузере: unlock → день → старт → запись
   подхода → таймер → завершение → итог + синк. Чистит за собой в Neon.
   Скриншоты в shots/e2e-*. Требует `npm run dev` и `npm run dev:api`.
   `npm run test:e2e` */

import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";

const TOKEN = process.env.APP_TOKEN;
const BASE = "http://localhost:5173";
const OUT = `${import.meta.dirname}/../shots`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));

const step = (n, msg) => console.log(`${n}. ${msg}`);
const testStart = Date.now(); // чистим только сессии, созданные в этом прогоне

await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill(".unlock__input", TOKEN);
await page.click(".unlock .btn--primary");
await page.waitForSelector(".home");
step(1, "вход + главный");

await page.click(".card--today");
await page.waitForSelector(".today");
await page.screenshot({ path: `${OUT}/e2e-today.png` });
// проверить переключатель дня
await page.click(".daychip:has-text('C')");
await page.waitForFunction(() => document.querySelector(".today__title h1")?.textContent?.includes("C"));
await page.click(".daychip:has-text('A')");
step(2, "переключатель дня A/B/C работает");
await page.click(".today__cta .btn--primary");
await page.waitForSelector(".sess");
step(3, "старт тренировки → экран сессии");
await page.screenshot({ path: `${OUT}/e2e-session.png` });

// поднять число степпером и записать подход
await page.locator(".sess__steppers .stepper").first().locator(".stepper__btn").last().click({ clickCount: 4 });
await page.click(".sess__log");
await page.waitForSelector(".rest", { timeout: 3000 });
step(4, "подход записан → таймер отдыха");
await page.screenshot({ path: `${OUT}/e2e-rest.png` });

await page.click(".rest__skip");
await page.waitForSelector(".sess__log");
const doneRows = await page.locator(".setrow--done").count();
step(5, `после отдыха: записанных подходов = ${doneRows}`);

// проверить, что подход реально в БД
const inDb = await page.evaluate(async () => {
  const req = indexedDB.open("trenirovki");
  return new Promise((res) => {
    req.onsuccess = () => {
      const tx = req.result.transaction("setLogs", "readonly");
      const all = tx.objectStore("setLogs").getAll();
      all.onsuccess = () => res(all.result.length);
    };
  });
});
step(6, `setLogs в IndexedDB: ${inDb}`);

// завершить
await page.click(".sess__end"); // "завершить"
await page.click(".sess__end"); // "точно?"
await page.waitForSelector(".sum");
step(7, "завершение → итог");
await page.screenshot({ path: `${OUT}/e2e-summary.png` });

await page.click(".sum .btn--primary");
await page.waitForSelector(".home");
step(8, "вернулись на главный");

// вторая тренировка того же дня → должно появиться «было»
await page.click(".card--today");
await page.waitForSelector(".today");
await page.click(".daychip:has-text('A')");
await page.click(".today__cta .btn--primary");
await page.waitForSelector(".sess");
const wasHints = await page.locator(".setrow__was").count();
step(9, `«было» подсказок на 2-й тренировке: ${wasHints}`);
await page.click(".sess__x"); // выйти, не записывая

// дневник
await page.click(".tile--on");
await page.waitForSelector(".diary");
const diaryRows = await page.locator(".drow").count();
step(10, `дневник: ${diaryRows} тренировк(и)`);
await page.locator(".drow__head").first().click();
await page.waitForSelector(".drow__body");
await page.screenshot({ path: `${OUT}/e2e-diary.png` });

const ids = await page.evaluate(
  (since) =>
    new Promise((res) => {
      const r = indexedDB.open("trenirovki");
      r.onsuccess = () => {
        const all = r.result.transaction("sessions", "readonly").objectStore("sessions").getAll();
        all.onsuccess = () =>
          res(all.result.filter((s) => s.startedAt >= since).map((s) => s.id));
      };
    }),
  testStart,
);
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForTimeout(1500);
await browser.close();

// чистим ТОЛЬКО сессии этого прогона (startedAt >= testStart) — чужие не трогаем
if (ids.length && process.env.DATABASE_URL) {
  const sql = neon(process.env.DATABASE_URL);
  for (const id of ids) {
    await sql`delete from set_logs where session_id = ${id}`;
    await sql`delete from sessions where id = ${id}`;
  }
  step(11, `убрано из Neon: ${ids.length} тестовых сесси(й)`);
}

console.log(errs.length ? "ОШИБКИ:\n" + errs.join("\n") : "✓ ошибок консоли нет");
process.exit(errs.length ? 1 : 0);
