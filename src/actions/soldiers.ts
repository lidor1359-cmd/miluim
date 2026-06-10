"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";

const soldierSchema = z.object({
  name: z.string().min(1, "שם נדרש").max(100),
  personalId: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "צבע לא תקין"),
  phone: z.string().optional(),
});

function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === "P2002"
  );
}

export async function createSoldier(formData: FormData) {
  const parsed = soldierSchema.safeParse({
    name: formData.get("name"),
    personalId: formData.get("personalId") || undefined,
    color: formData.get("color"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  try {
    await prisma.soldier.create({ data: parsed.data });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { error: "מספר אישי כבר קיים במערכת" };
    }
    throw e;
  }
  revalidatePath("/admin/soldiers");
  return { success: true };
}

export async function updateSoldier(id: string, formData: FormData) {
  const parsed = soldierSchema.safeParse({
    name: formData.get("name"),
    personalId: formData.get("personalId") || undefined,
    color: formData.get("color"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  try {
    await prisma.soldier.update({
      where: { id },
      data: {
        ...parsed.data,
        personalId: parsed.data.personalId ?? null,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { error: "מספר אישי כבר קיים במערכת" };
    }
    throw e;
  }
  revalidatePath("/admin/soldiers");
  return { success: true };
}

export async function deleteSoldier(id: string) {
  await prisma.soldier.delete({ where: { id } });
  revalidatePath("/admin/soldiers");
  return { success: true };
}

export async function toggleSoldierActive(id: string, active: boolean) {
  await prisma.soldier.update({
    where: { id },
    data: { active },
  });
  revalidatePath("/admin/soldiers");
  return { success: true };
}
