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

/** Мышечная группа — контролируемый словарь для аналитики (недельный
 *  объём по группам, план 03 этап E). Одно значение на упражнение —
 *  основная целевая группа. Вторичные не ведём, пока нет запроса. */
export type MuscleGroup =
  | "грудь"
  | "широчайшие"
  | "верх спины"
  | "трапеция"
  | "поясница"
  | "передняя дельта"
  | "средняя дельта"
  | "задняя дельта"
  | "бицепс"
  | "трицепс"
  | "квадрицепс"
  | "бицепс бедра"
  | "ягодицы"
  | "приводящие"
  | "икры"
  | "кор";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "грудь", "широчайшие", "верх спины", "трапеция", "поясница",
  "передняя дельта", "средняя дельта", "задняя дельта",
  "бицепс", "трицепс", "квадрицепс", "бицепс бедра",
  "ягодицы", "приводящие", "икры", "кор",
];

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
  muscle: MuscleGroup;      // основная целевая группа (аналитика по объёму)
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
  day: DayCode | null;      // null — свободная / импортированная сессия вне ротации
  startedAt: number;
  finishedAt: number | null;
  source: "app" | "import"; // import — залито из исторического дневника (context/07)
  note: string | null;      // заметка: кардио, разминка, «хаотичная тренировка» из импорта
}

/** Упражнение в конкретной сессии. Сессия — НЕ проекция программы:
 *  на старте сюда копируются слоты дня, дальше список правится руками
 *  (добавить/убрать/переставить), программа при этом не меняется.
 *
 *    id       = `${sessionId}:${exerciseId}` — упражнение в сессии одно
 *    source   plan — пришло из программы дня; added — добавлено в зале
 *    skipped  убрано из сессии (A.5), в программе остаётся
 *    target*  снимок цели со слота на момент старта (заморожен, как versionId).
 *             null у добавленных — «сам решаешь сколько». */
