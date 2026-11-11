/**
 * Opening-hours logic: grouping for display and the "Open now" status.
 * Pure functions with no framework imports so they are easy to test.
 */
import { DAYS, type Day } from "./days";
import type { SiteConfig } from "./schema";

type Hours = SiteConfig["hours"];
export type Interval = { open: number; close: number }; // minutes from midnight; close may exceed 1440

export const DAY_LABEL: Record<Day, { short: string; long: string }> = {
  mon: { short: "Mon", long: "Monday" },
  tue: { short: "Tue", long: "Tuesday" },
  wed: { short: "Wed", long: "Wednesday" },
  thu: { short: "Thu", long: "Thursday" },
  fri: { short: "Fri", long: "Friday" },
  sat: { short: "Sat", long: "Saturday" },
  sun: { short: "Sun", long: "Sunday" },
};

const SCHEMA_DAY: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "11:00" -> "11 AM", "16:30" -> "4:30 PM", "00:00" -> "12 AM" */
export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatMinutes(mins: number): string {
  const t = ((mins % 1440) + 1440) % 1440;
  return formatTime(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
}

/** Intervals for one weekday, sorted, with after-midnight closes pushed past 1440. */
export function intervalsFor(hours: Hours, day: Day): Interval[] {
  return hours.regular
    .filter((r) => r.days.includes(day))
    .map((r) => {
      const open = toMinutes(r.open);
      let close = toMinutes(r.close);
      if (close <= open) close += 1440;
      return { open, close };
    })
    .sort((a, b) => a.open - b.open);
}

function describeIntervals(list: Interval[]): string {
  if (list.length === 0) return "Closed";
  return list.map((i) => `${formatMinutes(i.open)} – ${formatMinutes(i.close)}`).join(", ");
}

export type HoursRow = { days: Day[]; label: string; hours: string; closed: boolean };

/** Collapse consecutive days with identical hours: "Mon – Thu  11 AM – 9:30 PM". */
export function groupHours(hours: Hours): HoursRow[] {
  const rows: HoursRow[] = [];
  for (const day of DAYS) {
    const text = describeIntervals(intervalsFor(hours, day));
    const last = rows[rows.length - 1];
    if (last && last.hours === text) {
      last.days.push(day);
    } else {
      rows.push({ days: [day], label: "", hours: text, closed: text === "Closed" });
    }
  }
  for (const row of rows) {
    const first = DAY_LABEL[row.days[0]];
    const lastDay = DAY_LABEL[row.days[row.days.length - 1]];
    row.label =
      row.days.length === 1
        ? first.long
        : row.days.length === 2
          ? `${first.short} & ${lastDay.short}`
          : `${first.short} – ${lastDay.short}`;
  }
  return rows;
}

/** schema.org openingHoursSpecification entries. */
export function openingHoursSpecification(hours: Hours) {
  return hours.regular.map((r) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: r.days.map((d) => `https://schema.org/${SCHEMA_DAY[d]}`),
    opens: r.open,
    closes: r.close,
  }));
}

/* ------------------------------ Open now ---------------------------------- */

type LocalNow = { day: Day; minutes: number; date: string };

const WEEKDAY_TO_DAY: Record<string, Day> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/** The restaurant's local weekday, date and time for an instant. */
export function localNow(now: Date, timeZone: string): LocalNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: WEEKDAY_TO_DAY[get("weekday")],
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Intervals for a calendar date, honoring exceptions (holidays, special hours). */
export function intervalsOn(hours: Hours, date: string, day: Day): { list: Interval[]; label?: string } {
  const ex = hours.exceptions.find((e) => e.date === date);
  if (ex) {
    if (ex.closed || !ex.open || !ex.close) return { list: [], label: ex.label };
    const open = toMinutes(ex.open);
    let close = toMinutes(ex.close);
    if (close <= open) close += 1440;
    return { list: [{ open, close }], label: ex.label };
  }
  return { list: intervalsFor(hours, day) };
}

export type OpenStatus = {
  open: boolean;
  /** "Open now" | "Closing soon" | "Closed" */
  label: string;
  /** "until 9:30 PM" | "Opens 4:30 PM" | "Opens Thursday 11 AM" */
  detail: string;
};

const CLOSING_SOON_MINUTES = 45;

export function getOpenStatus(hours: Hours, now: Date, timeZone: string): OpenStatus {
  const local = localNow(now, timeZone);
  const dayIndex = DAYS.indexOf(local.day);

  // Still open from yesterday's late close?
  const yesterday = DAYS[(dayIndex + 6) % 7];
  const prev = intervalsOn(hours, addDays(local.date, -1), yesterday).list;
  for (const i of prev) {
    if (i.close > 1440 && local.minutes < i.close - 1440) {
      const left = i.close - 1440 - local.minutes;
      return {
        open: true,
        label: left <= CLOSING_SOON_MINUTES ? "Closing soon" : "Open now",
        detail: `until ${formatMinutes(i.close)}`,
      };
    }
  }

  const today = intervalsOn(hours, local.date, local.day).list;
  for (const i of today) {
    if (local.minutes >= i.open && local.minutes < i.close) {
      const left = i.close - local.minutes;
      return {
        open: true,
        label: left <= CLOSING_SOON_MINUTES ? "Closing soon" : "Open now",
        detail: `until ${formatMinutes(i.close)}`,
      };
    }
  }

  const laterToday = today.find((i) => i.open > local.minutes);
  if (laterToday) {
    return { open: false, label: "Closed", detail: `Opens ${formatMinutes(laterToday.open)}` };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const day = DAYS[(dayIndex + offset) % 7];
    const next = intervalsOn(hours, addDays(local.date, offset), day).list[0];
    if (next) {
      const when = offset === 1 ? "tomorrow" : DAY_LABEL[day].long;
      return { open: false, label: "Closed", detail: `Opens ${when} ${formatMinutes(next.open)}` };
    }
  }
  return { open: false, label: "Closed", detail: "" };
}

/** Exceptions from `today` ("YYYY-MM-DD") through the next `days` days, for a "Holiday hours" note. */
export function upcomingExceptions(hours: Hours, today: string, days = 45) {
  const end = addDays(today, days);
  return hours.exceptions
    .filter((e) => e.date >= today && e.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date,
      label: e.label,
      text: e.closed || !e.open || !e.close ? "Closed" : `${formatTime(e.open)} – ${formatTime(e.close)}`,
    }));
}

/** "2026-12-24" -> "Thu, Dec 24" */
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}
