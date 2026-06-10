import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const schedules = await prisma.schedule.findMany({
    include: {
      assignments: {
        include: { soldier: true, position: true },
        orderBy: [{ date: "asc" }, { startHour: "asc" }],
      },
    },
  });
  for (const s of schedules) {
    console.log(`\n=== Schedule ${s.weekStartDate.toISOString()} [${s.status}] ===`);
    console.log(`Total assignments: ${s.assignments.length}`);
    const filled = s.assignments.filter(a => a.soldier);
    console.log(`Filled: ${filled.length}`);
    if (filled.length > 0 && filled.length < 30) {
      for (const a of filled) {
        console.log(`  ${a.date.toISOString().split('T')[0]} ${String(a.startHour).padStart(2,'0')}:00 - ${a.position.name} - ${a.soldier?.name}`);
      }
    }
  }
}
main().finally(() => prisma.$disconnect());
