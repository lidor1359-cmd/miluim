import { redirect } from "next/navigation";
import { getWeekStart, formatWeekStartParam } from "@/lib/dates";

export default function ScheduleIndex() {
  const param = formatWeekStartParam(getWeekStart(new Date()));
  redirect(`/admin/schedule/${param}`);
}
