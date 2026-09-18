import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  LEADERBOARD_MAX_MISTAKES,
  LEADERBOARD_SIZE,
  leaderboardName,
  MIN_LEADERBOARD_SECONDS,
  type Leaderboard,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import type { Difficulty } from "@/lib/sudoku";

/*
 * Leaderboards are built only from games the server ran and checked, never from `user_stats`
 * (which can include imported guest progress). A win counts when it:
 *   - finished as "won" on the server (the board matched the stored solution),
 *   - wasn't imported from guest play,
 *   - stayed under the mistake limit, and
 *   - took at least MIN_LEADERBOARD_SECONDS (faster is almost certainly automated).
 * Players who turned off "Show me on the leaderboard" are left out entirely.
 */

type Row = {
  rank: number;
  value: number;
  is_me: boolean;
  name: string | null;
  image: string | null;
};

function countsWhere(difficulty: Difficulty): SQL {
  return sql`g.status = 'won'
    and not g.imported
    and g.mistakes <= ${LEADERBOARD_MAX_MISTAKES}
    and g.seconds >= ${MIN_LEADERBOARD_SECONDS[difficulty]}`;
}

/** Ranks per-player values; returns the top rows plus the viewer's own row wherever it falls. */
async function ranked(
  viewerId: string,
  perPlayer: SQL,
  order: "asc" | "desc",
): Promise<LeaderboardEntry[]> {
  const direction = order === "asc" ? sql`asc` : sql`desc`;
  const rows = await getDb().execute<Row>(sql`
    with per_player as (${perPlayer}),
    ranked as (
      select user_id, value, rank() over (order by value ${direction})::int as rank
      from per_player
    )
    select r.rank, r.value::int as value, (u.id = ${viewerId}) as is_me, u.name, u.image
    from ranked r
    join users u on u.id = r.user_id
    where r.rank <= ${LEADERBOARD_SIZE} or u.id = ${viewerId}
    order by r.rank, u.created_at
  `);
  const entries = rows.map((row) => ({
    rank: row.rank,
    value: row.value,
    isMe: row.is_me,
    name: leaderboardName(row.name),
    image: row.image,
  }));
  // Ties can push more than the board size into the top ranks; keep the list tidy, but always
  // keep the viewer's own row.
  const top = entries.filter((e) => e.rank <= LEADERBOARD_SIZE).slice(0, LEADERBOARD_SIZE);
  const me = entries.find((e) => e.isMe);
  return me && !top.includes(me) ? [...top, me] : top;
}

export async function getLeaderboard(
  viewerId: string,
  difficulty: Difficulty,
): Promise<Leaderboard> {
  const visible = sql`users.show_on_leaderboard`;

  const fastest = ranked(
    viewerId,
    sql`select g.user_id, min(g.seconds) as value
        from games g join users on users.id = g.user_id
        where g.difficulty = ${difficulty} and ${visible} and ${countsWhere(difficulty)}
        group by g.user_id`,
    "asc",
  );

  const wins = ranked(
    viewerId,
    sql`select g.user_id, count(*) as value
        from games g join users on users.id = g.user_id
        where g.difficulty = ${difficulty} and ${visible} and ${countsWhere(difficulty)}
        group by g.user_id`,
    "desc",
  );

  // Longest run of counting wins, in finish order. Any other finished game (a loss, a game given
  // up, or a win that doesn't count) ends the run. Classic "gaps and islands": within a run, the
  // position among all games minus the position among same-kind games stays constant.
  const streak = ranked(
    viewerId,
    sql`select user_id, max(run) as value from (
          select user_id, count(*) as run from (
            select g.user_id, (${countsWhere(difficulty)}) as counts,
              row_number() over (partition by g.user_id order by g.finished_at)
                - row_number() over (
                    partition by g.user_id, (${countsWhere(difficulty)})
                    order by g.finished_at
                  ) as island
            from games g join users on users.id = g.user_id
            where g.difficulty = ${difficulty} and ${visible}
              and not g.imported and g.status <> 'playing'
          ) finished
          where counts
          group by user_id, island
        ) runs
        group by user_id`,
    "desc",
  );

  const [f, w, s] = await Promise.all([fastest, wins, streak]);
  return { fastest: f, wins: w, streak: s };
}
