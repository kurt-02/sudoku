"use client";

import { createContext, useContext } from "react";

export type AccountState = {
  /** Whether games, stats, and settings live on the player's account (signed in, online). */
  accountGames: boolean;
  /** Whether other players see this player on the leaderboard (loaded with the page). */
  showOnLeaderboard: boolean;
  setShowOnLeaderboard: (show: boolean) => void;
};

export const AccountContext = createContext<AccountState>({
  accountGames: false,
  showOnLeaderboard: true,
  setShowOnLeaderboard: () => {},
});

export function useAccountGames(): boolean {
  return useContext(AccountContext).accountGames;
}

export function useAccount(): AccountState {
  return useContext(AccountContext);
}
