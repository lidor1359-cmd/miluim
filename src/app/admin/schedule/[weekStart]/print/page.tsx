import { notFound } from "next/navigation";
import { parseWeekStartParam, getDayDate } from "@/lib/dates";
import { format } from "date-fns";
import { getScheduleData } from "@/actions/schedule";
import { PrintView } from "./print-view";
import { DAY_NAMES_HE, DAYS_IN_WEEK } from "@/lib/scheduler/types";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  params,
}: {
  params: { weekStart: string };
}) {
  const weekStart = parseWeekStartParam(params.weekStart);
  if (!weekStart) notFound();

  const { schedule, soldiers, positions } = await getScheduleData(weekStart);

  return (
    <PrintView
      weekStartLabel={`${format(weekStart, "dd/MM/yyyy")} - ${format(
        new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        "dd/MM/yyyy"
      )}`}
      soldiers={soldiers.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
      }))}
      positions={positions.map((p) => ({ id: p.id, name: p.name }))}
      dayDates={Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
        const d = getDayDate(weekStart, i);
        return {
          dayIndex: i,
          name: DAY_NAMES_HE[i],
          label: format(d, "dd/MM"),
        };
      })}
      assignments={schedule.assignments.map((a) => ({
        dayIndex: Math.floor(
          (a.date.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
        ),
        hour: a.startHour,
        positionId: a.positionId,
        soldierId: a.soldierId,
      }))}
    />
  );
}
