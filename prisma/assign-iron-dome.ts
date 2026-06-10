import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Iron Dome shifts in שג אחורי for the current week (2026-05-31 Sunday → Saturday)
// dayIndex: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const IRON_DOME_SHIFTS: { dayIndex: number; hour: number }[] = [
  // Sun-Thu at 14:00
  { dayIndex: 0, hour: 14 },
  { dayIndex: 1, hour: 14 },
  { dayIndex: 2, hour: 14 },
  { dayIndex: 3, hour: 14 },
  { dayIndex: 4, hour: 14 },
  // Sun-Thu at 10:00
  { dayIndex: 0, hour: 10 },
  { dayIndex: 1, hour: 10 },
  { dayIndex: 2, hour: 10 },
  { dayIndex: 3, hour: 10 },
  { dayIndex: 4, hour: 10 },
  // Mon-Thu at 06:00
  { dayIndex: 1, hour: 6 },
  { dayIndex: 2, hour: 6 },
  { dayIndex: 3, hour: 6 },
  { dayIndex: 4, hour: 6 },
];

async function main() {
  const ironDome = await prisma.soldier.findFirst({
    where: { name: "כיפת ברזל" },
  });
  if (!ironDome) throw new Error("כיפת ברזל not found");

  const position = await prisma.position.findFirst({
    where: { name: "שג אחורי" },
  });
  if (!position) throw new Error("שג אחורי not found");

  // Get the schedule (most recent / current week)
  const schedule = await prisma.schedule.findFirst({
    orderBy: { weekStartDate: "desc" },
  });
  if (!schedule) throw new Error("No schedule exists");

  const weekStartMs = schedule.weekStartDate.getTime();
  console.log(`Schedule week starts: ${schedule.weekStartDate.toISOString()}`);
  console.log(`Position שג אחורי id: ${position.id}`);
  console.log(`Soldier כיפת ברזל id: ${ironDome.id}`);

  for (const slot of IRON_DOME_SHIFTS) {
    const date = new Date(
      weekStartMs + slot.dayIndex * 86400000 + slot.hour * 3600000
    );
    await prisma.assignment.upsert({
      where: {
        scheduleId_date_startHour_positionId: {
          scheduleId: schedule.id,
          date,
          startHour: slot.hour,
          positionId: position.id,
        },
      },
      create: {
        scheduleId: schedule.id,
        date,
        startHour: slot.hour,
        positionId: position.id,
        soldierId: ironDome.id,
      },
      update: {
        soldierId: ironDome.id,
      },
    });
    const dayName = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"][
      slot.dayIndex
    ];
    console.log(
      `  ✅ ${dayName} ${String(slot.hour).padStart(2, "0")}:00 → כיפת ברזל`
    );
  }

  const total = await prisma.assignment.count({
    where: { scheduleId: schedule.id, soldierId: ironDome.id },
  });
  console.log(`\n🎉 Done. Total כיפת ברזל assignments: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
