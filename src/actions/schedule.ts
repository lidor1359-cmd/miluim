"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { solveSchedule, refineSchedule } from "@/lib/scheduler/solver";
import {
  DAYS_IN_WEEK,
  SHIFT_HOURS,
  ShiftHour,
  getSlotStartMs,
} from "@/lib/scheduler/types";
import { getWeekStart } from "@/lib/dates";

export async function getOrCreateSchedule(weekStart: Date) {
  const ws = getWeekStart(weekStart);
  let schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
    include: {
      assignments: {
        include: { soldier: true, position: true },
      },
    },
  });
  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: { weekStartDate: ws },
      include: {
        assignments: {
          include: { soldier: true, position: true },
        },
      },
    });
  }
  return schedule;
}

export async function getScheduleData(weekStart: Date) {
  const ws = getWeekStart(weekStart);
  const [schedule, soldiers, positions, preferences] = await Promise.all([
    getOrCreateSchedule(ws),
    prisma.soldier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.slotPreference.findMany({
      where: { weekStartDate: ws },
    }),
  ]);
  return { schedule, soldiers, positions, preferences };
}

export async function setAssignment(
  scheduleId: string,
  dayIndex: number,
  hour: number,
  positionId: string,
  soldierId: string | null,
  weekStartIso: string
) {
  const ws = new Date(weekStartIso);
  const date = new Date(getSlotStartMs(ws.getTime(), dayIndex, hour as ShiftHour));

  await prisma.assignment.upsert({
    where: {
      scheduleId_date_startHour_positionId: {
        scheduleId,
        date,
        startHour: hour,
        positionId,
      },
    },
    create: {
      scheduleId,
      date,
      startHour: hour,
      positionId,
      soldierId,
    },
    update: {
      soldierId,
    },
  });
  revalidatePath(`/admin/schedule/${weekStartIso.slice(0, 10)}`);
  return { success: true };
}

// Soldiers excluded from the auto-pool - kept only through locked manual assignments.
const MANUAL_ONLY_SOLDIER_NAMES = new Set<string>(["כיפת ברזל"]);

export async function autoGenerate(scheduleId: string, weekStartIso: string) {
  const ws = new Date(weekStartIso);
  const weekStartMs = ws.getTime();

  // Only count preferences from soldiers who submitted (or schedule is LOCKED)
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });
  const useAllPreferences = schedule?.constraintsState === "LOCKED";

  const [allSoldiers, positions, allPreferences, submissions, lockedRows] =
    await Promise.all([
      prisma.soldier.findMany({ where: { active: true } }),
      prisma.position.findMany({ orderBy: { displayOrder: "asc" } }),
      prisma.slotPreference.findMany({ where: { weekStartDate: ws } }),
      prisma.soldierWeekSubmission.findMany({ where: { weekStartDate: ws } }),
      prisma.assignment.findMany({
        where: { scheduleId, locked: true, soldierId: { not: null } },
      }),
    ]);

  // Filter to only preferences from submitted soldiers (unless locked = all approved)
  const submittedSoldierIds = new Set(submissions.map((s) => s.soldierId));
  const activePreferences = useAllPreferences
    ? allPreferences
    : allPreferences.filter((p) => submittedSoldierIds.has(p.soldierId));

  const positionIdSet = new Set(positions.map((p) => p.id));

  // Build locked existing assignments to feed the solver
  const existingAssignments = lockedRows
    .filter((a) => a.soldierId && positionIdSet.has(a.positionId))
    .map((a) => ({
      dayIndex: Math.floor(
        (a.date.getTime() - weekStartMs) / (24 * 60 * 60 * 1000)
      ),
      hour: a.startHour as ShiftHour,
      positionId: a.positionId,
      soldierId: a.soldierId as string,
      locked: true,
    }));

  // Exclude manual-only soldiers (e.g. Iron Dome) from the auto-pool.
  // They remain in the schedule only via their locked existingAssignments.
  const soldierLite = allSoldiers
    .filter((s) => !MANUAL_ONLY_SOLDIER_NAMES.has(s.name))
    .map((s) => ({ id: s.id, name: s.name, color: s.color }));

  const solverInput = {
    weekStartMs,
    soldiers: soldierLite,
    positionIds: positions.map((p) => p.id),
    preferences: activePreferences.map((p) => ({
      soldierId: p.soldierId,
      dayIndex: p.dayIndex,
      hour: p.hour as ShiftHour,
      kind: p.kind as "BLACK" | "GREEN",
    })),
    existingAssignments,
  };

  const result = solveSchedule(solverInput);

  // Refine with simulated annealing (locked slots won't be swapped)
  const refined = result.success
    ? refineSchedule(solverInput, result.assignments, 3000)
    : result;

  // Clear existing assignments and write new ones (locked included)
  await prisma.assignment.deleteMany({ where: { scheduleId } });

  const lockedKeySet = new Set(
    existingAssignments.map(
      (a) => `${a.dayIndex}-${a.hour}-${a.positionId}`
    )
  );

  const data: {
    scheduleId: string;
    date: Date;
    startHour: number;
    positionId: string;
    soldierId: string | null;
    locked: boolean;
  }[] = [];

  const generatedMap = new Map<string, string>();
  for (const a of refined.assignments) {
    const key = `${a.dayIndex}-${a.hour}-${a.positionId}`;
    generatedMap.set(key, a.soldierId);
  }

  for (let d = 0; d < DAYS_IN_WEEK; d++) {
    for (const h of SHIFT_HOURS) {
      for (const p of positions) {
        const key = `${d}-${h}-${p.id}`;
        const soldierId = generatedMap.get(key) ?? null;
        const date = new Date(getSlotStartMs(weekStartMs, d, h));
        data.push({
          scheduleId,
          date,
          startHour: h,
          positionId: p.id,
          soldierId,
          locked: lockedKeySet.has(key),
        });
      }
    }
  }

  await prisma.assignment.createMany({ data });

  revalidatePath(`/admin/schedule/${weekStartIso.slice(0, 10)}`);
  return {
    success: refined.success,
    stats: refined.stats,
    conflicts: refined.conflicts,
    unassignedCount: refined.unassigned.length,
  };
}

