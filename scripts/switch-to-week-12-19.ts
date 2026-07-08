import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Week definitions (Sunday 00:00 IL = Saturday 21:00 UTC)
  const oldWeek = new Date("2026-07-04T21:00:00.000Z"); // 05.07 - 12.07
  const newWeek = new Date("2026-07-11T21:00:00.000Z"); // 12.07 - 19.07

  console.log("Current open schedules before change:");
  const openBefore = await prisma.schedule.findMany({
    where: { constraintsState: "OPEN" },
  });
  for (const s of openBefore) {
    console.log("  OPEN:", s.weekStartDate.toISOString());
  }

  // Lock the old week if it exists
  const oldSchedule = await prisma.schedule.findUnique({
    where: { weekStartDate: oldWeek },
  });
  if (oldSchedule) {
    await prisma.schedule.update({
      where: { id: oldSchedule.id },
      data: { constraintsState: "LOCKED", constraintsLockedAt: new Date() },
    });
    console.log("✓ Locked old week:", oldWeek.toISOString());
  } else {
    console.log("! Old week not found:", oldWeek.toISOString());
  }

  // Lock any other open schedules except the new week
  for (const s of openBefore) {
    if (s.weekStartDate.getTime() !== newWeek.getTime()) {
      await prisma.schedule.update({
        where: { id: s.id },
        data: { constraintsState: "LOCKED", constraintsLockedAt: new Date() },
      });
      console.log("✓ Locked other open week:", s.weekStartDate.toISOString());
    }
  }

  // Open the new week
  let newSchedule = await prisma.schedule.findUnique({
    where: { weekStartDate: newWeek },
  });

  if (!newSchedule) {
    newSchedule = await prisma.schedule.create({
      data: {
        weekStartDate: newWeek,
        constraintsState: "OPEN",
        constraintsOpenedAt: new Date(),
      },
    });
    console.log("✓ Created new schedule:", newWeek.toISOString());
  } else {
    await prisma.schedule.update({
      where: { id: newSchedule.id },
      data: {
        constraintsState: "OPEN",
        constraintsOpenedAt: new Date(),
        constraintsLockedAt: null,
      },
    });
    console.log("✓ Opened existing schedule:", newWeek.toISOString());
  }

  console.log("\nCurrent open schedules after change:");
  const openAfter = await prisma.schedule.findMany({
    where: { constraintsState: "OPEN" },
  });
  for (const s of openAfter) {
    console.log("  OPEN:", s.weekStartDate.toISOString());
  }

  console.log("\nDone! Constraints window is now open for 12.07 - 19.07");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
