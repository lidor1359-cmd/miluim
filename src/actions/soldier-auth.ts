"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/name-normalize";
import { getColorForIndex } from "@/lib/colors";
import { setSoldierCookie, clearSoldierCookie } from "@/lib/soldier-session";

export type IdentifyState = { error?: string } | null;

/**
 * הזדהות חייל בשם בלבד.
 * - אם השם קיים במערכת (אחרי נירמול) → כניסה אליו
 * - אם השם לא קיים → נוצר חייל חדש (active) עם צבע אוטומטי
 * - אין סינון לפי רשימה כלשהי; כל מי שמזין שם מקבל גישה
 */
export async function identifySoldier(
  _prevState: IdentifyState,
  formData: FormData
): Promise<IdentifyState> {
  const rawName = String(formData.get("name") ?? "");
  const cleanedName = rawName.trim().replace(/\s+/g, " ");
  if (!cleanedName) {
    return { error: "יש להזין שם מלא" };
  }

  const target = normalizeName(cleanedName);

  const soldiers = await prisma.soldier.findMany({
    select: { id: true, name: true, active: true },
  });

  const matches = soldiers.filter((s) => normalizeName(s.name) === target);

  let soldierId: string;
  if (matches.length === 1) {
    soldierId = matches[0].id;
    // אם החייל לא פעיל — נפעיל אותו כדי שיוכל להגיש
    if (!matches[0].active) {
      await prisma.soldier.update({
        where: { id: soldierId },
        data: { active: true },
      });
    }
  } else if (matches.length === 0) {
    // יצירת חייל חדש עם צבע לפי האינדקס הבא
    const created = await prisma.soldier.create({
      data: {
        name: cleanedName,
        color: getColorForIndex(soldiers.length),
        active: true,
      },
      select: { id: true },
    });
    soldierId = created.id;
  } else {
    // נדיר — שני חיילים שונים עם אותו שם מנורמל
    return {
      error: "נמצאו מספר חיילים עם אותו שם. פנה למנהל המערכת.",
    };
  }

  setSoldierCookie(soldierId);
  redirect("/c");
}

export async function logoutSoldier() {
  clearSoldierCookie();
  redirect("/c");
}
