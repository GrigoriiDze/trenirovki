ALTER TABLE "sessions" ALTER COLUMN "day" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "source" text DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "note" text;