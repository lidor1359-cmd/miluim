/**
 * Test script: identify as "לידור לוין", pick random BLACK/GREEN preferences,
 * and submit constraints for the current week.
 *
 * Mirrors the production flow:
 *   identifySoldier → togglePreference (xN) → submitConstraints
 * but performs DB ops directly (no HTTP) so it's reproducible.
 */
import { PrismaClient } from "@prisma/client";
import { startOfWeek } from "date-fns";

const prisma = new PrismaClient();

const SHIFT_HOURS = [2, 6, 10, 14, 18, 22] as const;
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const SOLDIER_NAME = "לידור לוין";
const COLOR = "#3B82F6"; // blue
const N_BLACK = 5;
const N_GREEN = 4;

function pickRandom<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function main() {
  // 1. Ensure schedule for current week with OPEN constraint window
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  let schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: weekStart },
  });
  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: {
        weekStartDate: weekStart,
        constraintsState: "OPEN",
        constraintsOpenedAt: new Date(),
      },
    });
    console.log(`✓ Created schedule for ${weekStart.toISOString()}`);
  } else if (schedule.constraintsState !== "OPEN") {
    schedule = await prisma.schedule.update({
      where: { id: schedule.id },
      data: { constraintsState: "OPEN", constraintsOpenedAt: new Date() },
    });
    console.log(`✓ Opened constraints window`);
  } else {
    console.log(`✓ Schedule already exists with OPEN window`);
  }

  // 2. Find or create soldier "לידור לוין"
  const allSoldiers = await prisma.soldier.findMany();
  let soldier = allSoldiers.find((s) => s.name.trim() === SOLDIER_NAME);
  if (!soldier) {
    soldier = await prisma.soldier.create({
      data: { name: SOLDIER_NAME, color: COLOR, active: true },
    });
    console.log(`✓ Created soldier: ${soldier.name} (${soldier.id})`);
  } else {
    if (!soldier.active) {
      await prisma.soldier.update({
        where: { id: soldier.id },
        data: { active: true },
      });
    }
    console.log(`✓ Soldier exists: ${soldier.name} (${soldier.id})`);
  }

  // 3. Clear previous preferences for this week (idempotent re-run)
  await prisma.slotPreference.deleteMany({
    where: { soldierId: soldier.id, weekStartDate: weekStart },
  });
  await prisma.soldierWeekSubmission.deleteMany({
    where: { soldierId: soldier.id, weekStartDate: weekStart },
  });

  // 4. Pick random slots (no overlap between BLACK and GREEN)
  const allSlots = DAYS.flatMap((d) =>
    SHIFT_HOURS.map((h) => ({ dayIndex: d, hour: h }))
  );
  const picked = pickRandom(allSlots, N_BLACK + N_GREEN);
  const blacks = picked.slice(0, N_BLACK);
  const greens = picked.slice(N_BLACK);

  const dayNames = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
  const fmtRange = (h: number) =>
    `${String(h).padStart(2, "0")}-${String((h + 4) % 24).padStart(2, "0")}`;

  // 5. Insert preferences
  await prisma.slotPreference.createMany({
    data: blacks.map((s) => ({
      soldierId: soldier.id,
      weekStartDate: weekStart,
      dayIndex: s.dayIndex,
      hour: s.hour,
      kind: "BLACK",
    })),
  });
  await prisma.slotPreference.createMany({
    data: greens.map((s) => ({
      soldierId: soldier.id,
      weekStartDate: weekStart,
      dayIndex: s.dayIndex,
      hour: s.hour,
      kind: "GREEN",
    })),
  });

  console.log(`\n⬛ BLACK (${blacks.length}):`);
  for (const s of blacks) {
    console.log(`   יום ${dayNames[s.dayIndex]}  ${fmtRange(s.hour)}`);
  }
  console.log(`\n🟩 GREEN (${greens.length}):`);
  for (const s of greens) {
    console.log(`   יום ${dayNames[s.dayIndex]}  ${fmtRange(s.hour)}`);
  }

  // 6. Submit
  await prisma.soldierWeekSubmission.create({
    data: { soldierId: soldier.id, weekStartDate: weekStart },
  });
  console.log(`\n✓ Submitted constraints for ${SOLDIER_NAME}`);
  console.log(`  Week: ${weekStart.toISOString().slice(0, 10)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
