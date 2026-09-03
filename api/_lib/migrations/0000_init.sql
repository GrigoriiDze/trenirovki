CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"name_ru" text NOT NULL,
	"name_en" text NOT NULL,
	"muscle" text NOT NULL,
	"equipment" text NOT NULL,
	"rom" text NOT NULL,
	"cue" text DEFAULT '' NOT NULL,
	"rest_sec" integer DEFAULT 60 NOT NULL,
	"gif_url" text,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"day" text NOT NULL,
	"ord" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"target_sets" integer NOT NULL,
	"rep_low" integer NOT NULL,
	"rep_high" integer NOT NULL,
	"per_side" boolean DEFAULT false NOT NULL,
	"origin" text NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"program_name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"note" text,
	"active" boolean DEFAULT false NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"day" text NOT NULL,
	"started_at" bigint NOT NULL,
	"finished_at" bigint,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"set_number" integer NOT NULL,
	"weight" numeric DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"rir" integer,
	"back_feel" smallint,
	"logged_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "program_slots_version_day" ON "program_slots" USING btree ("version_id","day");--> statement-breakpoint
CREATE INDEX "sessions_started" ON "sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "set_logs_session" ON "set_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "set_logs_exercise" ON "set_logs" USING btree ("exercise_id","logged_at");