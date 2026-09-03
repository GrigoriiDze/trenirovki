/* ============================================================
   Модель данных. Четыре сущности, не смешивать (см. CLAUDE.md).

     exercise      — справочник движений
     programSlot   — шаблон: какое упражнение в каком дне какой версии
     session       — факт: проведённая (или идущая) тренировка
     setLog        — факт: один рабочий подход

   ⚠️  ГЛАВНОЕ ПРАВИЛО:
   setLog.exerciseId ссылается на exercise НАПРЯМУЮ, никогда на слот
   программы. Иначе правка программы уносит историю, и вопрос
   «сколько я жал в прошлый раз» перестаёт отвечаться.

   ⚠️  Программа версионируется. Изменение программы = новая
   programVersion. Старые session указывают на свою версию и не
   меняются задним числом.

   Синхронизация (см. src/sync): каждая запись несёт updatedAt (epoch ms,
   ставится при любой мутации) и deleted (мягкое удаление — чтобы удаление
   доехало до сервера). Пишем только через src/db/write.ts.
   ============================================================ */

import Dexie, { type EntityTable } from "dexie";

export type DayCode = "A" | "B" | "C";

/** Режим амплитуды — правило исполнения, не украшение (см. context/03). */
export type Rom = "full" | "lengthened" | "short" | "iso";

/** Как измеряется подход, определяет поля ввода:
 *    weight — внешний вес: степперы кг + повторы
 *    bw     — вес тела: только повторы
 *    time   — удержание: только секунды (число кладём в reps) */
export type Load = "weight" | "bw" | "time";

/** Происхождение упражнения в программе — чтобы через полгода знать,
 *  кто так сказал: тренер или правка.
 *    nikita  — было на тренировке с Никитой, техника как показал
 *    changed — было у Никиты, но техника/амплитуда изменена (см. context/02)
 *    added   — добавлено, чтобы закрыть дыру метода (лопатка, ягодица, кор)
 *    neutral — просто разумное дополнение, без флага */
export type Origin = "nikita" | "changed" | "added" | "neutral";

/** Поля синхронизации на каждой сущности. */
export interface Synced {
  updatedAt: number; // epoch ms, ставит src/db/write.ts
  deleted: boolean;  // мягкое удаление
}

export interface Exercise extends Synced {
  id: string;               // стабильный слаг: "lying-leg-curl"
  nameRu: string;
  nameEn: string;
  muscle: string;           // основная целевая группа (для будущей аналитики)
  equipment: string;
  rom: Rom;
  load: Load;               // режим ввода подхода
  cue: string;              // одна строка — то, что важнее гифки
  restSec: number;          // старт таймера отдыха по умолчанию
  gifUrl: string | null;    // появится на этапе «банк упражнений», пока пусто
}

export interface ProgramVersion extends Synced {
  id: string;               // "v1"
  programName: string;      // "Full body 1"
  createdAt: number;
  note: string | null;
  active: boolean;          // ровно одна активная версия
}

export interface ProgramSlot extends Synced {
  id: string;               // `${versionId}:${day}:${order}`
  versionId: string;        // -> ProgramVersion.id
  day: DayCode;
  ord: number;              // позиция в дне, с 1
  exerciseId: string;       // -> Exercise.id
  targetSets: number;
  repLow: number;
  repHigh: number;          // == repLow, если фикс
  perSide: boolean;         // «8 / стор.»
  origin: Origin;
}

export interface Session extends Synced {
  id: string;               // uuid
  versionId: string;        // -> ProgramVersion.id (замораживается на старте)
  day: DayCode;
  startedAt: number;
  finishedAt: number | null;
}

export interface SetLog extends Synced {
  id: string;               // uuid
  sessionId: string;        // -> Session.id
  exerciseId: string;       // -> Exercise.id  (НЕ слот!)
  setNumber: number;        // с 1, в пределах упражнения в этой сессии
  weight: number;           // кг; 0 = вес тела
  reps: number;
  rir: number | null;       // запас до отказа, повторов; null = не отмечал
  backFeel: 0 | 1 | 2 | null; // ощущение спины
  loggedAt: number;
}

/** Закладки синхронизации. Одна строка, id = "sync". */
export interface SyncMeta {
  id: string;
  lastSyncedAt: number; // epoch ms последней успешной синхры
}

export const db = new Dexie("trenirovki") as Dexie & {
  exercises: EntityTable<Exercise, "id">;
  programVersions: EntityTable<ProgramVersion, "id">;
  programSlots: EntityTable<ProgramSlot, "id">;
  sessions: EntityTable<Session, "id">;
  setLogs: EntityTable<SetLog, "id">;
  syncMeta: EntityTable<SyncMeta, "id">;
};

db.version(1).stores({
  exercises: "id, muscle",
  programVersions: "id, active",
  programSlots: "id, versionId, [versionId+day], exerciseId",
  sessions: "id, startedAt, finishedAt, [day+startedAt]",
  setLogs: "id, sessionId, exerciseId, [exerciseId+loggedAt]",
});

// v2: поля синхронизации + индекс updatedAt на каждой таблице,
// переименование programSlots.order -> ord (order — зарезервировано в SQL).
db.version(2)
  .stores({
    exercises: "id, muscle, updatedAt",
    programVersions: "id, active, updatedAt",
    programSlots: "id, versionId, [versionId+day], exerciseId, updatedAt",
    sessions: "id, startedAt, finishedAt, [day+startedAt], updatedAt",
    setLogs: "id, sessionId, exerciseId, [exerciseId+loggedAt], updatedAt",
    syncMeta: "id",
  })
  .upgrade(async (tx) => {
    const now = Date.now();
    for (const name of ["exercises", "programVersions", "programSlots", "sessions", "setLogs"] as const) {
      await tx.table(name).toCollection().modify((row: Record<string, unknown>) => {
        row.updatedAt = now;
        row.deleted = false;
        if (name === "programSlots" && "order" in row) {
          row.ord = row.order;
          delete row.order;
        }
        if (name === "exercises" && row.gifUrl === undefined) row.gifUrl = null;
        if (name === "programVersions" && row.note === undefined) row.note = null;
      });
    }
  });

// v3: exercise.load — режим ввода подхода.
const BW = new Set(["dead-bug", "bird-dog"]);
const TIME = new Set(["side-plank"]);
db.version(3).stores({}).upgrade(async (tx) => {
  await tx.table("exercises").toCollection().modify((row: Record<string, unknown>) => {
    row.load = TIME.has(row.id as string) ? "time" : BW.has(row.id as string) ? "bw" : "weight";
    row.updatedAt = Date.now();
  });
});

/** Имена синхронизируемых таблиц (без syncMeta). */
export const SYNC_TABLES = [
  "exercises",
  "programVersions",
  "programSlots",
  "sessions",
  "setLogs",
] as const;
export type SyncTableName = (typeof SYNC_TABLES)[number];
