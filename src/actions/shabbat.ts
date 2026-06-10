"use server";

import { prisma } from "@/lib/db";
import { isShabbatShift, ShiftHour } from "@/lib/scheduler/types";

export interface ShabbatSoldierRow {
  soldierId: string;
  name: string;
  color: string;
  shabbatShiftsThisWeek: number;
  closedShabbatThisWeek: boolean;
  totalShabbatShifts: number;
  closedShabbatWeeks: number; // distinct weeks they closed Shabbat
  lastClosedWeek: string | null;
}

/**
 * Returns Shabbat closure stats per soldier:
 * - For the given week
 * - Aggregated across all weeks (totalShabbatShifts, closedShabbatWeeks, lastClosedWeek)
 */
export async function getShabbatTracking(weekStartIso: string): Promise<{
  weekStartIso: string;
  soldiers: ShabbatSoldierRow[];
}> {
  const ws = new Date(weekStartIso);

  const [soldiers, allAssignments] = await Promise.all([
    prisma.soldier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.findMany({
      where: { soldierId: { not: null } },
      select: {
        soldierId: true,
        date: true,
        startHour: true,
        schedule: { select: { weekStartDate: true } },
      },
    }),
  ]);

  type Row = {
    shabbatShiftsThisWeek: number;
    totalShabbatShifts: number;
    closedWeeks: Set<string>;
    lastClosedWeek: Date | null;
  };
  const rows = new Map<string, Row>();
  for (const s of soldiers) {
    rows.set(s.id, {
      shabbatShiftsThisWeek: 0,
      totalShabbatShifts: 0,
      closedWeeks: new Set(),
      lastClosedWeek: null,
    });
  }

  for (const a of allAssignments) {
    if (!a.soldierId) continue;
    const row = rows.get(a.soldierId);
    if (!row) continue;
    const weekMs = a.schedule.weekStartDate.getTime();
    const dayIndex = Math.floor(
      (a.date.getTime() - weekMs) / (24 * 60 * 60 * 1000)
    );
    if (!isShabbatShift(dayIndex, a.startHour as ShiftHour)) continue;

    row.totalShabbatShifts += 1;
    const weekKey = a.schedule.weekStartDate.toISOString();
    row.closedWeeks.add(weekKey);
    if (
      !row.lastClosedWeek ||
      a.schedule.weekStartDate.getTime() > row.lastClosedWeek.getTime()
    ) {
      row.lastClosedWeek = a.schedule.weekStartDate;
    }
    if (a.schedule.weekStartDate.getTime() === ws.getTime()) {
      row.shabbatShiftsThisWeek += 1;
    }
  }

  return {
    weekStartIso: ws.toISOString(),
    soldiers: soldiers.map((s) => {
      const r = rows.get(s.id)!;
      return {
        soldierId: s.id,
        name: s.name,
        color: s.color,
        shabbatShiftsThisWeek: r.shabbatShiftsThisWeek,
        closedShabbatThisWeek: r.shabbatShiftsThisWeek > 0,
        totalShabbatShifts: r.totalShabbatShifts,
        closedShabbatWeeks: r.closedWeeks.size,
        lastClosedWeek: r.lastClosedWeek?.toISOString() ?? null,
      };
    }),
  };
}
