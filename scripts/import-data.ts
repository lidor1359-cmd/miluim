/**
 * Import data from a JSON snapshot (created by export-data.ts) into the
 * current Prisma DB. Run this against your Neon Postgres URL.
 *
 * Run:
 *   DATABASE_URL="postgresql://...@neon..." pnpm tsx scripts/import-data.ts
 *
 * The script is idempotent on primary keys (uses upsert). Re-running is safe.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

interface Snapshot {
  exportedAt: string;
  soldiers: any[];
  positions: any[];
  schedules: any[];
  slotPreferences: any[];
  soldierWeekNotes: any[];
  soldierWeekSubmissions: any[];
  assignments: any[];
  auditLogs: any[];
}

async function main() {
  const file = process.argv[2] ?? "data-snapshot.json";
  const path = resolve(process.cwd(), file);
  const raw = readFileSync(path, "utf8");
  const snap: Snapshot = JSON.parse(raw);

  console.log(`Importing snapshot from ${path}`);
  console.log(`  exportedAt: ${snap.exportedAt}`);

  // Order matters: parents before children
  // 1. Soldiers (no FKs)
  for (const s of snap.soldiers) {
    await prisma.soldier.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        personalId: s.personalId,
        color: s.color,
        phone: s.phone,
        active: s.active,
        updatedAt: new Date(s.updatedAt),
      },
      create: {
        id: s.id,
        name: s.name,
        personalId: s.personalId,
        color: s.color,
        phone: s.phone,
        active: s.active,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log(`  Soldiers: ${snap.soldiers.length}`);

  // 2. Positions
  for (const p of snap.positions) {
    await prisma.position.upsert({
      where: { id: p.id },
      update: { name: p.name, displayOrder: p.displayOrder },
      create: { id: p.id, name: p.name, displayOrder: p.displayOrder },
    });
  }
  console.log(`  Positions: ${snap.positions.length}`);

  // 3. Schedules
  for (const s of snap.schedules) {
    await prisma.schedule.upsert({
      where: { id: s.id },
      update: {
        weekStartDate: new Date(s.weekStartDate),
        status: s.status,
        version: s.version,
        constraintsState: s.constraintsState,
        constraintsOpenedAt: s.constraintsOpenedAt
          ? new Date(s.constraintsOpenedAt)
          : null,
        constraintsLockedAt: s.constraintsLockedAt
          ? new Date(s.constraintsLockedAt)
          : null,
        updatedAt: new Date(s.updatedAt),
      },
      create: {
        id: s.id,
        weekStartDate: new Date(s.weekStartDate),
        status: s.status,
        version: s.version,
        constraintsState: s.constraintsState,
        constraintsOpenedAt: s.constraintsOpenedAt
          ? new Date(s.constraintsOpenedAt)
          : null,
        constraintsLockedAt: s.constraintsLockedAt
          ? new Date(s.constraintsLockedAt)
          : null,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log(`  Schedules: ${snap.schedules.length}`);

  // 4. SlotPreferences
  for (const p of snap.slotPreferences) {
    await prisma.slotPreference.upsert({
      where: { id: p.id },
      update: {
        kind: p.kind,
        updatedAt: new Date(p.updatedAt),
      },
      create: {
        id: p.id,
        soldierId: p.soldierId,
        weekStartDate: new Date(p.weekStartDate),
        dayIndex: p.dayIndex,
        hour: p.hour,
        kind: p.kind,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }
  console.log(`  SlotPreferences: ${snap.slotPreferences.length}`);

  // 5. SoldierWeekNotes
  for (const n of snap.soldierWeekNotes) {
    await prisma.soldierWeekNote.upsert({
      where: { id: n.id },
      update: { text: n.text, updatedAt: new Date(n.updatedAt) },
      create: {
        id: n.id,
        soldierId: n.soldierId,
        weekStartDate: new Date(n.weekStartDate),
        text: n.text,
        updatedAt: new Date(n.updatedAt),
      },
    });
  }
  console.log(`  SoldierWeekNotes: ${snap.soldierWeekNotes.length}`);

  // 6. SoldierWeekSubmissions
  for (const sub of snap.soldierWeekSubmissions) {
    await prisma.soldierWeekSubmission.upsert({
      where: { id: sub.id },
      update: { submittedAt: new Date(sub.submittedAt) },
      create: {
        id: sub.id,
        soldierId: sub.soldierId,
        weekStartDate: new Date(sub.weekStartDate),
        submittedAt: new Date(sub.submittedAt),
      },
    });
  }
  console.log(`  SoldierWeekSubmissions: ${snap.soldierWeekSubmissions.length}`);

  // 7. Assignments (currently 0, but supported)
  for (const a of snap.assignments) {
    await prisma.assignment.upsert({
      where: { id: a.id },
      update: {
        soldierId: a.soldierId,
        locked: a.locked,
        updatedAt: new Date(a.updatedAt),
      },
      create: {
        id: a.id,
        scheduleId: a.scheduleId,
        date: new Date(a.date),
        startHour: a.startHour,
        positionId: a.positionId,
        soldierId: a.soldierId,
        locked: a.locked,
        updatedAt: new Date(a.updatedAt),
      },
    });
  }
  console.log(`  Assignments: ${snap.assignments.length}`);

  // 8. AuditLogs
  for (const l of snap.auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        actor: l.actor,
        action: l.action,
        beforeState: l.beforeState,
        afterState: l.afterState,
        timestamp: new Date(l.timestamp),
      },
    });
  }
  console.log(`  AuditLogs: ${snap.auditLogs.length}`);

  console.log("\nImport complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
