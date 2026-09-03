/* Прогон основного потока в браузере (unlock → главный → день, синк).
   Требует запущенных `npm run dev` и `npm run dev:api` в других терминалах.
   `npm run test:e2e` */

import { chromium } from "playwright";

const TOKEN = process.env.APP_TOKEN;
const BASE = "http://localhost:5173";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));

await page.goto(BASE, { waitUntil: "networkidle" });
console.log("1. загрузка →", (await page.locator("h1").first().textContent())?.trim());

await page.fill(".unlock__input", TOKEN);
await page.click(".unlock .btn--primary");
await page.waitForSelector(".home", { timeout: 10000 });
console.log("2. код принят → главный экран");

await page.waitForTimeout(2500);
console.log("3. индикатор синка →", JSON.stringify((await page.locator(".home__sync").textContent())?.trim()));

await page.locator(".card--today").click();
await page.waitForSelector(".today");
console.log("4. экран дня →", await page.locator(".exrow").count(), "упражнений");

await page.screenshot({ path: `${import.meta.dirname}/../shots/e2e-home.png` });
console.log(errs.length ? "ОШИБКИ:\n" + errs.join("\n") : "5. ошибок консоли нет");

await browser.close();
process.exit(errs.length ? 1 : 0);
