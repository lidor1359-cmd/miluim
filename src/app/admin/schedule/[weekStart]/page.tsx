import { notFound } from "next/navigation";
import Link from "next/link";
import {
  parseWeekStartParam,
  formatWeekStartParam,
  getDayDate,
  formatDateHe,
  formatDayMonthHe,
} from "@/lib/dates";
import { addDays } from "date-fns";
import { getScheduleData } from "@/actions/schedule";
import { ScheduleBuilder } from "./schedule-builder";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Printer } from "lucide-react";
import { DAY_NAMES_HE, DAYS_IN_WEEK } from "@/lib/scheduler/types";

export const dynamic = "force-dynamic";

export default async function ScheduleWeekPage({
  params,
}: {
  params: { weekStart: string };
}) {
  const weekStart = parseWeekStartParam(params.weekStart);
  if (!weekStart) notFound();

  const { schedule, soldiers, positions, preferences } =
    await getScheduleData(weekStart);

  const prevWeek = formatWeekStartParam(addDays(weekStart, -7));
  const nextWeek = formatWeekStartParam(addDays(weekStart, 7));
  const endDate = addDays(weekStart, 7);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            שבצ&quot;ק שבועי
          </h1>
          <p className="text-muted-foreground">
            {formatDateHe(weekStart)} - {formatDateHe(endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/schedule/${prevWeek}`}>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
              שבוע קודם
            </Button>
          </Link>
          <Link href={`/admin/schedule/${nextWeek}`}>
            <Button variant="outline" size="sm">
              שבוע הבא
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/admin/schedule/${params.weekStart}/print`}>
            <Button variant="outline" size="sm">
              <Printer className="ms-1 h-4 w-4" />
              הדפסה / ייצוא
            </Button>
          </Link>
        </div>
      </div>

      <ScheduleBuilder
        scheduleId={schedule.id}
        weekStartIso={weekStart.toISOString()}
        status={schedule.status}
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
            label: formatDayMonthHe(d),
            iso: d.toISOString(),
          };
        })}
        initialAssignments={schedule.assignments.map((a) => ({
          dayIndex: Math.floor(
            (a.date.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
          ),
          hour: a.startHour,
          positionId: a.positionId,
          soldierId: a.soldierId,
          locked: a.locked,
        }))}
        preferences={preferences.map((p) => ({
          soldierId: p.soldierId,
          dayIndex: p.dayIndex,
          hour: p.hour,
          kind: p.kind as "BLACK" | "GREEN",
        }))}
      />
    </div>
  );
}
