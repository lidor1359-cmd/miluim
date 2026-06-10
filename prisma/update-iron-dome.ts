import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ironDome = await prisma.soldier.findFirst({
    where: { name: "כיפת ברזל" },
  });
  if (!ironDome) throw new Error("כיפת ברזל not found");

  const position = await prisma.position.findFirst({
    where: { name: "שג אחורי" },
  });
  if (!position) throw new Error("שג אחורי not found");

  const schedule = await prisma.schedule.findFirst({
    orderBy: { weekStartDate: "desc" },
  });
  if (!schedule) throw new Error("No schedule exists");

  const weekStartMs = schedule.weekStartDate.getTime();

  // Remove כיפת ברזל from Sun-Thu 10:00
  for (let d = 0; d <= 4; d++) {
    const date = new Date(weekStartMs + d * 86400000 + 10 * 3600000);
    const result = await prisma.assignment.updateMany({
      where: {
        scheduleId: schedule.id,
        date,
        startHour: 10,
        positionId: position.id,
        soldierId: ironDome.id,
      },
      data: { soldierId: null },
    });
    const dayName = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"][d];
    console.log(`  ➖ ${dayName} 10:00 cleared (${result.count})`);
  }

  // Add כיפת ברזל to Sun-Thu 22:00
  for (let d = 0; d <= 4; d++) {
    const date = new Date(weekStartMs + d * 86400000 + 22 * 3600000);
    await prisma.assignment.upsert({
      where: {
        scheduleId_date_startHour_positionId: {
          scheduleId: schedule.id,
          date,
          startHour: 22,
          positionId: position.id,
        },
      },
      create: {
        scheduleId: schedule.id,
        date,
        startHour: 22,
        positionId: position.id,
        soldierId: ironDome.id,
      },
      update: { soldierId: ironDome.id },
    });
    const dayName = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"][d];
    console.log(`  ➕ ${dayName} 22:00 → כיפת ברזל`);
  }

  const total = await prisma.assignment.count({
    where: { scheduleId: schedule.id, soldierId: ironDome.id },
  });
  console.log(`\n🎉 Total כיפת ברזל assignments: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
