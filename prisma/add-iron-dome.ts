import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.soldier.findFirst({
    where: { name: "כיפת ברזל" },
  });

  if (existing) {
    console.log("כיפת ברזל already exists, ensuring color is black...");
    await prisma.soldier.update({
      where: { id: existing.id },
      data: { color: "#000000" },
    });
    console.log("✅ Color updated to black");
    return;
  }

  await prisma.soldier.create({
    data: {
      name: "כיפת ברזל",
      color: "#000000",
    },
  });
  console.log("✅ Created כיפת ברזל with black color");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
