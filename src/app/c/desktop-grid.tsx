"use client";

import { keyOf, type ConstraintsForm } from "./use-constraints-form";
import {
  SHIFT_HOURS,
  DAY_NAMES_HE,
  DAYS_IN_WEEK,
} from "@/lib/scheduler/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Lock } from "lucide-react";
import { format } from "date-fns";
import { getContrastText } from "@/lib/colors";

interface Props {
  form: ConstraintsForm;
  weekStartMs: number;
}

export function DesktopGrid({ form, weekStartMs }: Props) {
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const d = new Date(weekStartMs + i * 24 * 60 * 60 * 1000);
    return {
      dayIndex: i,
      name: DAY_NAMES_HE[i],
      label: format(d, "dd/MM"),
    };
  });

  return (
    <Card className="hidden md:block">
      <CardHeader>
        <CardTitle>סימון אילוצים</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              <th className="border bg-slate-100 p-2 font-medium">שעה</th>
              {days.map((d) => (
                <th
                  key={d.dayIndex}
                  className="border bg-slate-100 p-2 font-medium min-w-[68px]"
                >
                  <div className="text-xs">{d.name.replace("יום ", "")}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {d.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFT_HOURS.map((h) => {
              const endH = (h + 4) % 24;
              return (
                <tr key={h}>
                  <td className="border bg-slate-50 p-1.5 font-medium whitespace-nowrap text-xs">
                    {String(h).padStart(2, "0")}-
                    {String(endH).padStart(2, "0")}
                  </td>
                  {days.map((d) => {
                    const locked = form.getLocked(d.dayIndex, h);
                    if (locked && locked.length > 0) {
                      const first = locked[0];
                      const fg = getContrastText(first.soldierColor);
                      return (
                        <td
                          key={d.dayIndex}
                          className="border p-0 cursor-not-allowed"
                          title={locked
                            .map(
                              (l) => `${l.positionName}: ${l.soldierName}`
                            )
                            .join("\n")}
                        >
                          <div
                            className="flex h-12 w-full flex-col items-center justify-center gap-0.5 px-1"
                            style={{
                              backgroundColor: first.soldierColor,
                              color: fg,
                            }}
                          >
                            <Lock className="h-3 w-3 opacity-70" />
                            <span className="truncate text-[10px] font-medium leading-tight">
                              {first.soldierName}
                            </span>
                          </div>
                        </td>
                      );
                    }
                    const kind = form.prefs.get(keyOf(d.dayIndex, h));
                    const bg =
                      kind === "BLACK"
                        ? "bg-slate-900 text-white"
                        : "bg-white hover:bg-slate-100";
                    return (
                      <td
                        key={d.dayIndex}
                        className={`border p-0 ${
                          form.editable
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-70"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={!form.editable || form.isPending}
                          onClick={() => form.handleCellClick(d.dayIndex, h)}
                          className={`h-12 w-full transition ${bg}`}
                        >
                          {kind === "BLACK" && (
                            <X className="mx-auto h-4 w-4" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
