"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { startGameAction } from "@/app/actions/game";
import { AccountContext } from "@/components/AccountContext";
import AccountSettingsSync from "@/components/AccountSettingsSync";
import DifficultyMenu from "@/components/DifficultyMenu";
import GuestDataImport from "@/components/GuestDataImport";
import SudokuBoard from "@/components/SudokuBoard";
import type { ServerGame } from "@/db/games";
import type { Settings } from "@/lib/settings";
import {
  newGameId,
  parseSavedGame,
  readSavedGameRaw,
  subscribeSavedGame,
  type SavedGame,
} from "@/lib/savedGame";
import { recordAbandon, recordStart, updateStats } from "@/lib/stats";
import { createBoardState, generatePuzzle, gridToString, type Difficulty } from "@/lib/sudoku";
import type { SessionUser } from "@/types/auth";
import type { BoardState } from "@/types/game";

type Game = {
  /** Remounts the board on every new game so its state starts fresh. */
  id: number;
  /** Play-through id: the server's game id, or the local save's id (see savedGame.ts). */
  gameId: string;
  difficulty: Difficulty;
  initialBoard: BoardState;
  initialSeconds: number;
  initialMistakes: number;
  initialHintsUsed: number;
};

type Props = {
  /** Signed-in Google account, or null for a guest. */
  user: SessionUser | null;
  /** True when games are kept on the server for this player (signed in, database reachable). */
  accountGames: boolean;
  /** The player's unfinished server game, loaded with the page. */
  serverGame: ServerGame | null;
  /** Settings stored on the account (null if never saved). */
  accountSettings: Settings | null;
};

/** The menu's Continue card shows the same fields for server and local games. */
function asSaved(game: ServerGame): SavedGame {
  return { version: 1, noteMode: false, ...game };
}

/** Top-level flow: pick a difficulty (or continue a saved game), then play. */
export default function SudokuGame({ user, accountGames, serverGame, accountSettings }: Props) {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // localStorage only exists in the browser; the server snapshot (null) keeps hydration consistent.
  const savedRaw = useSyncExternalStore(subscribeSavedGame, readSavedGameRaw, () => null);
  const localSaved = useMemo(() => parseSavedGame(savedRaw), [savedRaw]);
  const saved = accountGames ? (serverGame ? asSaved(serverGame) : null) : localSaved;

  function open(next: Omit<Game, "id">) {
    setGame((prev) => ({ id: (prev?.id ?? 0) + 1, ...next }));
  }

  /** `afterFinish`: started from the win screen, so nothing unfinished is being given up. */
  async function startGame(difficulty: Difficulty, afterFinish = false) {
    if (accountGames) {
      // The server creates the puzzle, keeps its solution, and counts the start (and any game
      // given up by starting this one) in the player's stats.
      setStarting(true);
      setStartError(null);
      try {
        const created = await startGameAction(difficulty);
        open({
          gameId: created.id,
          difficulty: created.difficulty,
          initialBoard: { cells: created.cells, selectedIndex: null, noteMode: false },
          initialSeconds: created.seconds,
          initialMistakes: created.mistakes,
          initialHintsUsed: created.hintsUsed,
        });
      } catch {
        // Back to the menu (if started from the win screen) so the message is seen.
        setGame(null);
        setStartError("Couldn't start a game. Check your connection and try again.");
      } finally {
        setStarting(false);
      }
      return;
    }

    // Guests: stats stay on this device. Read the save fresh, since the board may have just
    // cleared it without this component re-rendering.
    const unfinished = afterFinish ? null : parseSavedGame(readSavedGameRaw());
    updateStats((s) =>
      recordStart(unfinished ? recordAbandon(s, unfinished.difficulty) : s, difficulty),
    );
    // Generated on click (in the browser), so there's no hydration mismatch.
    const puzzle = gridToString(generatePuzzle(difficulty).puzzle);
    open({
      gameId: newGameId(),
      difficulty,
      initialBoard: createBoardState(puzzle),
      initialSeconds: 0,
      initialMistakes: 0,
      initialHintsUsed: 0,
    });
  }

  function continueGame() {
    if (!saved) return;
    open({
      gameId: saved.id,
      difficulty: saved.difficulty,
      initialBoard: { cells: saved.cells, selectedIndex: null, noteMode: saved.noteMode },
      initialSeconds: saved.seconds,
      initialMistakes: saved.mistakes,
      initialHintsUsed: saved.hintsUsed,
    });
  }

  function exitGame() {
    setGame(null);
    // Reload the server's view of this player's game for the Continue card.
    if (accountGames) router.refresh();
  }

  return (
    <AccountContext value={accountGames}>
      {accountGames && <AccountSettingsSync accountSettings={accountSettings} />}
      {accountGames && <GuestDataImport onImported={setImportNotice} />}
      {game ? (
        <SudokuBoard
          key={game.id}
          gameId={game.gameId}
          accountGames={accountGames}
          initialBoard={game.initialBoard}
          initialSeconds={game.initialSeconds}
          initialMistakes={game.initialMistakes}
          initialHintsUsed={game.initialHintsUsed}
          difficulty={game.difficulty}
          onExit={exitGame}
          onNewGame={(difficulty) => startGame(difficulty, true)}
        />
      ) : (
        <DifficultyMenu
          user={user}
          saved={saved}
          starting={starting}
          error={startError}
          notice={importNotice}
          onDismissNotice={() => setImportNotice(null)}
          onSelect={startGame}
          onContinue={continueGame}
        />
      )}
    </AccountContext>
  );
}
