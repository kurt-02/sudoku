DROP INDEX "user_stats_best_time_idx";--> statement-breakpoint
DROP INDEX "user_stats_wins_idx";--> statement-breakpoint
DROP INDEX "user_stats_streak_idx";--> statement-breakpoint
CREATE INDEX "games_leaderboard_idx" ON "games" USING btree ("difficulty","status");