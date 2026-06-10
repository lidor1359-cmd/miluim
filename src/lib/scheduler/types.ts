// Domain types for the scheduling engine

export const SHIFT_HOURS = [2, 6, 10, 14, 18, 22] as const;
export type ShiftHour = (typeof SHIFT_HOURS)[number];

export const NIGHT_SHIFT_HOURS: ShiftHour[] = [22, 2];
export const SHIFT_DURATION_HOURS = 4;
export const MIN_REST_HOURS = 8;
// Gap between start of two consecutive shifts (shift duration + rest)
export const MIN_GAP_HOURS = SHIFT_DURATION_HOURS + MIN_REST_HOURS; // = 12

export const DAYS_IN_WEEK = 7;
export const DAY_NAMES_HE = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
];

export interface SlotKey {
  dayIndex: number; // 0 = Sunday
  hour: ShiftHour;
  positionId: string;
}

export interface SoldierLite {
  id: string;
  name: string;
  color: string;
}

export type PreferenceKind = "BLACK" | "GREEN";

// Per-cell preference: שחור = לא יכול (hard), ירוק = רוצה (reward בציון)
export interface PreferenceLite {
  soldierId: string;
  dayIndex: number;
  hour: ShiftHour;
  kind: PreferenceKind;
}

export interface SolverInput {
  weekStartMs: number; // Sunday 00:00 IL in ms
  soldiers: SoldierLite[];
  positionIds: string[];
  preferences: PreferenceLite[];
  // Existing assignments (partial schedule, kept fixed if locked)
  existingAssignments?: Array<{
    dayIndex: number;
    hour: ShiftHour;
    positionId: string;
    soldierId: string;
    locked?: boolean;
  }>;
}

export interface SolverAssignment {
  dayIndex: number;
  hour: ShiftHour;
  positionId: string;
  soldierId: string;
  locked?: boolean;
}

export interface SolverResult {
  success: boolean;
  assignments: SolverAssignment[];
  unassigned: SlotKey[];
  conflicts: string[]; // human-readable
  stats: SolverStats;
}

export interface SolverStats {
  totalShifts: number;
  assignedShifts: number;
  shiftsPerSoldier: Record<string, number>;
  nightShiftsPerSoldier: Record<string, number>;
  weekendShiftsPerSoldier: Record<string, number>;
  fairnessScore: number;
  durationMs: number;
}

export function getSlotStartMs(
  weekStartMs: number,
  dayIndex: number,
  hour: ShiftHour
): number {
  return weekStartMs + dayIndex * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000;
}

export function isNightShift(hour: ShiftHour): boolean {
  return NIGHT_SHIFT_HOURS.includes(hour);
}

export function isWeekendDay(dayIndex: number): boolean {
  // Friday = 5, Saturday = 6
  return dayIndex === 5 || dayIndex === 6;
}

/**
 * Shabbat = Friday 18:00 → Saturday 22:00 (close of shift slot).
 * dayIndex 5 (Fri), hours 18, 22 + dayIndex 6 (Sat) all hours.
 */
export function isShabbatShift(dayIndex: number, hour: ShiftHour): boolean {
  if (dayIndex === 5) return hour === 18 || hour === 22;
  if (dayIndex === 6) return true;
  return false;
}
