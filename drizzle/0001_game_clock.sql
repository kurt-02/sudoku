ALTER TABLE "games" ADD COLUMN "resumed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;