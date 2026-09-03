/* Единственный способ писать в синхронизируемые таблицы. Ставит updatedAt,
   чтобы движок синхронизации увидел изменение. Прямые db.table.put/delete
   в обход этого — баг: правка не доедет до сервера.

   Исключение: движок синхронизации вливает серверные строки напрямую
   через db.table().put() — там updatedAt приходит с сервера, трогать его
   нельзя. */

import { db, type SyncTableName } from "~/db/schema";

type WithId = { id: string };

/** Вставить/заменить строку. updatedAt = сейчас, deleted по умолчанию false. */
export async function putRow(table: SyncTableName, row: WithId & Record<string, unknown>): Promise<void> {
  await db.table(table).put({ deleted: false, ...row, updatedAt: Date.now() });
}

export async function putRows(
  table: SyncTableName,
  rows: (WithId & Record<string, unknown>)[],
): Promise<void> {
  const now = Date.now();
  await db.table(table).bulkPut(rows.map((r) => ({ deleted: false, ...r, updatedAt: now })));
}

/** Мягкое удаление: строка остаётся, deleted=true — чтобы удаление доехало. */
export async function softDelete(table: SyncTableName, id: string): Promise<void> {
  await db.table(table).update(id, { deleted: true, updatedAt: Date.now() });
}

/** Частичное обновление полей + updatedAt. */
export async function patchRow(
  table: SyncTableName,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await db.table(table).update(id, { ...patch, updatedAt: Date.now() });
}
