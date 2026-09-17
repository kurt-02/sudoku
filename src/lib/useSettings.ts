"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  readSettingsRaw,
  subscribeSettings,
  writeSettings,
  type Settings,
} from "@/lib/settings";

/** Current settings plus a setter; every component using it updates together. */
export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  // The server has no localStorage, so it (and hydration) renders with the defaults.
  const raw = useSyncExternalStore(subscribeSettings, readSettingsRaw, () => null);
  const settings = useMemo(() => (raw === null ? DEFAULT_SETTINGS : parseSettings(raw)), [raw]);

  function update(patch: Partial<Settings>) {
    writeSettings({ ...parseSettings(readSettingsRaw()), ...patch });
  }

  return [settings, update];
}
