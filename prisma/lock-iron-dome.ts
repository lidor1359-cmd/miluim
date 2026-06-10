import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const ironDome = await prisma.soldier.findFirst({ where: { name: "כיפת ברזל" } });
  if (!ironDome) throw new Error("כיפת ברזל not found");
  const res = await prisma.assignment.updateMany({
    where: { soldierId: ironDome.id },
    data: { locked: true },
  });
  console.log(`✅ Locked ${res.count} כיפת ברזל assignments`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
