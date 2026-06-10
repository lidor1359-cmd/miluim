/**
 * Export all data from the current DB (typically local SQLite)
 * into a JSON snapshot file. Used to migrate to Neon Postgres.
 *
 * Run:  pnpm tsx scripts/export-data.ts
 * Output: data-snapshot.json (gitignored, do NOT commit)
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

async function main() {
  const [
    soldiers,
    positions,
    schedules,
    slotPreferences,
    soldierWeekNotes,
    soldierWeekSubmissions,
    assignments,
    auditLogs,
  ] = await Promise.all([
    prisma.soldier.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.position.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.schedule.findMany({ orderBy: { weekStartDate: "asc" } }),
    prisma.slotPreference.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.soldierWeekNote.findMany(),
    prisma.soldierWeekSubmission.findMany(),
    prisma.assignment.findMany(),
    prisma.auditLog.findMany({ orderBy: { timestamp: "asc" } }),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    soldiers,
    positions,
    schedules,
    slotPreferences,
    soldierWeekNotes,
    soldierWeekSubmissions,
    assignments,
    auditLogs,
  };

  const outPath = resolve(process.cwd(), "data-snapshot.json");
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(`Wrote snapshot to ${outPath}`);
  console.log(`  soldiers:               ${soldiers.length}`);
  console.log(`  positions:              ${positions.length}`);
  console.log(`  schedules:              ${schedules.length}`);
  console.log(`  slotPreferences:        ${slotPreferences.length}`);
  console.log(`  soldierWeekNotes:       ${soldierWeekNotes.length}`);
  console.log(`  soldierWeekSubmissions: ${soldierWeekSubmissions.length}`);
  console.log(`  assignments:            ${assignments.length}`);
  console.log(`  auditLogs:              ${auditLogs.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
