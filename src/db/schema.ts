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
   ============================================================ */

import Dexie, { type EntityTable } from "dexie";

export type DayCode = "A" | "B" | "C";

/** Режим амплитуды — правило исполнения, не украшение (см. context/03). */
export type Rom = "full" | "lengthened" | "short" | "iso";

/** Происхождение упражнения в программе — чтобы через полгода знать,
 *  кто так сказал: тренер или правка.
 *    nikita  — было на тренировке с Никитой, техника как показал
 *    changed — было у Никиты, но техника/амплитуда изменена (см. context/02)
 *    added   — добавлено, чтобы закрыть дыру метода (лопатка, ягодица, кор)
 *    neutral — просто разумное дополнение, без флага */
export type Origin = "nikita" | "changed" | "added" | "neutral";

export interface Exercise {
  id: string;               // стабильный слаг: "lying-leg-curl"
  nameRu: string;
  nameEn: string;
  muscle: string;           // основная целевая группа (для будущей аналитики)
  equipment: string;
  rom: Rom;
  cue: string;              // одна строка — то, что важнее гифки
  restSec: number;          // старт таймера отдыха по умолчанию
  gifUrl?: string;          // появится на этапе «банк упражнений», пока пусто
}

export interface ProgramVersion {
  id: string;               // "v1"
  programName: string;      // "Full body 1"
  createdAt: number;
  note?: string;
  active: boolean;          // ровно одна активная версия
}

export interface ProgramSlot {
  id: string;               // `${versionId}:${day}:${order}`
  versionId: string;        // -> ProgramVersion.id
  day: DayCode;
  order: number;            // позиция в дне, с 1
  exerciseId: string;       // -> Exercise.id
  targetSets: number;
  repLow: number;
  repHigh: number;          // == repLow, если фикс
  perSide: boolean;         // «8 / стор.»
  origin: Origin;
}

export interface Session {
  id: string;               // uuid
  versionId: string;        // -> ProgramVersion.id (замораживается на старте)
  day: DayCode;
  startedAt: number;
  finishedAt: number | null;
}

export interface SetLog {
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

export const db = new Dexie("trenirovki") as Dexie & {
  exercises: EntityTable<Exercise, "id">;
  programVersions: EntityTable<ProgramVersion, "id">;
  programSlots: EntityTable<ProgramSlot, "id">;
  sessions: EntityTable<Session, "id">;
  setLogs: EntityTable<SetLog, "id">;
};

db.version(1).stores({
  exercises: "id, muscle",
  programVersions: "id, active",
  programSlots: "id, versionId, [versionId+day], exerciseId",
  sessions: "id, startedAt, finishedAt, [day+startedAt]",
  setLogs: "id, sessionId, exerciseId, [exerciseId+loggedAt]",
});
