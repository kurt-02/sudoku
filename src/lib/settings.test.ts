import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "@/lib/settings";

describe("parseSettings", () => {
  it("uses defaults for missing or corrupt data", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("not json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps known boolean keys and ignores everything else", () => {
    const parsed = parseSettings(
      JSON.stringify({ mistakeLimit: false, animations: "no", unknownKey: true }),
    );
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, mistakeLimit: false });
  });
});
