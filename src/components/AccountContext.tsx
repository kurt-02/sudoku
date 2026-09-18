"use client";

import { createContext, useContext } from "react";

/** Whether the player's games, stats, and settings live on their account (signed in, online). */
export const AccountContext = createContext(false);

export function useAccountGames(): boolean {
  return useContext(AccountContext);
}
