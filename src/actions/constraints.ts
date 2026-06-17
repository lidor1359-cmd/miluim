"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getWeekStart } from "@/lib/dates";
import { SHIFT_HOURS, getSlotStartMs, type ShiftHour } from "@/lib/scheduler/types";
import { getCurrentSoldierId } from "@/lib/soldier-session";

const MAX_GREEN = 10;
type PreferenceKind = "BLACK" | "GREEN";

/* ===== Helpers ===== */

function isValidSlot(dayIndex: number, hour: number): boolean {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 7) return false;
  return (SHIFT_HOURS as readonly number[]).includes(hour);
}

async function getOrCreateScheduleForWeek(weekStart: Date) {
  const ws = getWeekStart(weekStart);
  let schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
  });
  if (!schedule) {
    schedule = await prisma.schedule.create({ data: { weekStartDate: ws } });
  }
  return schedule;
}

/* ===== Soldier-facing ===== */

/**
 * מחזיר את החייל הנוכחי לפי ה-cookie, או null אם אין session או שהחייל לא פעיל.
 */
async function getCurrentSoldier() {
  const soldierId = getCurrentSoldierId();
  if (!soldierId) return null;
  const soldier = await prisma.soldier.findUnique({ where: { id: soldierId } });
  if (!soldier || !soldier.active) return null;
  return soldier;
}

/**
 * Active constraint week = the open/locked schedule closest to today (preferring OPEN).
 * If none, default to next Sunday.
 */
