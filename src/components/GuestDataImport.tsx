"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { importGuestDataAction } from "@/app/actions/account";
import { finishSavedGame, parseSavedGame, readSavedGameRaw } from "@/lib/savedGame";
import { hasStats, readStats, resetStats } from "@/lib/stats";

type Props = {
  /** Called with a short message when something was moved into the account. */
  onImported: (message: string) => void;
};

// Effects run twice in development (Strict Mode); never send the same guest data twice.
let importStarted = false;

/**
 * On sign-in, moves guest progress left in this browser (stats and an unfinished game) into the
 * account, then clears the guest copy so nothing is counted twice. Renders nothing.
 */
export default function GuestDataImport({ onImported }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (importStarted) return;
    const stats = readStats();
    const game = parseSavedGame(readSavedGameRaw());
    const guestStats = hasStats(stats);
    if (!guestStats && !game) return;

    importStarted = true;
    importGuestDataAction({ stats: guestStats ? stats : undefined, game: game ?? undefined })
      .then((result) => {
        // Only clear what the account actually took.
        if (result.stats) resetStats();
        if (result.game === "imported" && game) finishSavedGame(game.id);

        const movedGame = result.game === "imported";
        if (result.stats || movedGame) {
          onImported(
            result.stats && movedGame
              ? "Your guest stats and unfinished game were added to your account."
              : movedGame
                ? "Your unfinished guest game was added to your account."
                : "Your guest stats were added to your account.",
          );
        }
        // Show the imported game under Continue.
        if (movedGame) router.refresh();
      })
      .catch(() => {
        importStarted = false; // Try again on the next visit.
      });
  }, [onImported, router]);

  return null;
}
