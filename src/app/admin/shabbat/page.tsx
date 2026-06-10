import { redirect } from "next/navigation";
import { getWeekStart, formatWeekStartParam } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ShabbatIndexPage() {
  const ws = getWeekStart(new Date());
  redirect(`/admin/shabbat/${formatWeekStartParam(ws)}`);
}
