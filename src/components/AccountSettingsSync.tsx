"use client";

import { useEffect } from "react";
import { saveSettingsAction } from "@/app/actions/account";
import {
  parseSettings,
  readSettingsRaw,
  subscribeSettings,
  writeSettings,
  type Settings,
} from "@/lib/settings";

type Props = {
  /** Settings stored on the account, or null if this player has never saved any. */
  accountSettings: Settings | null;
};

const SAVE_DELAY_MS = 600;

/**
 * Keeps this device's settings and the account's in step: the account's settings are applied
 * on load, and changes made here are saved back. Renders nothing.
 */
export default function AccountSettingsSync({ accountSettings }: Props) {
  // Compare by content: a page refresh hands over a new object with the same settings.
  const accountJson = accountSettings ? JSON.stringify(accountSettings) : null;

  useEffect(() => {
    let lastSynced: string;
    if (accountJson) {
      // The account wins: apply it to this device.
      lastSynced = accountJson;
      writeSettings(JSON.parse(accountJson) as Settings);
    } else {
      // First sign-in: this device's settings become the account's.
      const local = parseSettings(readSettingsRaw());
      lastSynced = JSON.stringify(local);
      saveSettingsAction(local).catch(() => {});
    }

    function save() {
      const current = parseSettings(readSettingsRaw());
      const json = JSON.stringify(current);
      if (json === lastSynced) return;
      lastSynced = json;
      saveSettingsAction(current).catch(() => {});
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeSettings(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        save();
      }, SAVE_DELAY_MS);
    });
    return () => {
      unsubscribe();
      // Don't drop a change that was still waiting to be sent.
      if (timer !== undefined) {
        clearTimeout(timer);
        save();
      }
    };
  }, [accountJson]);

  return null;
}
