# trenirovki

PWA-трекер тренировок: программа A/B/C, дневник в один тап, техника упражнений. Данные — локально (IndexedDB), офлайн-first.

## Разработка

```bash
npm install
npx playwright install chromium      # для npm run shot и scripts/icons.mjs
npm run dev -- --host                # dev-сервер, открыть по IP с телефона
npm run build                        # tsc + vite build + service worker
npm run shot                         # скриншоты экранов в shots/ (light + dark)
```

## Где что

| Путь | Что |
|---|---|
| `CLAUDE.md` | правила: один тап в зале, модель данных, самопроверка через скриншот |
| `HISTORY.md` | лог сессий — находки, мины, что проверено |
| `plans/` | план по этапам, ведётся чекбоксами |
| `context/` | разбор тренировки, метод, программа A/B/C, конспекты курса Овчарова |
| `src/db/` | схема Dexie и сидинг программы |
| `src/data/program-v1.ts` | программа как данные — правишь программу, заводишь v2 |

## Стек

Vite · Preact · TypeScript · Dexie · vite-plugin-pwa
