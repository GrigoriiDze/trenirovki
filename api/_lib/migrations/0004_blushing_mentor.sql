CREATE TABLE "body_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"date" bigint NOT NULL,
	"note" text,
	"weight" numeric,
	"neck" numeric,
	"shoulders" numeric,
	"chest" numeric,
	"biceps_l" numeric,
	"biceps_r" numeric,
	"forearm" numeric,
	"wrist" numeric,
	"waist" numeric,
	"hips" numeric,
	"thigh" numeric,
	"calf" numeric,
	"ankle" numeric,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "body_logs_date" ON "body_logs" USING btree ("date");