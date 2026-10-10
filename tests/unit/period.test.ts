import { describe, expect, it } from "vitest";
import {
  formatRange,
  localDateTime,
  localDayStart,
  parseDateRange,
  parsePeriod,
  periodStart,
} from "@/lib/period";
import { THEME_CHOICES, themeChoiceOf, themeClass, themePreferenceOf } from "@/lib/theme";

const TZ = "Europe/Paris";

describe("parseDateRange", () => {
  const now = new Date("2026-10-10T08:00:00Z");

  it("turns local days into [start, end) instants", () => {
    const result = parseDateRange({ from: "2026-09-01", to: "2026-09-30" }, TZ, now);
    expect(result).toEqual({
      ok: true,
      range: {
        from: "2026-09-01",
        to: "2026-09-30",
        start: new Date("2026-08-31T22:00:00Z"),
        end: new Date("2026-09-30T22:00:00Z"),
      },
    });
  });

  it("defaults to the last 30 days", () => {
    const result = parseDateRange({ from: null, to: undefined }, TZ, now);
    expect(result.ok && result.range.from).toBe("2026-09-11");
    expect(result.ok && result.range.to).toBe("2026-10-10");
  });

  it("handles a DST change inside the range", () => {
    const result = parseDateRange({ from: "2026-10-25", to: "2026-10-25" }, TZ, now);
    expect(result.ok && result.range.end.getTime() - result.range.start.getTime()).toBe(
      25 * 3600_000,
    );
  });

  it.each([
    [{ from: "2026-13-01", to: "2026-12-01" }],
    [{ from: "2026-02-30", to: "2026-03-01" }],
    [{ from: "01/09/2026", to: "2026-09-30" }],
    [{ from: "2026-09-30", to: "2026-09-01" }],
    [{ from: "2020-01-01", to: "2026-01-01" }],
    [{ from: "2026-09-01'; DROP", to: "2026-09-30" }],
  ])("refuses %o", (input) => {
    expect(parseDateRange(input, TZ, now).ok).toBe(false);
  });
});

describe("periods", () => {
  const now = new Date("2026-10-10T08:00:00Z");

  it("parses the period, defaulting to 30 days", () => {
    expect(parsePeriod("90")).toBe("90");
    expect(parsePeriod("tout")).toBe("tout");
    expect(parsePeriod(["90"])).toBe("30");
    expect(parsePeriod(undefined)).toBe("30");
  });

  it("starts 30 local days back, at midnight", () => {
    expect(periodStart("30", now, TZ)).toEqual(new Date("2026-09-10T22:00:00Z"));
    expect(periodStart("tout", now, TZ)).toBeNull();
  });

  it("builds local instants", () => {
    expect(localDayStart("2026-01-15", TZ)).toEqual(new Date("2026-01-14T23:00:00Z"));
    expect(localDateTime("2026-07-01", "21:30", TZ)).toEqual(new Date("2026-07-01T19:30:00Z"));
  });

  it("formats a range in French", () => {
    expect(formatRange("2026-09-01", "2026-09-30")).toBe("du 01/09/2026 au 30/09/2026");
    expect(formatRange("2026-09-01", "2026-09-01")).toBe("le 01/09/2026");
  });
});

describe("theme", () => {
  it("maps stored preferences and cookie values both ways", () => {
    for (const choice of THEME_CHOICES) {
      expect(themeChoiceOf(themePreferenceOf(choice))).toBe(choice);
    }
    expect(themeChoiceOf("DARK")).toBe("dark");
    expect(themePreferenceOf("light")).toBe("LIGHT");
  });

  it("only forces a class for light or dark", () => {
    expect(themeClass("dark")).toBe("dark");
    expect(themeClass("system")).toBeUndefined();
    expect(themeClass("<script>")).toBeUndefined();
  });
});
