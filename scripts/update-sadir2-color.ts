import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const eli = await prisma.soldier.findFirst({ where: { name: "אלי בוסקילה" } });
  if (!eli) { console.log("Eli not found"); return; }
  
  const sadir2 = await prisma.soldier.findFirst({ where: { name: "סדיר 2" } });
  if (!sadir2) { console.log("Sadir 2 not found"); return; }
  
  console.log("Eli color:", eli.color);
  console.log("Sadir 2 current color:", sadir2.color);
  
  await prisma.soldier.update({
    where: { id: sadir2.id },
    data: { color: eli.color }
  });
  
  console.log("Updated Sadir 2 color to:", eli.color);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); process.exit(1); });
