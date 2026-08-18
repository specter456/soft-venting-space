/**
 * Local calendar helpers for the Venting calendar.
 *
 * All keys use the device's local date (never UTC), so a day never shifts
 * just because the clock/zone differs. Everything is on-device.
 */

/** "YYYY-MM-DD" in local time — the storage key for a day's entries. */
export function dateKeyFor(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Saturday, 16 August" — the soft day header. */
export function formatDayHeader(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "August 2026" — the month header. */
export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface MonthCell {
  date: Date;
  dateKey: string;
  inMonth: boolean;
}

/**
 * The cells of a month grid, Sunday-first. Leading cells belong to the
 * previous month and are rendered invisibly to keep the grid aligned.
 */
export function buildMonthCells(viewDate: Date): MonthCell[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // 0 = Sunday
  const cells: MonthCell[] = [];
  for (let i = 0; i < leading; i++) {
    const d = new Date(year, month, i - leading + 1);
    cells.push({ date: d, dateKey: dateKeyFor(d), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({ date: d, dateKey: dateKeyFor(d), inMonth: true });
  }
  return cells;
}
