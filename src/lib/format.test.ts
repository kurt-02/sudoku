import { describe, expect, it } from "vitest";
import { formatTime } from "@/lib/format";

describe("formatTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(9)).toBe("0:09");
    expect(formatTime(754)).toBe("12:34");
  });

  it("adds hours past 60 minutes", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3725)).toBe("1:02:05");
  });
});
