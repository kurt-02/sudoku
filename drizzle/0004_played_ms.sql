ALTER TABLE "games" ADD COLUMN "played_ms" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Carry over time already banked in whole seconds for games in progress.
UPDATE "games" SET "played_ms" = "seconds" * 1000;
