# План 02 — Бэкенд: Neon + API + синхронизация

**Создан:** 2026-09-03. Решение Григория: бэкенд раньше ядра тренировок. Supabase отклонён — на free засыпает на 7 дней и будится руками. **Neon** уходит в ноль при простое, но просыпается сам за ~0.5 сек.

## Цель

Источник истины — **Neon** (serverless Postgres). Приложение **остаётся офлайн-first для зала**: Dexie — локальный слой (UI всегда через него), Neon — синхронизация и бэкап через тонкий API на Vercel Functions. Один пользователь, вход по коду доступа.

## Архитектура

- **Dexie не выбрасываем** — локальная половина local-first, работает в подвале.
- **API-слой** `api/*` на Vercel Functions (тот же проект). Браузер не держит доступ к БД напрямую.
- **Синк:** `api/sync` — pull (строки с `updated_at > since`) + push (upsert) за один запрос.
- Один пользователь → **last-write-wins**, конфликты не разрешаем.
- **Вход:** длинный `APP_TOKEN` в env сервера. Вводится в приложении один раз, лежит в браузере, шлётся `Authorization: Bearer`. В бандл не попадает. Апгрейд — когда приедут меддокументы.
- Для агентов потом: тот же API-слой или прямой доступ к Neon.

## Стек

`drizzle-orm` + `@neondatabase/serverless` (HTTP, без пула). Схема — `src/server/schema.ts`, миграции — `src/server/migrations/` (`npm run db:generate`).

## Что уже сделано (2026-09-03)

- [x] `src/server/schema.ts` — Drizzle-схема, зеркало Dexie: 5 таблиц, время `bigint` epoch ms (как в клиенте), `updated_at` + `deleted` на каждой
- [x] `src/server/migrations/0000_init.sql` — сгенерирована и **прогнана в Neon**
- [x] `src/server/db.ts` — подключение к Neon для API
- [x] `api/sync.ts` — эндпоинт синка, **протестирован против живой БД**
- [x] `scripts/dev-api.mjs` — локальный мост, `scripts/test-sync.mjs` — тест
- [x] `drizzle.config.ts`, `api/tsconfig.json`, скрипты `db:*` / `dev:api` / `test:sync`
- [x] client-код Supabase удалён, зависимости заменены

---

## Этап 0 — Проект Neon

- [x] 0.1 Проект на neon.tech, регион EU Frankfurt (Григорий)
- [x] 0.2 Connection string (pooled) получен
- [x] 0.3 `APP_TOKEN` сгенерирован
- [x] 0.4a Локальный `.env` заполнен
- [ ] 0.4b **`DATABASE_URL` и `APP_TOKEN` → Vercel → Settings → Environment Variables** (иначе задеплоенный `/api/sync` не работает). Значения — в сообщении. → **на Григории**

## Этап 1 — Миграция

- [x] 1.1 `npm run db:migrate` — 5 таблиц созданы в Neon
- [x] 1.2 Проверено запросом к `information_schema`
- [x] 1.3 Программу v1 отдельно не сидим — создаёт клиент, push-синк уносит наверх

## Этап 2 — API

- [x] 2.1 `api/sync.ts` — POST, `Bearer APP_TOKEN`. `{ since, push }` → upsert по pk + pull всех таблиц с `updated_at > since` (включая `deleted`). Ответ `{ now, pull }`. Web-стандартный `Request`/`Response`, работает и на Vercel Node, и в локальном мосте
- [x] 2.2 Проверка токена — инлайн (2 строки, отдельный файл не нужен)
- [x] 2.3 `scripts/dev-api.mjs` — локальный мост (без vercel CLI), Vite проксирует `/api` → :3001. `npm run dev:api`
- [x] 2.4 `npm run test:sync` — проверено против живой Neon: 401 на плохой токен, пустой pull, push+pull, delta по времени, cleanup

## Этап 3 — Клиент: вход и синк

- [x] 3.1 `src/screens/unlock.tsx` — поле «код доступа» → localStorage → тестовый `runSync()`; 401 → ошибка, код не сохраняется
- [x] 3.2 Без outbox — дельта по `updatedAt`. `src/db/write.ts` (`putRow`/`putRows`/`softDelete`/`patchRow`) ставит `updatedAt` на каждой мутации. Dexie-схема v2: `updatedAt` + `deleted` + индекс; `programSlots.order` → `ord` (SQL-reserved)
- [x] 3.3 `src/sync/engine.ts` — push (updatedAt > закладки) + pull (since = закладка), мёрж в Dexie напрямую, локальную бол́ее свежую строку не затирает. Автосинк: старт / `online` / возврат в приложение / раз в 3 мин
- [x] 3.4 Индикатор на хабе: «сохранено» / «N ждут сети» / «синхронизация…» / «оффлайн» / «код отклонён»
- [x] 3.5 Первый вход на устройстве: `Shell` бутстрапит `runSync()` ДО `seedIfNeeded()` — второе устройство тянет настоящую программу, не пересидивает
- [ ] 3.6 «Выгрузить JSON» — холодный бэкап

## Этап 4 — Проверка

- [x] 4.1 `npm run test:sync` — push/pull/delta против живой Neon
- [x] 4.2 `npm run test:e2e` — свежий контекст браузера (= второе устройство): unlock по коду → pull 26 упр. + 27 слотов из Neon → день A 9 упражнений, ошибок консоли нет
- [x] 4.3 `npm run shot` — экран входа + хаб с индикатором «сохранено», обе темы
- [ ] ⛔ 4.4 **Гейт:** Григорий вводит код на телефоне, переставляет PWA — данные на месте

---

## Отложено

| Тема | Куда |
|---|---|
| Хранилище файлов (документы) | Vercel Blob / R2, план 03 (модуль «Тело») |
| Настоящий auth (вместо кода) | когда появятся меддокументы |
| Realtime, разрешение конфликтов | не нужно одному пользователю |

## Риски

- **Neon из РФ** — API на AWS Frankfurt, обычно доступен. Перебой синка не ломает зал: пишется в Dexie, уедет позже.
- `@neondatabase/serverless` по HTTP — каждый запрос отдельный, для синка (редкие батчи) это ок.
