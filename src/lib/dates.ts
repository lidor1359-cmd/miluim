// Date utilities for the scheduling app (Israel timezone)
import { addDays, format, startOfWeek, parseISO, isValid } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

const IL_TZ = "Asia/Jerusalem";

/**
 * Returns the start of the week (Sunday at 00:00 Israel time) for the given date.
 * Treats the input date as Israel local time.
 */
export function getWeekStart(date: Date): Date {
  // Convert the UTC timestamp to Israel date components
  const zoned = toZonedTime(date, IL_TZ);
  // Find Sunday (weekStartsOn: 0)
  const sunday = startOfWeek(zoned, { weekStartsOn: 0 });
  // Convert Sunday 00:00 Israel back to UTC Date
  return fromZonedTime(sunday, IL_TZ);
}

export function formatWeekStartParam(date: Date): string {
  return formatInTimeZone(date, IL_TZ, "yyyy-MM-dd");
}

export function parseWeekStartParam(param: string): Date | null {
  const d = fromZonedTime(`${param}T00:00:00`, IL_TZ);
  return isValid(d) ? d : null;
}

export function formatDateHe(date: Date): string {
  return formatInTimeZone(date, IL_TZ, "dd/MM/yyyy");
}

export function formatDayMonthHe(date: Date): string {
  return formatInTimeZone(date, IL_TZ, "dd/MM");
}

export function getDayDate(weekStart: Date, dayIndex: number): Date {
  return addDays(weekStart, dayIndex);
}

export { IL_TZ };
