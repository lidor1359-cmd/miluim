/**
 * סקריפט חד-פעמי לעדכון מספרים אישיים לחיילים קיימים.
 *
 * הוראות שימוש:
 * 1. ערוך את המערך PERSONAL_IDS למטה עם הנתונים מהרשימה.
 * 2. הרץ: pnpm db:set-ids
 * 3. הסקריפט יחפש כל חייל לפי שם (עם נירמול נסבל), ויעדכן את ה-personalId.
 *    חיילים שלא נמצאו יודפסו כ-warning בלי לעצור את הריצה.
 */

import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../src/lib/name-normalize";

const prisma = new PrismaClient();

const PERSONAL_IDS: { name: string; personalId: string }[] = [
  // דוגמה — להחליף ברשימה האמיתית:
  // { name: "יוסי כהן", personalId: "1234567" },
  // { name: "דנה לוי", personalId: "7654321" },
];

async function main() {
  if (PERSONAL_IDS.length === 0) {
    console.error(
      "⚠️  PERSONAL_IDS ריק. ערוך את scripts/set-personal-ids.ts והוסף את הרשימה."
    );
    process.exit(1);
  }

  const allSoldiers = await prisma.soldier.findMany();
  const byNormalizedName = new Map<string, typeof allSoldiers[number][]>();
  for (const s of allSoldiers) {
    const key = normalizeName(s.name);
    const list = byNormalizedName.get(key) ?? [];
    list.push(s);
    byNormalizedName.set(key, list);
  }

  let updated = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const { name, personalId } of PERSONAL_IDS) {
    const key = normalizeName(name);
    const matches = byNormalizedName.get(key) ?? [];

    if (matches.length === 0) {
      warnings.push(`❌ לא נמצא חייל בשם "${name}"`);
      skipped++;
      continue;
    }
    if (matches.length > 1) {
      warnings.push(
        `⚠️  ${matches.length} חיילים תואמים לשם "${name}" — מדלג. (IDs: ${matches
          .map((m) => m.id)
          .join(", ")})`
      );
      skipped++;
      continue;
    }

    const soldier = matches[0];
    if (soldier.personalId === personalId) {
      console.log(`= ${name}: כבר ${personalId}`);
      continue;
    }

    try {
      await prisma.soldier.update({
        where: { id: soldier.id },
        data: { personalId },
      });
      console.log(`✅ ${name}: ${soldier.personalId ?? "—"} → ${personalId}`);
      updated++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(`❌ עדכון נכשל ל-"${name}" (${personalId}): ${msg}`);
      skipped++;
    }
  }

  console.log(`\n--- סיכום ---`);
  console.log(`עודכנו: ${updated}`);
  console.log(`דולגו: ${skipped}`);
  if (warnings.length) {
    console.log(`\nאזהרות:`);
    warnings.forEach((w) => console.log(w));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
