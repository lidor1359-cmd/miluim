"use client";

import { useState } from "react";
import { keyOf, type ConstraintsForm } from "./use-constraints-form";
import {
  SHIFT_HOURS,
  DAY_NAMES_HE,
  DAYS_IN_WEEK,
} from "@/lib/scheduler/types";
import { Card } from "@/components/ui/card";
import { ChevronDown, X, Lock } from "lucide-react";
import { format } from "date-fns";

interface Props {
  form: ConstraintsForm;
  weekStartMs: number;
}

function getInitialOpenDay(weekStartMs: number): number {
  const now = Date.now();
  const diff = now - weekStartMs;
  const dayInMs = 24 * 60 * 60 * 1000;
  const dayIdx = Math.floor(diff / dayInMs);
  if (dayIdx >= 0 && dayIdx < DAYS_IN_WEEK) return dayIdx;
  return 0;
}

export function MobileAccordion({ form, weekStartMs }: Props) {
  const [openDay, setOpenDay] = useState<number | null>(() =>
    getInitialOpenDay(weekStartMs)
  );

  const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const d = new Date(weekStartMs + i * 24 * 60 * 60 * 1000);
    let blackCount = 0;
    for (const h of SHIFT_HOURS) {
      const k = form.prefs.get(keyOf(i, h));
      if (k === "BLACK") blackCount++;
    }
    return {
      dayIndex: i,
      name: DAY_NAMES_HE[i],
      label: format(d, "dd/MM"),
      blackCount,
    };
  });

  return (
    <div className="space-y-2 md:hidden">
      {days.map((d) => {
        const isOpen = openDay === d.dayIndex;
        return (
          <Card key={d.dayIndex} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenDay(isOpen ? null : d.dayIndex)}
              className="flex w-full items-center justify-between gap-3 p-4 text-right transition hover:bg-slate-50"
              aria-expanded={isOpen}
              aria-controls={`day-panel-${d.dayIndex}`}
            >
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="text-right">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.label}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {d.blackCount > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-slate-900"></span>
                      <span className="font-medium">{d.blackCount}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      אין סימון
                    </span>
                  )}
                </div>
              </div>
            </button>

            {isOpen && (
              <div
                id={`day-panel-${d.dayIndex}`}
                className="space-y-2 border-t bg-slate-50/50 p-3"
              >
                {SHIFT_HOURS.map((h) => {
                  const endH = (h + 4) % 24;
                  const timeLabel = `${String(h).padStart(2, "0")}:00-${String(
                    endH
                  ).padStart(2, "0")}:00`;

                  if (form.isLocked(d.dayIndex, h)) {
                    return (
                      <div
                        key={h}
                        className="flex h-14 w-full items-center justify-between gap-3 rounded-lg border-2 border-slate-300 px-4 text-slate-600"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(45deg, #e2e8f0 0, #e2e8f0 8px, #f1f5f9 8px, #f1f5f9 16px)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5" />
                          <span className="text-sm font-medium">משובץ</span>
                        </div>
                        <span className="font-mono text-sm">{timeLabel}</span>
                      </div>
                    );
                  }

                  const kind = form.prefs.get(keyOf(d.dayIndex, h));
                  const isBlack = kind === "BLACK";

                  const bgClass = isBlack
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white border-slate-200";

                  const stateLabel = isBlack ? "לא יכול" : "ללא סימון";

                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={!form.editable || form.isPending}
                      onClick={() => form.handleCellClick(d.dayIndex, h)}
                      className={`flex h-14 w-full items-center justify-between gap-3 rounded-lg border-2 px-4 transition ${bgClass} ${
                        form.editable
                          ? "active:scale-[0.98]"
                          : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isBlack && <X className="h-5 w-5" />}
                        <span className="text-sm font-medium">
                          {stateLabel}
                        </span>
                      </div>
                      <span className="font-mono text-sm">{timeLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