export interface SessionExercise extends Synced {
  id: string;
  sessionId: string;        // -> Session.id
  exerciseId: string;       // -> Exercise.id
  ord: number;              // позиция в сессии, с 1
  source: "plan" | "added";
  skipped: boolean;
  targetSets: number | null;
  repLow: number | null;
  repHigh: number | null;
  perSide: boolean;
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

/** Замер тела. Григорий ведёт обхваты сантиметром (см), вес не ведёт —
 *  поле опциональное. Бицепс раздельно L/R — асимметрия реальна (37/38).
 *  Набор полей фиксирован (context/08), «на вырост» не добавляем.
 *  Любое поле null — в этом замере не мерил. */
export const BODY_FIELDS = [
  "weight",
  "neck",
  "shoulders", // фронтальная ширина плеч, не обхват
  "chest",
  "bicepsL",
  "bicepsR",
  "forearm",
  "wrist",
  "waist",
  "hips", // таз вместе с ягодицами
  "thigh",
  "calf",
  "ankle",
] as const;
export type BodyField = (typeof BODY_FIELDS)[number];

export interface BodyLog extends Synced {
  id: string;   // uuid
  date: number; // epoch ms — дата замера (не создание строки)
  note: string | null;
  weight: number | null;    // кг
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  bicepsL: number | null;
  bicepsR: number | null;
  forearm: number | null;
  wrist: number | null;
  waist: number | null;
  hips: number | null;
  thigh: number | null;
  calf: number | null;
  ankle: number | null;
}

/** Русские подписи + единица. shoulders/hips — с пояснением, иначе через
 *  полгода непонятно, что мерил (см. context/08). */
export const BODY_LABELS: Record<BodyField, string> = {
  weight: "Вес",
  neck: "Шея",
  shoulders: "Плечевой пояс",
  chest: "Грудь",
  bicepsL: "Бицепс левый",
  bicepsR: "Бицепс правый",
  forearm: "Предплечье",
  wrist: "Запястье",
  waist: "Живот",
  hips: "Таз",
  thigh: "Бедро",
  calf: "Голень",
  ankle: "Лодыжка",
};

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
  sessionExercises: EntityTable<SessionExercise, "id">;
  setLogs: EntityTable<SetLog, "id">;
  bodyLogs: EntityTable<BodyLog, "id">;
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

// v4: sessionExercises — сессия перестаёт быть проекцией программы.
// Задним числом достраиваем список для всех существующих сессий из
// уже сохранённых слотов их версии/дня + упражнений из их же подходов.
db.version(4)
  .stores({
    sessionExercises: "id, sessionId, [sessionId+ord], exerciseId, updatedAt",
  })
  .upgrade(async (tx) => {
    const now = Date.now();
    const [sessions, slots, logs] = await Promise.all([
      tx.table("sessions").toArray(),
      tx.table("programSlots").toArray(),
      tx.table("setLogs").toArray(),
    ]);
    const rows: Record<string, unknown>[] = [];
    for (const s of sessions) {
      const planned = slots
        .filter((sl) => !sl.deleted && sl.versionId === s.versionId && sl.day === s.day)
        .sort((a, b) => a.ord - b.ord);
      const seen = new Set<string>();
      let ord = 1;
      for (const sl of planned) {
        seen.add(sl.exerciseId);
        rows.push({
          id: `${s.id}:${sl.exerciseId}`,
          sessionId: s.id,
          exerciseId: sl.exerciseId,
          ord: ord++,
          source: "plan",
          skipped: false,
          targetSets: sl.targetSets,
          repLow: sl.repLow,
          repHigh: sl.repHigh,
          perSide: sl.perSide,
          updatedAt: now,
          deleted: false,
        });
      }
      // упражнения, которых в программе нет, но подходы по ним есть
      for (const l of logs) {
        if (l.sessionId !== s.id || l.deleted || seen.has(l.exerciseId)) continue;
        seen.add(l.exerciseId);
        rows.push({
          id: `${s.id}:${l.exerciseId}`,
          sessionId: s.id,
          exerciseId: l.exerciseId,
          ord: ord++,
          source: "added",
          skipped: false,
          targetSets: null,
          repLow: null,
          repHigh: null,
          perSide: false,
          updatedAt: now,
          deleted: false,
        });
      }
    }
    if (rows.length) await tx.table("sessionExercises").bulkAdd(rows);
  });

// v5: muscle приведён к контролируемому словарю MuscleGroup —
// ремап старых значений на существующих строках (см. B.2 плана 03).
const MUSCLE_REMAP: Record<string, string> = {
  "разгибатели спины": "поясница",
  "средняя ягодичная": "ягодицы",
  "приводящие бедра": "приводящие",
  "нижняя трапеция": "трапеция",
};
db.version(5).stores({}).upgrade(async (tx) => {
  const now = Date.now();
  await tx.table("exercises").toCollection().modify((row: Record<string, unknown>) => {
    const m = MUSCLE_REMAP[row.muscle as string];
    if (m) {
      row.muscle = m;
      row.updatedAt = now;
    }
  });
});

// v6: Session.source + Session.note + day становится nullable.
// Нужно для импорта исторического дневника (план 03, этап C).
db.version(6).stores({}).upgrade(async (tx) => {
  await tx.table("sessions").toCollection().modify((row: Record<string, unknown>) => {
    if (row.source === undefined) row.source = "app";
    if (row.note === undefined) row.note = null;
  });
});

// v7: bodyLogs — замеры тела (план 03, этап F).
db.version(7).stores({
  bodyLogs: "id, date, updatedAt",
});

/** Имена синхронизируемых таблиц (без syncMeta). */
export const SYNC_TABLES = [
  "exercises",
  "programVersions",
  "programSlots",
  "sessions",
  "sessionExercises",
  "setLogs",
  "bodyLogs",
] as const;
export type SyncTableName = (typeof SYNC_TABLES)[number];
