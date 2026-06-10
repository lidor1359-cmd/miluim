/**
 * Test script: create 5 fictional soldiers and submit constraints + notes
 * for the active OPEN week. Mirrors the production flow but writes
 * directly to the DB for reproducibility.
 *
 * Run:  pnpm tsx scripts/test-submit-five.ts
 */
import { PrismaClient } from "@prisma/client";
import { startOfWeek } from "date-fns";

const prisma = new PrismaClient();

const SHIFT_HOURS = [2, 6, 10, 14, 18, 22] as const;
const DAYS = [0, 1, 2, 3, 4, 5, 6];

interface FakeSoldier {
  name: string;
  personalId: string;
  color: string;
  nBlack: number;
  note: string;
}

const SOLDIERS: FakeSoldier[] = [
  {
    name: "טסט אבי כהן",
    personalId: "9990001",
    color: "#EF4444", // red
    nBlack: 6,
    note: "יש לי קורס מקצועי בימים ראשון ושני. עדיף לי משמרות בוקר במהלך השבוע. בסופ\"ש זמין לכל שעה.",
  },
  {
    name: "טסט בן זיו",
    personalId: "9990002",
    color: "#10B981", // emerald
    nBlack: 4,
    note: "מעדיף לא משמרות לילה (02-06) ככל הניתן - יש לי תינוקת בת חודשיים. תודה!",
  },
  {
    name: "טסט גיא דוד",
    personalId: "9990003",
    color: "#F59E0B", // amber
    nBlack: 8,
    note: "יש לי חתונה של אח ביום חמישי בערב, ובמהלך השבוע אני בלימודים אקדמיים בבוקר.",
  },
  {
    name: "טסט דורון לוי",
    personalId: "9990004",
    color: "#8B5CF6", // violet
    nBlack: 3,
    note: "גמיש בעקרון. רק מבקש להימנע ככל האפשר מ-22-02 בשבת כדי לבוא ארוחה משפחתית.",
  },
  {
    name: "טסט הילה רוזן",
    personalId: "9990005",
    color: "#EC4899", // pink
    nBlack: 10,
    note: "אני בתורנות בבית חולים כל יום שלישי וחמישי. בנוסף משמרות לילה קשות עליי השבוע - הצטננתי.",
  },
];

function pickRandom<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function main() {
  // 1. Find the active OPEN week (or fall back to current week)
  let schedule = await prisma.schedule.findFirst({
    where: { constraintsState: "OPEN" },
    orderBy: { weekStartDate: "desc" },
  });
  if (!schedule) {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    schedule = await prisma.schedule.upsert({
      where: { weekStartDate: weekStart },
      update: { constraintsState: "OPEN", constraintsOpenedAt: new Date() },
      create: {
        weekStartDate: weekStart,
        constraintsState: "OPEN",
        constraintsOpenedAt: new Date(),
      },
    });
    console.log(`✓ Opened constraints window for ${weekStart.toISOString().slice(0, 10)}`);
  } else {
    console.log(
      `✓ Using existing OPEN schedule: week ${schedule.weekStartDate
        .toISOString()
        .slice(0, 10)}`
    );
  }
  const weekStart = schedule.weekStartDate;

  const allSlots = DAYS.flatMap((d) =>
    SHIFT_HOURS.map((h) => ({ dayIndex: d, hour: h }))
  );

  // 2. For each fake soldier: upsert, clear, write prefs + note, submit
  for (const fake of SOLDIERS) {
    let soldier = await prisma.soldier.findFirst({
      where: { name: fake.name },
    });
    if (!soldier) {
      soldier = await prisma.soldier.create({
        data: {
          name: fake.name,
          personalId: fake.personalId,
          color: fake.color,
          active: true,
        },
      });
      console.log(`✓ Created soldier: ${soldier.name} (${soldier.personalId})`);
    } else {
      await prisma.soldier.update({
        where: { id: soldier.id },
        data: {
          active: true,
          color: fake.color,
          personalId: fake.personalId,
        },
      });
      console.log(`✓ Soldier exists: ${soldier.name}`);
    }

    // Clear previous data for the week (idempotent)
    await prisma.slotPreference.deleteMany({
      where: { soldierId: soldier.id, weekStartDate: weekStart },
    });
    await prisma.soldierWeekSubmission.deleteMany({
      where: { soldierId: soldier.id, weekStartDate: weekStart },
    });
    await prisma.soldierWeekNote.deleteMany({
      where: { soldierId: soldier.id, weekStartDate: weekStart },
    });

    // Random BLACK slots
    const picks = pickRandom(allSlots, fake.nBlack);
    await prisma.slotPreference.createMany({
      data: picks.map((s) => ({
        soldierId: soldier.id,
        weekStartDate: weekStart,
        dayIndex: s.dayIndex,
        hour: s.hour,
        kind: "BLACK",
      })),
    });

    // Note
    await prisma.soldierWeekNote.create({
      data: {
        soldierId: soldier.id,
        weekStartDate: weekStart,
        text: fake.note,
      },
    });

    // Submit
    await prisma.soldierWeekSubmission.create({
      data: { soldierId: soldier.id, weekStartDate: weekStart },
    });

    const dayNames = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
    const fmtRange = (h: number) =>
      `${String(h).padStart(2, "0")}-${String((h + 4) % 24).padStart(2, "0")}`;
    console.log(`  ⬛ BLACK (${picks.length}):`);
    for (const s of picks) {
      console.log(`     יום ${dayNames[s.dayIndex]}  ${fmtRange(s.hour)}`);
    }
    console.log(`  📝 הערה: ${fake.note.slice(0, 60)}${fake.note.length > 60 ? "..." : ""}`);
    console.log(`  ✓ הוגש סופית\n`);
  }

  console.log(`✓ Done. 5 fictional soldiers submitted for week ${weekStart.toISOString().slice(0, 10)}`);
  console.log(`  Admin URL: http://localhost:3000/admin/constraints/${weekStart.toISOString().slice(0, 10)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
