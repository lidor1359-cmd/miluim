import Link from "next/link";
import { format, addDays } from "date-fns";
import { ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";
import {
  DAY_NAMES_HE,
  SHIFT_HOURS,
  type ShiftHour,
} from "@/lib/scheduler/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleGridReadonly } from "./schedule-grid-readonly";

interface ViewData {
  weekStartIso: string;
  weekStartMs: number;
  soldiers: { id: string; name: string; color: string }[];
  positions: { id: string; name: string }[];
  assignments: {
    dayIndex: number;
    hour: number;
    positionId: string;
    soldierId: string | null;
  }[];
  myShifts: {
    dayIndex: number;
    hour: number;
    positionId: string;
    soldierId: string | null;
  }[];
}

interface Props {
  view: ViewData;
  soldier: { id: string; name: string; color: string };
  prevWeekIso: string | null;
  nextWeekIso: string | null;
}

function fmtHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function fmtRange(h: number) {
  const end = (h + 4) % 24;
  return `${fmtHour(h)}-${fmtHour(end)}`;
}

export function MySchedule({ view, soldier, prevWeekIso, nextWeekIso }: Props) {
  const weekStart = new Date(view.weekStartIso);
  const weekEnd = addDays(weekStart, 7);

  const positionById = new Map(view.positions.map((p) => [p.id, p.name]));

  // Order myShifts canonically
  const myShifts = [...view.myShifts].sort(
    (a, b) =>
      a.dayIndex - b.dayIndex ||
      SHIFT_HOURS.indexOf(a.hour as ShiftHour) -
        SHIFT_HOURS.indexOf(b.hour as ShiftHour)
  );

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <Card>
        <CardContent className="flex items-center justify-between gap-2 pt-4">
          <div>
            {prevWeekIso ? (
              <Link
                href={`/c?tab=schedule&week=${prevWeekIso.slice(0, 10)}`}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
                שבוע קודם
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-transparent px-3 py-1.5 text-sm text-slate-300">
                <ChevronRight className="h-4 w-4" />
                אין קודם
              </span>
            )}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>שבוע</span>
            </div>
            <div className="text-sm font-semibold">
              {format(weekStart, "dd/MM")} – {format(weekEnd, "dd/MM/yyyy")}
            </div>
          </div>
          <div>
            {nextWeekIso ? (
              <Link
                href={`/c?tab=schedule&week=${nextWeekIso.slice(0, 10)}`}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                שבוע הבא
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-transparent px-3 py-1.5 text-sm text-slate-300">
                אין הבא
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My shifts list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">המשמרות שלי</CardTitle>
        </CardHeader>
        <CardContent>
          {myShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              אין לך משמרות בשבוע הזה.
            </p>
          ) : (
            <ul className="divide-y">
              {myShifts.map((s) => {
                const d = new Date(
                  view.weekStartMs + s.dayIndex * 24 * 60 * 60 * 1000
                );
                return (
                  <li
                    key={`${s.dayIndex}-${s.hour}-${s.positionId}`}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: soldier.color }}
                      />
                      <span className="font-medium">
                        {DAY_NAMES_HE[s.dayIndex]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({format(d, "dd/MM")})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{fmtRange(s.hour)}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {positionById.get(s.positionId) ?? "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Full week grid */}
      <ScheduleGridReadonly
        weekStartMs={view.weekStartMs}
        positions={view.positions}
        soldiers={view.soldiers}
        assignments={view.assignments}
        highlightSoldierId={soldier.id}
      />
    </div>
  );
}
