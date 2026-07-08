import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Lock all currently OPEN schedules
  const openSchedules = await prisma.schedule.findMany({
    where: { constraintsState: "OPEN" },
  });
  
  for (const s of openSchedules) {
    await prisma.schedule.update({
      where: { id: s.id },
      data: { constraintsState: "LOCKED", constraintsLockedAt: new Date() },
    });
    console.log("✓ Locked week:", s.weekStartDate.toISOString());
  }
  
  // Open the new week: Sunday 12.7.2026
  // In Israel timezone (UTC+3), Sunday 12.7.2026 00:00 is 2026-07-11T21:00:00Z
  const newWeek = new Date("2026-07-11T21:00:00.000Z");
  
  let schedule = await prisma.schedule.findUnique({
    where: { weekStartDate: newWeek },
  });
  
  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: {
        weekStartDate: newWeek,
        constraintsState: "OPEN",
        constraintsOpenedAt: new Date(),
      },
    });
    console.log("✓ Created new schedule:", newWeek.toISOString());
  } else {
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        constraintsState: "OPEN",
        constraintsOpenedAt: new Date(),
        constraintsLockedAt: null,
      },
    });
    console.log("✓ Opened existing schedule:", newWeek.toISOString());
  }
  
  console.log("\nDone! Constraints window is now open for 12.7 - 19.7");
  console.log("Day 0 (12.7) is blocked - already scheduled.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
