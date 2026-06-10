// Date utilities for the scheduling app (Israel timezone)
import { addDays, format, startOfWeek, parseISO, isValid } from "date-fns";

const IL_TZ = "Asia/Jerusalem";

/**
 * Returns the start of the week (Sunday at 00:00 local) for the given date.
 * Treats date as Israel local time.
 */
export function getWeekStart(date: Date): Date {
  // weekStartsOn: 0 = Sunday
  return startOfWeek(date, { weekStartsOn: 0 });
}

export function formatWeekStartParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseWeekStartParam(param: string): Date | null {
  const d = parseISO(param + "T00:00:00");
  return isValid(d) ? d : null;
}

export function formatDateHe(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

export function formatDayMonthHe(date: Date): string {
  return format(date, "dd/MM");
}

export function getDayDate(weekStart: Date, dayIndex: number): Date {
  return addDays(weekStart, dayIndex);
}

export { IL_TZ };
