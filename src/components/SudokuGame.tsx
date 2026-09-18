"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { startGameAction } from "@/app/actions/game";
import { AccountContext, type AccountState } from "@/components/AccountContext";
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
  /** Whether the player appears on the leaderboard. */
  showOnLeaderboard: boolean;
};

/** The menu's Continue card shows the same fields for server and local games. */
function asSaved(game: ServerGame): SavedGame {
  return { version: 1, noteMode: false, ...game };
}

/** Top-level flow: pick a difficulty (or continue a saved game), then play. */
export default function SudokuGame({
  user,
  accountGames,
  serverGame,
  accountSettings,
  showOnLeaderboard: initialShowOnLeaderboard,
}: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(initialShowOnLeaderboard);
  const account = useMemo<AccountState>(
    () => ({ accountGames, showOnLeaderboard, setShowOnLeaderboard }),
    [accountGames, showOnLeaderboard],
  );
  // The board hands back its latest state when you leave it, so the Continue card is current
  // without asking the server again. `undefined`: nothing played yet, use the page's copy.
  const [lastPlayed, setLastPlayed] = useState<ServerGame | null | undefined>(undefined);

  // localStorage only exists in the browser; the server snapshot (null) keeps hydration consistent.
  const savedRaw = useSyncExternalStore(subscribeSavedGame, readSavedGameRaw, () => null);
  const localSaved = useMemo(() => parseSavedGame(savedRaw), [savedRaw]);
  const accountSaved = lastPlayed === undefined ? serverGame : lastPlayed;
  const saved = accountGames ? (accountSaved ? asSaved(accountSaved) : null) : localSaved;

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

  /** `unfinished`: the game as the player left it, or null once it's won, lost, or replaced. */
  function exitGame(unfinished: ServerGame | null) {
    setGame(null);
    if (accountGames) setLastPlayed(unfinished);
  }

  return (
    <AccountContext value={account}>
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
