/* Скриншот-харнесс. `npm run shot` — поднимает dev-сервер Vite, снимает
   ключевые экраны в мобильном вьюпорте (light + dark), кладёт PNG в shots/.
   Смотреть глазами перед тем, как сказать «готово» (см. CLAUDE.md).

   `npm run shot -- https://…` — снять внешний URL вместо локального сервера. */

import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";

const OUT = fileURLToPath(new URL("../shots", import.meta.url));

// [имя файла, путь]. SPA без роутера — экран задаётся ?screen=
const ROUTES = [
  ["home", "/"],
  ["today", "/?screen=today"],
];

const VIEWPORT = { width: 390, height: 844 }; // iPhone 13/14

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const extern = process.argv[2];
  let server = null;
  let base;
  if (extern) {
    base = extern.replace(/\/$/, "");
  } else {
    server = await createServer({ server: { port: 5199, strictPort: true } });
    await server.listen();
    base = `http://localhost:5199`;
  }

  const browser = await chromium.launch();
  let failed = false;

  for (const scheme of /** @type {const} */ (["light", "dark"])) {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      colorScheme: scheme,
    });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") {
        failed = true;
        console.error(`  [console.error] ${m.text()}`);
      }
    });
    page.on("pageerror", (e) => {
      failed = true;
      console.error(`  [pageerror] ${e.message}`);
    });

    for (const [name, path] of ROUTES) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const file = `${OUT}/${name}.${scheme}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  ${file.replace(OUT + "/", "shots/")}`);
    }
    await ctx.close();
  }

  await browser.close();
  if (server) await server.close();

  if (failed) {
    console.error("\n✗ были ошибки в консоли страницы — смотри выше");
    process.exit(1);
  }
  console.log("\n✓ скриншоты готовы, открой и посмотри глазами");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
