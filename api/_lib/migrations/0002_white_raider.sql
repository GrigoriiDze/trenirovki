CREATE TABLE "session_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"ord" integer NOT NULL,
	"source" text NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL,
	"target_sets" integer,
	"rep_low" integer,
	"rep_high" integer,
	"per_side" boolean DEFAULT false NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "session_exercises_session" ON "session_exercises" USING btree ("session_id");