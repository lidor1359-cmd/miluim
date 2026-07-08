import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const schedules = await prisma.schedule.findMany({
    orderBy: { weekStartDate: "desc" },
  });
  for (const s of schedules) {
    console.log(s.weekStartDate.toISOString(), s.constraintsState);
  }
  await prisma.$disconnect();
}

main();
