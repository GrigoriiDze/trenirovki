/* Прогон потока тренировки в браузере: unlock → день → старт → запись
   подхода → таймер → завершение → итог. Скриншоты в shots/e2e-*.
   Требует `npm run dev` и `npm run dev:api`. `npm run test:e2e` */

import { chromium } from "playwright";

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

await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill(".unlock__input", TOKEN);
await page.click(".unlock .btn--primary");
await page.waitForSelector(".home");
step(1, "вход + главный");

await page.click(".card--today");
await page.waitForSelector(".today");
await page.click(".today__cta .btn--primary");
await page.waitForSelector(".sess");
step(2, "старт тренировки → экран сессии");
await page.screenshot({ path: `${OUT}/e2e-session.png` });

// поднять вес степпером и записать подход
await page.locator(".sess__steppers .stepper").first().locator(".stepper__btn").last().click({ clickCount: 8 });
await page.click(".backbtn--0");
await page.click(".sess__log");
await page.waitForSelector(".rest", { timeout: 3000 });
step(3, "подход записан → таймер отдыха");
await page.screenshot({ path: `${OUT}/e2e-rest.png` });

await page.click(".rest__skip");
await page.waitForSelector(".sess__log");
const doneRows = await page.locator(".setrow--done").count();
step(4, `после отдыха: записанных подходов = ${doneRows}`);

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
step(5, `setLogs в IndexedDB: ${inDb}`);

// завершить
await page.click(".sess__end"); // "завершить"
await page.click(".sess__end"); // "точно?"
await page.waitForSelector(".sum");
step(6, "завершение → итог");
await page.screenshot({ path: `${OUT}/e2e-summary.png` });

await page.click(".sum .btn--primary");
await page.waitForSelector(".home");
step(7, "вернулись на главный");

console.log(errs.length ? "ОШИБКИ:\n" + errs.join("\n") : "✓ ошибок консоли нет");
await browser.close();
process.exit(errs.length ? 1 : 0);