export async function clearSchedule(scheduleId: string, weekStartIso: string) {
  await prisma.assignment.deleteMany({ where: { scheduleId } });
  revalidatePath(`/admin/schedule/${weekStartIso.slice(0, 10)}`);
  return { success: true };
}

export async function setAssignmentLock(
  scheduleId: string,
  dayIndex: number,
  hour: number,
  positionId: string,
  locked: boolean,
  weekStartIso: string
) {
  const ws = new Date(weekStartIso);
  const date = new Date(getSlotStartMs(ws.getTime(), dayIndex, hour as ShiftHour));

  await prisma.assignment.updateMany({
    where: {
      scheduleId,
      date,
      startHour: hour,
      positionId,
    },
    data: { locked },
  });
  revalidatePath(`/admin/schedule/${weekStartIso.slice(0, 10)}`);
  return { success: true };
}

export async function lockAllFilled(scheduleId: string, weekStartIso: string) {
  const res = await prisma.assignment.updateMany({
    where: { scheduleId, soldierId: { not: null } },
    data: { locked: true },
  });
  revalidatePath(`/admin/schedule/${weekStartIso.slice(0, 10)}`);
  return { success: true, count: res.count };
}

export async function unlockAll(scheduleId: string, weekStartIso: string) {
  const res = await prisma.assignment.updateMany({
    where: { scheduleId, locked: true },
    data: { locked: false },
  });
  revalidatePath(`/admin/schedule/${weekStartIso.slice(0, 10)}`);
  return { success: true, count: res.count };
}

export async function publishSchedule(scheduleId: string, weekStartIso: string) {
  await prisma.schedule.update({
    where: { id: scheduleId },
    data: { status: "PUBLISHED" },
  });
  revalidatePath(`/admin/schedule/${weekStartIso.slice(0, 10)}`);
  revalidatePath("/c");
  return { success: true };
}

/* ===== Soldier-facing schedule queries ===== */

/**
 * שבוע ברירת המחדל לתצוגת השבצ"ק לחייל:
 *  1. שבוע נוכחי אם יש לו שבצ"ק מפורסם
 *  2. אחרת — השבוע המפורסם הקרוב ביותר בעתיד
 *  3. אחרת — השבוע המפורסם האחרון בעבר
 *  4. אחרת — null
 */
export async function getActiveSoldierScheduleWeek(): Promise<Date | null> {
  const today = new Date();
  const currentWeek = getWeekStart(today);

  const current = await prisma.schedule.findUnique({
    where: { weekStartDate: currentWeek },
  });
  if (current && current.status === "PUBLISHED") return current.weekStartDate;

  const future = await prisma.schedule.findFirst({
    where: { status: "PUBLISHED", weekStartDate: { gt: currentWeek } },
    orderBy: { weekStartDate: "asc" },
  });
  if (future) return future.weekStartDate;

  const past = await prisma.schedule.findFirst({
    where: { status: "PUBLISHED", weekStartDate: { lt: currentWeek } },
    orderBy: { weekStartDate: "desc" },
  });
  if (past) return past.weekStartDate;

  return null;
}

/**
 * השבוע המפורסם הסמוך לפני/אחרי שבוע נתון (לניווט בעמוד החייל).
 */
export async function getAdjacentPublishedWeek(
  weekStartIso: string,
  direction: "prev" | "next"
): Promise<string | null> {
  const ws = getWeekStart(new Date(weekStartIso));
  const found = await prisma.schedule.findFirst({
    where: {
      status: "PUBLISHED",
      weekStartDate: direction === "prev" ? { lt: ws } : { gt: ws },
    },
    orderBy: { weekStartDate: direction === "prev" ? "desc" : "asc" },
  });
  return found ? found.weekStartDate.toISOString() : null;
}

/**
 * תצוגת שבצ"ק לחייל:
 * - רק אם השבוע במצב PUBLISHED.
 * - מחזיר את כל המשמרות (לכל החיילים, לכל העמדות) — תצוגת שבצ"ק מלא.
 * - בנוסף, רשימה מסוננת של המשמרות של החייל עצמו לנוחות.
 */
export async function getSoldierScheduleView(
  soldierId: string,
  weekStartIso: string
) {
  const ws = getWeekStart(new Date(weekStartIso));
  const [schedule, soldiers, positions] = await Promise.all([
    prisma.schedule.findUnique({
      where: { weekStartDate: ws },
      include: {
        assignments: true,
      },
    }),
    prisma.soldier.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  if (!schedule || schedule.status !== "PUBLISHED") return null;

  const weekStartMs = ws.getTime();
  const assignments = schedule.assignments.map((a) => {
    const dayIndex = Math.floor(
      (a.date.getTime() - weekStartMs) / (24 * 60 * 60 * 1000)
    );
    return {
      dayIndex,
      hour: a.startHour,
      positionId: a.positionId,
      soldierId: a.soldierId,
    };
  });

  const myShifts = assignments
    .filter((a) => a.soldierId === soldierId)
    .sort((a, b) => a.dayIndex - b.dayIndex || a.hour - b.hour);

  return {
    weekStartIso: ws.toISOString(),
    weekStartMs,
    soldiers: soldiers.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })),
    positions: positions.map((p) => ({ id: p.id, name: p.name })),
    assignments,
    myShifts,
  };
}