export async function getActiveConstraintWeek(): Promise<Date> {
  const today = new Date();
  // Try to find an OPEN window first
  const openSchedule = await prisma.schedule.findFirst({
    where: { constraintsState: "OPEN" },
    orderBy: { weekStartDate: "desc" },
  });
  if (openSchedule) return openSchedule.weekStartDate;
  // Fallback: next Sunday's week
  return getWeekStart(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
}

/**
 * מחזיר את כל הנתונים שחייל צריך לראות:
 * - פרטיו, מצב חלון אילוצים, ההעדפות שלו לשבוע, האם הגיש סופית
 */
export async function getSoldierConstraintView(weekStart: Date) {
  const ws = getWeekStart(weekStart);
  const soldier = await getCurrentSoldier();
  if (!soldier) return null;

  const [schedule, preferences, submission, note, lockedAssignments] = await Promise.all([
    prisma.schedule.findUnique({ where: { weekStartDate: ws } }),
    prisma.slotPreference.findMany({
      where: { soldierId: soldier.id, weekStartDate: ws },
    }),
    prisma.soldierWeekSubmission.findUnique({
      where: {
        soldierId_weekStartDate: {
          soldierId: soldier.id,
          weekStartDate: ws,
        },
      },
    }),
    prisma.soldierWeekNote.findUnique({
      where: {
        soldierId_weekStartDate: {
          soldierId: soldier.id,
          weekStartDate: ws,
        },
      },
    }),
    prisma.assignment.findMany({
      where: {
        schedule: { weekStartDate: ws },
        locked: true,
        soldierId: { not: null },
      },
      include: { soldier: true, position: true },
    }),
  ]);

  const wsMs = ws.getTime();
  const lockedShifts = lockedAssignments.map((a) => ({
    dayIndex: Math.floor((a.date.getTime() - wsMs) / (24 * 60 * 60 * 1000)),
    hour: a.startHour,
    soldierName: a.soldier!.name,
    soldierColor: a.soldier!.color,
    positionName: a.position.name,
  }));

  return {
    soldier: {
      id: soldier.id,
      name: soldier.name,
      color: soldier.color,
    },
    weekStartIso: ws.toISOString(),
    constraintsState: schedule?.constraintsState ?? "NOT_OPENED",
    preferences: preferences.map((p) => ({
      dayIndex: p.dayIndex,
      hour: p.hour,
      kind: p.kind as PreferenceKind,
    })),
    submitted: !!submission,
    submittedAt: submission?.submittedAt.toISOString() ?? null,
    note: note?.text ?? "",
    limits: { maxGreen: MAX_GREEN },
    lockedShifts,
  };
}

/**
 * Toggle a preference cycling: empty → BLACK → empty.
 * Enforces max count and OPEN window state.
 */
export async function togglePreference(
  weekStartIso: string,
  dayIndex: number,
  hour: number
) {
  const soldier = await getCurrentSoldier();
  if (!soldier) return { error: "יש להתחבר מחדש" };
  if (!isValidSlot(dayIndex, hour)) return { error: "תא לא תקין" };

  const ws = getWeekStart(new Date(weekStartIso));
  const schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
  });
  if (!schedule || schedule.constraintsState !== "OPEN") {
    return { error: "חלון האילוצים אינו פתוח לעריכה" };
  }

  // Check if already submitted - block editing
  const submission = await prisma.soldierWeekSubmission.findUnique({
    where: {
      soldierId_weekStartDate: { soldierId: soldier.id, weekStartDate: ws },
    },
  });
  if (submission) {
    return { error: "כבר הגשת אילוצים סופית. בטל הגשה לפני עריכה" };
  }

  // Block toggling on cells that are already locked (pre-set in schedule)
  const slotDate = new Date(getSlotStartMs(ws.getTime(), dayIndex, hour as ShiftHour));
  const lockedHere = await prisma.assignment.findFirst({
    where: {
      schedule: { weekStartDate: ws },
      date: slotDate,
      startHour: hour,
      locked: true,
      soldierId: { not: null },
    },
  });
  if (lockedHere) {
    return { error: "המשמרת הזו כבר משובצת ולא ניתנת לסימון" };
  }

  const existing = await prisma.slotPreference.findUnique({
    where: {
      soldierId_weekStartDate_dayIndex_hour: {
        soldierId: soldier.id,
        weekStartDate: ws,
        dayIndex,
        hour,
      },
    },
  });

  // Cycle: null → BLACK → null
  const next: PreferenceKind | null = existing ? null : "BLACK";

  if (next === null) {
    if (existing) {
      await prisma.slotPreference.delete({ where: { id: existing.id } });
    }
  } else if (existing) {
    await prisma.slotPreference.update({
      where: { id: existing.id },
      data: { kind: next },
    });
  } else {
    await prisma.slotPreference.create({
      data: {
        soldierId: soldier.id,
        weekStartDate: ws,
        dayIndex,
        hour,
        kind: next,
      },
    });
  }

  revalidatePath("/c");
  return { success: true, kind: next };
}

/**
 * Final submission - locks editing until admin unlocks or window closes.
 */
export async function submitConstraints(weekStartIso: string) {
  const soldier = await getCurrentSoldier();
  if (!soldier) return { error: "יש להתחבר מחדש" };

  const ws = getWeekStart(new Date(weekStartIso));
  const schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
  });
  if (!schedule || schedule.constraintsState !== "OPEN") {
    return { error: "חלון האילוצים אינו פתוח" };
  }

  await prisma.soldierWeekSubmission.upsert({
    where: {
      soldierId_weekStartDate: { soldierId: soldier.id, weekStartDate: ws },
    },
    create: { soldierId: soldier.id, weekStartDate: ws },
    update: { submittedAt: new Date() },
  });

  revalidatePath("/c");
  return { success: true };
}

/**
 * Save (upsert) a free-text note/preferences for the current soldier for a given week.
 * Allowed while the window is OPEN and the soldier has not submitted yet.
 */
