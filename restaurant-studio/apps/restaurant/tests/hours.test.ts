import { describe, expect, it } from "vitest";

import {
  formatShortDate,
  formatTime,
  getOpenStatus,
  groupHours,
  intervalsFor,
  localNow,
  openingHoursSpecification,
  toMinutes,
  upcomingExceptions,
} from "@/lib/site/hours";
import type { SiteConfig } from "@/lib/site/schema";

type Hours = SiteConfig["hours"];

const TZ = "America/Chicago"; // UTC-6 in November, UTC-5 in July

/** Split lunch and dinner on weekdays, like the Hibana demo. */
const split: Hours = {
  regular: [
    { days: ["mon", "tue", "wed", "thu"], open: "11:00", close: "14:30" },
    { days: ["mon", "tue", "wed", "thu"], open: "16:30", close: "21:30" },
    { days: ["fri"], open: "11:00", close: "14:30" },
    { days: ["fri"], open: "16:30", close: "22:30" },
    { days: ["sat"], open: "12:00", close: "22:30" },
    { days: ["sun"], open: "12:00", close: "21:00" },
  ],
  notes: [],
  exceptions: [
    { date: "2026-11-26", label: "Thanksgiving Day", closed: true },
    { date: "2026-12-24", label: "Christmas Eve", closed: false, open: "11:00", close: "15:00" },
  ],
};

/** A late-night spot that closes after midnight and is shut on Mondays. */
const lateNight: Hours = {
  regular: [
    { days: ["tue", "wed", "thu", "sun"], open: "17:00", close: "23:00" },
    { days: ["fri", "sat"], open: "17:00", close: "01:00" },
  ],
  notes: [],
  exceptions: [],
};

/** A wall-clock time in Chicago during November 2026 (CST, UTC-6). */
const chicago = (date: string, time: string) => new Date(`${date}T${time}:00-06:00`);

describe("time helpers", () => {
  it("converts and formats times", () => {
    expect(toMinutes("16:30")).toBe(990);
    expect(formatTime("11:00")).toBe("11 AM");
    expect(formatTime("16:30")).toBe("4:30 PM");
    expect(formatTime("00:00")).toBe("12 AM");
    expect(formatTime("12:00")).toBe("12 PM");
    expect(formatTime("23:05")).toBe("11:05 PM");
  });

  it("finds the restaurant's local day and time, whatever the server's zone", () => {
    // 03:30 UTC on Thursday is still Wednesday evening in Chicago.
    expect(localNow(new Date("2026-11-12T03:30:00Z"), TZ)).toEqual({ day: "wed", minutes: 21 * 60 + 30, date: "2026-11-11" });
    expect(localNow(new Date("2026-11-12T03:30:00Z"), "America/New_York")).toEqual({
      day: "wed",
      minutes: 22 * 60 + 30,
      date: "2026-11-11",
    });
    // Summer time: UTC-5.
    expect(localNow(new Date("2026-07-04T17:00:00Z"), TZ).minutes).toBe(12 * 60);
  });

  it("formats a date for the holiday list", () => {
    expect(formatShortDate("2026-12-24")).toBe("Thu, Dec 24");
  });
});

describe("groupHours", () => {
  it("collapses consecutive days with the same hours and keeps split shifts", () => {
    const rows = groupHours(split);
    expect(rows.map((r) => r.label)).toEqual(["Mon – Thu", "Friday", "Saturday", "Sunday"]);
    expect(rows[0].hours).toBe("11 AM – 2:30 PM, 4:30 PM – 9:30 PM");
    expect(rows[0].intervals).toEqual(["11 AM – 2:30 PM", "4:30 PM – 9:30 PM"]);
    expect(rows[0].closed).toBe(false);
  });

  it("shows closed days and after-midnight closing times", () => {
    const rows = groupHours(lateNight);
    expect(rows[0]).toMatchObject({ label: "Monday", hours: "Closed", intervals: ["Closed"], closed: true });
    expect(rows.find((r) => r.label === "Fri & Sat")?.hours).toBe("5 PM – 1 AM");
    expect(intervalsFor(lateNight, "fri")).toEqual([{ open: 1020, close: 1500 }]);
  });

  it("produces schema.org opening hours", () => {
    const spec = openingHoursSpecification(lateNight);
    expect(spec[1]).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["https://schema.org/Friday", "https://schema.org/Saturday"],
      opens: "17:00",
      closes: "01:00",
    });
  });
});

