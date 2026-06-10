import { format } from "date-fns";
import {
  SHIFT_HOURS,
  DAY_NAMES_HE,
  DAYS_IN_WEEK,
} from "@/lib/scheduler/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContrastText } from "@/lib/colors";

interface Soldier {
  id: string;
  name: string;
  color: string;
}

interface Position {
  id: string;
  name: string;
}

interface AssignmentLite {
  dayIndex: number;
  hour: number;
  positionId: string;
  soldierId: string | null;
}

interface Props {
  weekStartMs: number;
  positions: Position[];
  soldiers: Soldier[];
  assignments: AssignmentLite[];
  highlightSoldierId: string;
}

function fmtRange(h: number) {
  const end = (h + 4) % 24;
  return `${String(h).padStart(2, "0")}-${String(end).padStart(2, "0")}`;
}

export function ScheduleGridReadonly({
  weekStartMs,
  positions,
  soldiers,
  assignments,
  highlightSoldierId,
}: Props) {
  const soldierById = new Map(soldiers.map((s) => [s.id, s]));

  // Build lookup: (dayIndex, hour, positionId) -> soldierId | null
  const assignMap = new Map<string, string | null>();
  for (const a of assignments) {
    assignMap.set(`${a.dayIndex}-${a.hour}-${a.positionId}`, a.soldierId);
  }

  const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const d = new Date(weekStartMs + i * 24 * 60 * 60 * 1000);
    return {
      dayIndex: i,
      name: DAY_NAMES_HE[i].replace("יום ", ""),
      label: format(d, "dd/MM"),
    };
  });

  function renderCell(soldierId: string | null | undefined) {
    if (!soldierId) {
      return (
        <span className="block text-[10px] text-slate-300">—</span>
      );
    }
    const sol = soldierById.get(soldierId);
    if (!sol) return null;
    const isMe = soldierId === highlightSoldierId;
    return (
      <span
        className={`block truncate rounded px-1 py-0.5 text-[11px] font-medium ${
          isMe ? "ring-2 ring-offset-1 ring-blue-500" : ""
        }`}
        style={{
          backgroundColor: sol.color,
          color: getContrastText(sol.color),
        }}
        title={sol.name}
      >
        {sol.name}
      </span>
    );
  }

  return (
    <>
      {/* Desktop: full grid with positions as rows-per-shift */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-base">לוח השבוע המלא</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="border bg-slate-100 p-2 font-medium">משמרת</th>
                <th className="border bg-slate-100 p-2 font-medium">עמדה</th>
                {days.map((d) => (
                  <th
                    key={d.dayIndex}
                    className="border bg-slate-100 p-2 font-medium min-w-[90px]"
                  >
                    <div>{d.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {d.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFT_HOURS.map((h) =>
                positions.map((p, pIdx) => (
                  <tr key={`${h}-${p.id}`}>
                    {pIdx === 0 && (
                      <td
                        rowSpan={positions.length}
                        className="border bg-slate-50 font-mono font-semibold whitespace-nowrap align-middle"
                      >
                        {fmtRange(h)}
                      </td>
                    )}
                    <td className="border bg-slate-50 p-1 text-right font-medium whitespace-nowrap text-[11px]">
                      {p.name}
                    </td>
                    {days.map((d) => {
                      const sid = assignMap.get(`${d.dayIndex}-${h}-${p.id}`);
                      return (
                        <td key={d.dayIndex} className="border p-1">
                          {renderCell(sid)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Mobile: per-day accordion-like list */}
      <Card className="md:hidden">
        <CardHeader>
          <CardTitle className="text-base">לוח השבוע המלא</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {days.map((d) => (
            <details key={d.dayIndex} className="rounded border bg-white">
              <summary className="cursor-pointer list-none p-3 text-sm font-medium flex items-center justify-between">
                <span>
                  {d.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({d.label})
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">פתח</span>
              </summary>
              <div className="border-t p-2 space-y-2">
                {SHIFT_HOURS.map((h) => (
                  <div key={h}>
                    <div className="mb-1 text-[11px] font-semibold text-slate-700">
                      {fmtRange(h)}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {positions.map((p) => {
                        const sid = assignMap.get(`${d.dayIndex}-${h}-${p.id}`);
                        return (
                          <div
                            key={p.id}
                            className="rounded border p-1.5 text-[11px]"
                          >
                            <div className="mb-0.5 text-[10px] text-muted-foreground truncate">
                              {p.name}
                            </div>
                            {renderCell(sid)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