export async function saveSoldierNote(weekStartIso: string, text: string) {
  const soldier = await getCurrentSoldier();
  if (!soldier) return { error: "יש להתחבר מחדש" };

  const ws = getWeekStart(new Date(weekStartIso));
  const schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
  });
  if (!schedule || schedule.constraintsState !== "OPEN") {
    return { error: "חלון האילוצים אינו פתוח לעריכה" };
  }

  // Block editing if already submitted
  const submission = await prisma.soldierWeekSubmission.findUnique({
    where: {
      soldierId_weekStartDate: { soldierId: soldier.id, weekStartDate: ws },
    },
  });
  if (submission) {
    return { error: "כבר הגשת אילוצים סופית. בטל הגשה לפני עריכה" };
  }

  const trimmed = (text ?? "").slice(0, 2000);

  await prisma.soldierWeekNote.upsert({
    where: {
      soldierId_weekStartDate: { soldierId: soldier.id, weekStartDate: ws },
    },
    create: {
      soldierId: soldier.id,
      weekStartDate: ws,
      text: trimmed,
    },
    update: { text: trimmed },
  });

  revalidatePath("/c");
  return { success: true };
}

/**
 * Admin: get the free-text note of a soldier for a week (read-only).
 */
export async function getSoldierNote(soldierId: string, weekStartIso: string) {
  const ws = getWeekStart(new Date(weekStartIso));
  const note = await prisma.soldierWeekNote.findUnique({
    where: {
      soldierId_weekStartDate: { soldierId, weekStartDate: ws },
    },
  });
  return note?.text ?? "";
}

export async function unsubmitConstraints(weekStartIso: string) {
  const soldier = await getCurrentSoldier();
  if (!soldier) return { error: "יש להתחבר מחדש" };

  const ws = getWeekStart(new Date(weekStartIso));
  const schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
  });
  if (!schedule || schedule.constraintsState !== "OPEN") {
    return { error: "חלון האילוצים אינו פתוח" };
  }

  await prisma.soldierWeekSubmission.deleteMany({
    where: { soldierId: soldier.id, weekStartDate: ws },
  });
  revalidatePath("/c");
  return { success: true };
}

/* ===== Admin-facing ===== */

export async function openConstraintsWindow(weekStartIso: string) {
  const ws = getWeekStart(new Date(weekStartIso));
  const schedule = await getOrCreateScheduleForWeek(ws);
  await prisma.schedule.update({
    where: { id: schedule.id },
    data: {
      constraintsState: "OPEN",
      constraintsOpenedAt: new Date(),
      constraintsLockedAt: null,
    },
  });
  revalidatePath(`/admin/constraints`);
  return { success: true };
}

export async function lockConstraintsWindow(weekStartIso: string) {
  const ws = getWeekStart(new Date(weekStartIso));
  const schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
  });
  if (!schedule) return { error: "אין שבצ\"ק לשבוע זה" };
  await prisma.schedule.update({
    where: { id: schedule.id },
    data: {
      constraintsState: "LOCKED",
      constraintsLockedAt: new Date(),
    },
  });
  revalidatePath(`/admin/constraints`);
  return { success: true };
}

export async function reopenConstraintsWindow(weekStartIso: string) {
  const ws = getWeekStart(new Date(weekStartIso));
  const schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: ws },
  });
  if (!schedule) return { error: "אין שבצ\"ק לשבוע זה" };
  await prisma.schedule.update({
    where: { id: schedule.id },
    data: {
      constraintsState: "OPEN",
      constraintsLockedAt: null,
    },
  });
  revalidatePath(`/admin/constraints`);
  return { success: true };
}

/**
 * Admin dashboard: who submitted / who didn't, with their preference counts.
 */
