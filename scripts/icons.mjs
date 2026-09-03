/* Генерация PNG-иконок PWA из общей разметки. Разовый скрипт:
   `node scripts/icons.mjs`. Гоняем при смене иконки. */

import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const pub = fileURLToPath(new URL("../public", import.meta.url));

const BARBELL = `
  <g fill="none" stroke="#d8703f" stroke-width="34" stroke-linecap="round">
    <path d="M150 256 H362"/>
    <path d="M158 192 V320 M354 192 V320"/>
    <path d="M120 216 V296 M392 216 V296"/>
  </g>`;

const TILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#16110d"/>${BARBELL}
</svg>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>*{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${TILE}`,
    );
    await page.locator("svg").screenshot({ path: `${pub}/icon-${size}.png` });
    console.log(`  public/icon-${size}.png`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
