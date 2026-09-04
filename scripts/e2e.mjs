/* Прогон потока тренировки в браузере: unlock → день → старт → запись
   подхода → таймер → завершение → итог. Синк ЗАГЛУШЕН — тест изолирован,
   прод-Neon не трогает. Требует `npm run dev`. `npm run test:e2e` */

import { chromium } from "playwright";

const TOKEN = process.env.APP_TOKEN ?? "e2e";
const BASE = "http://localhost:5173";
const OUT = `${import.meta.dirname}/../shots`;
const SUF = process.argv.includes("--light") ? ".light" : ".dark";

const SCHEME = process.argv.includes("--light") ? "light" : "dark";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: SCHEME });
const page = await ctx.newPage();

// заглушка синка: код принимается, данные никуда не уходят и не приходят
await page.route("**/api/sync", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ now: Date.now(), pull: {} }),
  }),
);

const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));

const step = (n, msg) => console.log(`${n}. ${msg}`);

await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill(".unlock__input", TOKEN);
await page.click(".unlock .btn--primary");
await page.waitForSelector(".home");
await page.waitForSelector(".week"); // дашборд-блок «Неделя»
step(1, "вход + главный (с блоком «Неделя»)");

await page.click(".card--today");
await page.waitForSelector(".today");
await page.screenshot({ path: `${OUT}/e2e-today${SUF}.png` });
// проверить переключатель дня
await page.click(".daychip:has-text('C')");
await page.waitForFunction(() => document.querySelector(".today__title h1")?.textContent?.includes("C"));
await page.click(".daychip:has-text('A')");
step(2, "переключатель дня A/B/C работает");
await page.click(".today__cta .btn--primary");
await page.waitForSelector(".sess");
step(3, "старт тренировки → экран сессии");
await page.screenshot({ path: `${OUT}/e2e-session${SUF}.png` });

// A.4/A.6 — лист управления: добавить упражнение, проверить рост списка
const cntBefore = await page.locator(".sess__count").innerText();
await page.click(".sess__manage");
await page.waitForSelector(".sheet__panel");
await page.waitForTimeout(350); // дать листу доехать до конца анимации
await page.screenshot({ path: `${OUT}/e2e-manage${SUF}.png` });
await page.locator(".sheet__add button").first().click();
await page.waitForSelector(".sheet__panel", { state: "detached" });
await page.waitForFunction(
  (before) => document.querySelector(".sess__count")?.textContent !== before,
  cntBefore,
);
step(3.5, `список упражнений сессии вырос: "${cntBefore}" → "${await page.locator(".sess__count").innerText()}"`);

// поднять число степпером и записать подход
await page.locator(".sess__steppers .stepper").first().locator(".stepper__btn").last().click({ clickCount: 4 });
await page.click(".sess__log");
await page.waitForSelector(".rest", { timeout: 3000 });
step(4, "подход записан → таймер отдыха");
await page.screenshot({ path: `${OUT}/e2e-rest${SUF}.png` });

await page.click(".rest__skip");
await page.waitForSelector(".sess__log");
const doneRows = await page.locator(".setrow--done").count();
step(5, `после отдыха: записанных подходов = ${doneRows}`);

// переход к следующему упражнению кнопкой «Дальше»
const exBefore = await page.locator(".sess__ex h1").innerText();
await page.click(".sess__next");
await page.waitForFunction(
  (b) => document.querySelector(".sess__ex h1")?.textContent !== b,
  exBefore,
);
step(5.5, `«Дальше» переключает упражнение: "${exBefore}" → "${await page.locator(".sess__ex h1").innerText()}"`);
await page.locator(".sess__arrow").first().click(); // вернуться назад для проверки БД

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
await page.screenshot({ path: `${OUT}/e2e-summary${SUF}.png` });

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
// завершаем и эту (чистая завершённая сессия — уберём вместе с первой)
await page.click(".sess__end");
await page.click(".sess__end");
await page.waitForSelector(".sum");
await page.click(".sum .btn--primary");
await page.waitForSelector(".home");

// дневник
await page.click(".tile--on:has-text('Дневник')");
await page.waitForSelector(".diary");
const diaryRows = await page.locator(".drow").count();
step(10, `дневник: ${diaryRows} тренировк(и)`);
await page.locator(".drow__head").last().click(); // первая тренировка — в ней есть подход
await page.waitForSelector(".drow__body");
await page.screenshot({ path: `${OUT}/e2e-diary${SUF}.png` });

// экран упражнения из дневника
await page.locator(".drow__exname").first().click();
await page.waitForSelector(".exs");
step(11, `экран упражнения: "${await page.locator(".exs__head h1").innerText()}"`);
await page.screenshot({ path: `${OUT}/e2e-exercise${SUF}.png` });
await page.click(".exs__back");
await page.waitForSelector(".diary");

// прогресс
await page.click(".diary__back");
await page.waitForSelector(".home");
await page.click(".tile--on:has-text('Прогресс')");
await page.waitForSelector(".prog");
const bars = await page.locator(".bar").count();
step(12, `прогресс: ${bars} групп мышц в объёме`);
await page.screenshot({ path: `${OUT}/e2e-progress${SUF}.png` });
await page.click(".prog__back");
await page.waitForSelector(".home");

// тело: записать замер
await page.click(".tile--on:has-text('Тело')");
await page.waitForSelector(".body");
await page.click(".body__add");
await page.waitForSelector(".mform");
await page.locator(".rstep").first().locator(".rstep__btn").last().click({ clickCount: 3 });
await page.screenshot({ path: `${OUT}/e2e-body-form${SUF}.png` });
await page.click(".body__save");
await page.waitForSelector(".mlist");
const mrows = await page.locator(".mrow").count();
step(13, `тело: замер сохранён, ${mrows} полей`);
await page.screenshot({ path: `${OUT}/e2e-body${SUF}.png` });

await browser.close();
console.log(errs.length ? "ОШИБКИ:\n" + errs.join("\n") : "✓ ошибок консоли нет");
process.exit(errs.length ? 1 : 0);
