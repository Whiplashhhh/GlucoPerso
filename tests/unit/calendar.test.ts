import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  dayLabel,
  gridRange,
  groupByDay,
  groupByMonth,
  isDayKey,
  isMonthKey,
  monthKeyOf,
  monthLabel,
  shiftMonth,
  startOfDayIn,
} from "@/lib/calendar";

const PARIS = "Europe/Paris";

describe("month grid", () => {
  it("starts weeks on Monday and fills with neighbour days", () => {
    // 1 October 2026 is a Thursday, 31 October a Saturday.
    const weeks = buildMonthGrid("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.slice(0, 4)).toEqual([
      { key: "2026-09-28", day: 28, inMonth: false },
      { key: "2026-09-29", day: 29, inMonth: false },
      { key: "2026-09-30", day: 30, inMonth: false },
      { key: "2026-10-01", day: 1, inMonth: true },
    ]);
    expect(weeks[4]?.slice(-2)).toEqual([
      { key: "2026-10-31", day: 31, inMonth: true },
      { key: "2026-11-01", day: 1, inMonth: false },
    ]);
    expect(weeks.flat().filter((day) => day.inMonth)).toHaveLength(31);
  });

  it("has no leading days when the month starts on Monday", () => {
    // 1 February 2027 is a Monday and February 2027 has 28 days: 4 full weeks.
    const weeks = buildMonthGrid("2027-02");
    expect(weeks).toHaveLength(4);
    expect(weeks[0]?.[0]).toEqual({ key: "2027-02-01", day: 1, inMonth: true });
    expect(weeks[3]?.[6]).toEqual({ key: "2027-02-28", day: 28, inMonth: true });
  });

  it("uses six rows when needed and handles leap years", () => {
    // 1 August 2027 is a Sunday: 6 leading days, 6 weeks.
    expect(buildMonthGrid("2027-08")).toHaveLength(6);
    const feb2028 = buildMonthGrid("2028-02").flat();
    expect(feb2028.filter((day) => day.inMonth)).toHaveLength(29);
  });

  it("moves between months across years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });
});

describe("keys and labels", () => {
  it("validates month and day keys", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey(["2026-10"])).toBe(false);
    expect(isDayKey("2026-10-09")).toBe(true);
    expect(isDayKey("2026-02-31")).toBe(false);
    expect(isDayKey("2026-10-9")).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });

  it("writes French labels", () => {
    expect(monthLabel("2026-10")).toBe("octobre 2026");
    expect(dayLabel("2026-10-09")).toBe("vendredi 9 octobre");
  });

  it("reads the month in the user's timezone", () => {
    const newYearInParis = new Date("2026-12-31T23:30:00Z");
    expect(monthKeyOf(newYearInParis, PARIS)).toBe("2027-01");
    expect(monthKeyOf(newYearInParis, "America/New_York")).toBe("2026-12");
  });
});

describe("timezones and DST", () => {
  it("covers the whole grid in local time", () => {
    const { start, end } = gridRange("2026-10", PARIS);
    // Monday 28 September, summer time (UTC+2).
    expect(start.toISOString()).toBe("2026-09-27T22:00:00.000Z");
    // Monday 2 November, winter time (UTC+1).
    expect(end.toISOString()).toBe("2026-11-01T23:00:00.000Z");
  });

  it("knows the 25 October 2026 day lasts 25 hours in Paris", () => {
    const start = startOfDayIn("2026-10-25", PARIS);
    const next = startOfDayIn("2026-10-26", PARIS);
    expect(start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(next.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("groups meals by local day around the DST change", () => {
    const meal = (iso: string, name: string) => ({ eatenAt: new Date(iso), name });
    const meals = [
      meal("2026-10-25T23:30:00Z", "00:30 on the 26th (winter time)"),
      meal("2026-10-24T22:30:00Z", "00:30 on the 25th (summer time)"),
      meal("2026-10-25T22:30:00Z", "23:30 on the 25th (winter time)"),
      meal("2026-10-24T21:30:00Z", "23:30 on the 24th"),
    ];
    const groups = groupByDay(meals, PARIS);
    expect(Object.keys(groups).sort()).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(groups["2026-10-25"]?.map((item) => item.name)).toEqual([
      "00:30 on the 25th (summer time)",
      "23:30 on the 25th (winter time)",
    ]);
    expect(groups["2026-10-26"]).toHaveLength(1);

    // The same instants fall on other days in New York.
    expect(Object.keys(groupByDay(meals, "America/New_York")).sort()).toEqual([
      "2026-10-24",
      "2026-10-25",
    ]);
  });

  it("groups search results by month, newest first", () => {
    const meals = [
      { eatenAt: new Date("2026-10-02T10:00:00Z") },
      { eatenAt: new Date("2026-10-01T10:00:00Z") },
      { eatenAt: new Date("2026-09-30T22:30:00Z") }, // 1 October in Paris
      { eatenAt: new Date("2026-09-12T10:00:00Z") },
    ];
    const groups = groupByMonth(meals, PARIS);
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ["octobre 2026", 3],
      ["septembre 2026", 1],
    ]);
  });
});
