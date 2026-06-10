import { PrismaClient } from "@prisma/client";
import { SOLDIER_COLORS } from "../src/lib/colors";

const prisma = new PrismaClient();

// Soldier names identified from the Excel schedule image
const SOLDIER_NAMES = [
  "יאיר רויטמן",
  "נדה אהרוני",
  "יאיר פדידה",
  "גל מאיר",
  "דניס",
  "דניאל פרוחורוב",
  "הראל",
  "עידו דורון",
  "תומר",
  "עומר",
  "מיכאל",
  "אברהם",
  "לידור לוין",
  "ניסן אסרף",
  "רומי",
  "לידור לונגי",
  "יואב",
  "אלי בוסקילה",
  "שני",
  "יוסי שלמה",
  "אלאי",
  "יאיר אמר",
  "ריאן",
  "לידור שפירא",
];

// Special soldiers with fixed colors (e.g., external coverage)
const SPECIAL_SOLDIERS: { name: string; color: string }[] = [
  { name: "כיפת ברזל", color: "#000000" },
];

const POSITION_NAMES = ["עמדה רביעית - ליד הדורבנים", "שג אחורי"];

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.assignment.deleteMany();
  await prisma.slotPreference.deleteMany();
  await prisma.soldierWeekSubmission.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.soldier.deleteMany();
  await prisma.position.deleteMany();

  // Create positions
  for (let i = 0; i < POSITION_NAMES.length; i++) {
    await prisma.position.create({
      data: {
        name: POSITION_NAMES[i],
        displayOrder: i,
      },
    });
  }
  console.log(`✅ Created ${POSITION_NAMES.length} positions`);

  // Create soldiers
  for (let i = 0; i < SOLDIER_NAMES.length; i++) {
    await prisma.soldier.create({
      data: {
        name: SOLDIER_NAMES[i],
        personalId: String(9000001 + i),
        color: SOLDIER_COLORS[i % SOLDIER_COLORS.length],
      },
    });
  }

  // Create special soldiers (e.g., Iron Dome external coverage)
  for (let j = 0; j < SPECIAL_SOLDIERS.length; j++) {
    const special = SPECIAL_SOLDIERS[j];
    await prisma.soldier.create({
      data: {
        name: special.name,
        personalId: String(9900001 + j),
        color: special.color,
      },
    });
  }
  console.log(
    `✅ Created ${SOLDIER_NAMES.length + SPECIAL_SOLDIERS.length} soldiers`
  );

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