describe("getOpenStatus", () => {
  it("is open during a shift", () => {
    expect(getOpenStatus(split, chicago("2026-11-11", "12:00"), TZ)).toEqual({
      open: true,
      label: "Open now",
      detail: "until 2:30 PM",
    });
  });

  it("warns when closing within 45 minutes", () => {
    expect(getOpenStatus(split, chicago("2026-11-11", "14:00"), TZ)).toMatchObject({ open: true, label: "Closing soon" });
    expect(getOpenStatus(split, chicago("2026-11-11", "13:44"), TZ).label).toBe("Open now");
  });

  it("is closed between lunch and dinner, and says when it reopens", () => {
    expect(getOpenStatus(split, chicago("2026-11-11", "15:00"), TZ)).toEqual({
      open: false,
      label: "Closed",
      detail: "Opens 4:30 PM",
    });
  });

  it("treats the closing minute as closed and the opening minute as open", () => {
    expect(getOpenStatus(split, chicago("2026-11-11", "14:30"), TZ).open).toBe(false);
    expect(getOpenStatus(split, chicago("2026-11-11", "16:30"), TZ).open).toBe(true);
    expect(getOpenStatus(split, chicago("2026-11-11", "10:59"), TZ)).toMatchObject({ open: false, detail: "Opens 11 AM" });
  });

  it("points to tomorrow after the last shift", () => {
    expect(getOpenStatus(split, chicago("2026-11-11", "22:00"), TZ).detail).toBe("Opens tomorrow 11 AM");
  });

  it("skips a holiday closure and names the next open day", () => {
    // Wednesday night before Thanksgiving: Thursday is closed, so the next opening is Friday.
    expect(getOpenStatus(split, chicago("2026-11-25", "22:00"), TZ).detail).toBe("Opens Friday 11 AM");
    // On Thanksgiving itself, at what would normally be lunch.
    expect(getOpenStatus(split, chicago("2026-11-26", "12:00"), TZ)).toMatchObject({
      open: false,
      detail: "Opens tomorrow 11 AM",
    });
  });

  it("uses special hours on an exception date", () => {
    expect(getOpenStatus(split, chicago("2026-12-24", "14:00"), TZ)).toMatchObject({ open: true, detail: "until 3 PM" });
    expect(getOpenStatus(split, chicago("2026-12-24", "17:00"), TZ).open).toBe(false);
  });

  it("stays open past midnight on a late close", () => {
    // 12:30 AM Saturday still belongs to Friday's 5 PM to 1 AM shift.
    expect(getOpenStatus(lateNight, chicago("2026-11-14", "00:30"), TZ)).toEqual({
      open: true,
      label: "Closing soon",
      detail: "until 1 AM",
    });
    expect(getOpenStatus(lateNight, chicago("2026-11-14", "01:00"), TZ)).toMatchObject({ open: false, detail: "Opens 5 PM" });
  });

  it("names the day when the next opening is more than a day away", () => {
    // Sunday 11:30 PM: closed Monday, so Tuesday.
    expect(getOpenStatus(lateNight, chicago("2026-11-15", "23:30"), TZ).detail).toBe("Opens Tuesday 5 PM");
  });

  it("copes with a restaurant that has no hours on any reachable day", () => {
    const never: Hours = { regular: [{ days: ["mon"], open: "09:00", close: "10:00" }], notes: [], exceptions: [] };
    expect(getOpenStatus(never, chicago("2026-11-10", "12:00"), TZ)).toMatchObject({ open: false, detail: "Opens Monday 9 AM" });
  });
});

describe("upcomingExceptions", () => {
  it("lists exceptions inside the window, soonest first", () => {
    expect(upcomingExceptions(split, "2026-11-11")).toEqual([
      { date: "2026-11-26", label: "Thanksgiving Day", text: "Closed" },
      { date: "2026-12-24", label: "Christmas Eve", text: "11 AM – 3 PM" },
    ]);
  });

  it("drops past dates and dates beyond the window", () => {
    expect(upcomingExceptions(split, "2026-11-27", 14)).toEqual([]);
    expect(upcomingExceptions(split, "2026-12-25")).toEqual([]);
  });
});
