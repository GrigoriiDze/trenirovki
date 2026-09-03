/* Схема Postgres (Neon), Drizzle. Зеркало локальной схемы Dexie
   (src/db/schema.ts). Один пользователь — без user_id, добавим при
   мультиустройстве нескольких людей.

   Время — bigint epoch ms, ровно как в клиенте: никакой конвертации TZ.
   Каждая таблица несёт updatedAt и deleted (мягкое удаление) для синка. */

import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  numeric,
  smallint,
  index,
} from "drizzle-orm/pg-core";

export const exercises = pgTable("exercises", {
  id: text("id").primaryKey(), // слаг: "lying-leg-curl"
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  muscle: text("muscle").notNull(),
  equipment: text("equipment").notNull(),
  rom: text("rom").notNull(), // full | lengthened | short | iso
  cue: text("cue").notNull().default(""),
  restSec: integer("rest_sec").notNull().default(60),
  gifUrl: text("gif_url"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deleted: boolean("deleted").notNull().default(false),
});

export const programVersions = pgTable("program_versions", {
  id: text("id").primaryKey(), // "v1"
  programName: text("program_name").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  note: text("note"),
  active: boolean("active").notNull().default(false),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deleted: boolean("deleted").notNull().default(false),
});

export const programSlots = pgTable(
  "program_slots",
  {
    id: text("id").primaryKey(), // "v1:A:1"
    versionId: text("version_id").notNull(),
    day: text("day").notNull(), // A | B | C
    ord: integer("ord").notNull(),
    exerciseId: text("exercise_id").notNull(),
    targetSets: integer("target_sets").notNull(),
    repLow: integer("rep_low").notNull(),
    repHigh: integer("rep_high").notNull(),
    perSide: boolean("per_side").notNull().default(false),
    origin: text("origin").notNull(), // nikita | changed | added | neutral
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    deleted: boolean("deleted").notNull().default(false),
  },
  (t) => [index("program_slots_version_day").on(t.versionId, t.day)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // uuid
    versionId: text("version_id").notNull(),
    day: text("day").notNull(),
    startedAt: bigint("started_at", { mode: "number" }).notNull(),
    finishedAt: bigint("finished_at", { mode: "number" }),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    deleted: boolean("deleted").notNull().default(false),
  },
  (t) => [index("sessions_started").on(t.startedAt)],
);

/* ⚠ exerciseId ссылается на exercises напрямую, не на слот (см. CLAUDE.md) */
export const setLogs = pgTable(
  "set_logs",
  {
    id: text("id").primaryKey(), // uuid
    sessionId: text("session_id").notNull(),
    exerciseId: text("exercise_id").notNull(),
    setNumber: integer("set_number").notNull(),
    weight: numeric("weight", { mode: "number" }).notNull().default(0),
    reps: integer("reps").notNull().default(0),
    rir: integer("rir"),
    backFeel: smallint("back_feel"), // 0 | 1 | 2 | null
    loggedAt: bigint("logged_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    deleted: boolean("deleted").notNull().default(false),
  },
  (t) => [
    index("set_logs_session").on(t.sessionId),
    index("set_logs_exercise").on(t.exerciseId, t.loggedAt),
  ],
);

export const SYNC_TABLES = [
  "exercises",
  "programVersions",
  "programSlots",
  "sessions",
  "setLogs",
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
