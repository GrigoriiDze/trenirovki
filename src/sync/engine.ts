/* Движок синхронизации: дельта по updatedAt, last-write-wins, один пользователь.

   Push: строки с updatedAt > lastSyncedAt.
   Pull: since = lastSyncedAt; вливаем ответ в Dexie напрямую (сохраняя
   серверный updatedAt), но локальную строку с БОЛЕЕ свежим updatedAt не
   затираем — у неё есть непушнутая правка, уедет следующим заходом.
   Новая закладка = t0, снятая ДО сбора push (запись во время синхры
   попадёт в следующий заход).

   Многоустройственность: закладка по клиентским часам. Для второго
   устройства понадобится серверный счётчик — тогда, не сейчас. */

import { db, SYNC_TABLES } from "~/db/schema";
import { Offline, Unauthorized, postSync } from "~/sync/client";

export type SyncStatus = "idle" | "syncing" | "ok" | "offline" | "bad-token";

export interface SyncState {
  status: SyncStatus;
  pending: number; // локальных правок, не подтверждённых сервером
  lastOk: number | null;
}

let state: SyncState = { status: "idle", pending: 0, lastOk: null };
const listeners = new Set<(s: SyncState) => void>();
let running = false;

export const getState = (): SyncState => state;

export function subscribe(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => {
    listeners.delete(fn);
  };
}

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

const bookmark = async (): Promise<number> =>
  (await db.syncMeta.get("sync"))?.lastSyncedAt ?? 0;

async function countPending(since: number): Promise<number> {
  let n = 0;
  for (const t of SYNC_TABLES) n += await db.table(t).where("updatedAt").above(since).count();
  return n;
}

/** Одна попытка синхронизации. Тихо ничего не делает без сети/кода. */
export async function runSync(): Promise<void> {
  if (running) return;
  running = true;
  const t0 = Date.now();
  const since = await bookmark();

  try {
    set({ status: "syncing", pending: await countPending(since) });

    const push: Record<string, Record<string, unknown>[]> = {};
    for (const t of SYNC_TABLES) {
      const rows = (await db.table(t).where("updatedAt").above(since).toArray()) as Record<
        string,
        unknown
      >[];
      if (rows.length) push[t] = rows;
    }

    const res = await postSync({ since, push });

    await db.transaction("rw", [...SYNC_TABLES], async () => {
      for (const t of SYNC_TABLES) {
        for (const row of res.pull[t] ?? []) {
          const local = (await db.table(t).get(row.id as string)) as
            | { updatedAt: number }
            | undefined;
          if (local && local.updatedAt > (row.updatedAt as number)) continue;
          await db.table(t).put(row);
        }
      }
    });

    await db.syncMeta.put({ id: "sync", lastSyncedAt: t0 });
    set({ status: "ok", pending: await countPending(t0), lastOk: Date.now() });
  } catch (e) {
    if (e instanceof Unauthorized) {
      set({ status: "bad-token" });
    } else {
      if (!(e instanceof Offline)) console.error("sync", e);
      set({ status: "offline", pending: await countPending(since) });
    }
  } finally {
    running = false;
  }
}

/** Автосинк: загрузка, возврат в приложение, появление сети, раз в 3 мин. */
export function startAutoSync(): () => void {
  const kick = () => {
    void runSync();
  };
  kick();

  const onVisible = () => {
    if (document.visibilityState === "visible") kick();
  };
  const timer = window.setInterval(kick, 3 * 60 * 1000);
  window.addEventListener("online", kick);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("online", kick);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Полная перезагрузка с сервера (первый вход на устройстве / кнопка). */
export async function pullAll(): Promise<void> {
  await db.syncMeta.put({ id: "sync", lastSyncedAt: 0 });
  await runSync();
}