export async function getSubmissionStatus(weekStartIso: string) {
  const ws = getWeekStart(new Date(weekStartIso));
  const [soldiers, preferences, submissions, schedule] = await Promise.all([
    prisma.soldier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.slotPreference.findMany({
      where: { weekStartDate: ws },
    }),
    prisma.soldierWeekSubmission.findMany({
      where: { weekStartDate: ws },
    }),
    prisma.schedule.findUnique({ where: { weekStartDate: ws } }),
  ]);

  const submissionMap = new Map(submissions.map((s) => [s.soldierId, s.submittedAt]));
  const blackBySoldier = new Map<string, number>();
  for (const p of preferences) {
    if (p.kind === "BLACK") {
      blackBySoldier.set(p.soldierId, (blackBySoldier.get(p.soldierId) || 0) + 1);
    }
  }

  return {
    weekStartIso: ws.toISOString(),
    constraintsState: schedule?.constraintsState ?? "NOT_OPENED",
    constraintsOpenedAt: schedule?.constraintsOpenedAt?.toISOString() ?? null,
    constraintsLockedAt: schedule?.constraintsLockedAt?.toISOString() ?? null,
    soldiers: soldiers.map((s) => ({
      id: s.id,
      name: s.name,
      personalId: s.personalId,
      color: s.color,
      submitted: submissionMap.has(s.id),
      submittedAt: submissionMap.get(s.id)?.toISOString() ?? null,
      blackCount: blackBySoldier.get(s.id) || 0,
    })),
  };
}

/**
 * Admin: get full preferences of a single soldier for a week (read-only view).
 */
export async function getSoldierPreferences(
  soldierId: string,
  weekStartIso: string
) {
  const ws = getWeekStart(new Date(weekStartIso));
  return prisma.slotPreference.findMany({
    where: { soldierId, weekStartDate: ws },
  });
}

/**
 * Admin: delete all constraints (preferences, submission, note) for a soldier in a week.
 */
export async function deleteSoldierConstraints(
  soldierId: string,
  weekStartIso: string
): Promise<{ success: true } | { error: string }> {
  try {
    const ws = getWeekStart(new Date(weekStartIso));
    await prisma.$transaction([
      prisma.slotPreference.deleteMany({
        where: { soldierId, weekStartDate: ws },
      }),
      prisma.soldierWeekSubmission.deleteMany({
        where: { soldierId, weekStartDate: ws },
      }),
      prisma.soldierWeekNote.deleteMany({
        where: { soldierId, weekStartDate: ws },
      }),
    ]);
    revalidatePath("/c");
    revalidatePath("/admin/constraints");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "שגיאה במחיקת האילוצים" };
  }
}

/**
 * Admin: toggle a preference cell for any soldier, bypassing window state and submission checks.
 */
export async function adminTogglePreference(
  soldierId: string,
  weekStartIso: string,
  dayIndex: number,
  hour: number
) {
  if (!isValidSlot(dayIndex, hour)) return { error: "תא לא תקין" };
  const ws = getWeekStart(new Date(weekStartIso));

  const existing = await prisma.slotPreference.findUnique({
    where: {
      soldierId_weekStartDate_dayIndex_hour: {
        soldierId,
        weekStartDate: ws,
        dayIndex,
        hour,
      },
    },
  });

  // Admin cycle: null → BLACK → null
  const next: PreferenceKind | null = existing ? null : "BLACK";

  if (next === null) {
    if (existing) {
      await prisma.slotPreference.delete({ where: { id: existing.id } });
    }
  } else if (existing) {
    await prisma.slotPreference.update({
      where: { id: existing.id },
      data: { kind: next },
    });
  } else {
    await prisma.slotPreference.create({
      data: {
        soldierId,
        weekStartDate: ws,
        dayIndex,
        hour,
        kind: next,
      },
    });
  }

  revalidatePath("/c");
  revalidatePath("/admin/constraints");
  return { success: true, kind: next };
}

/**
 * Admin: save (upsert) a note for a soldier for a week, bypassing window state checks.
 */
export async function adminSaveSoldierNote(
  soldierId: string,
  weekStartIso: string,
  text: string
): Promise<{ success: true } | { error: string }> {
  try {
    const ws = getWeekStart(new Date(weekStartIso));
    const trimmed = (text ?? "").slice(0, 2000);
    await prisma.soldierWeekNote.upsert({
      where: {
        soldierId_weekStartDate: { soldierId, weekStartDate: ws },
      },
      create: {
        soldierId,
        weekStartDate: ws,
        text: trimmed,
      },
      update: { text: trimmed },
    });
    revalidatePath("/c");
    revalidatePath("/admin/constraints");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "שגיאה בשמירת ההערה" };
  }
}
