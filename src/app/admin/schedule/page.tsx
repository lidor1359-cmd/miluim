import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getWeekStart, formatWeekStartParam } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ScheduleIndex() {
  // Prefer the latest schedule that exists in DB (the week being worked on).
  const latest = await prisma.schedule.findFirst({
    orderBy: { weekStartDate: "desc" },
  });
  const weekStart = latest?.weekStartDate ?? getWeekStart(new Date());
  redirect(`/admin/schedule/${formatWeekStartParam(weekStart)}`);
}
