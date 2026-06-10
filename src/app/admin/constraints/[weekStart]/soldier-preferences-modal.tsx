"use client";

import { useEffect, useState } from "react";
import { getSoldierPreferences, getSoldierNote } from "@/actions/constraints";
import {
  SHIFT_HOURS,
  DAY_NAMES_HE,
  DAYS_IN_WEEK,
} from "@/lib/scheduler/types";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Pref {
  dayIndex: number;
  hour: number;
  kind: string; // BLACK
}

interface Props {
  soldierId: string;
  soldierName: string;
  personalId: string | null;
  color: string;
  weekStartIso: string;
  onClose: () => void;
}

export function SoldierPreferencesModal({
  soldierId,
  soldierName,
  personalId,
  color,
  weekStartIso,
  onClose,
}: Props) {
  const [prefs, setPrefs] = useState<Pref[] | null>(null);
  const [note, setNote] = useState<string>("");
  const weekStartMs = new Date(weekStartIso).getTime();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getSoldierPreferences(soldierId, weekStartIso),
      getSoldierNote(soldierId, weekStartIso),
    ]).then(([data, noteText]) => {
      if (cancelled) return;
      setPrefs(
        data.map((p) => ({
          dayIndex: p.dayIndex,
          hour: p.hour,
          kind: p.kind,
        }))
      );
      setNote(noteText);
    });
    return () => {
      cancelled = true;
    };
  }, [soldierId, weekStartIso]);

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const prefMap = new Map<string, string>();
  for (const p of prefs ?? []) {
    prefMap.set(`${p.dayIndex}-${p.hour}`, p.kind);
  }

  const blackCount = prefs?.filter((p) => p.kind === "BLACK").length ?? 0;

  const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const d = new Date(weekStartMs + i * 24 * 60 * 60 * 1000);
    return {
      dayIndex: i,
      name: DAY_NAMES_HE[i].replace("יום ", ""),
      label: format(d, "dd/MM"),
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-5 w-5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div>
              <div className="text-lg font-bold">{soldierName}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {personalId || "—"}
              </div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {prefs === null ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              טוען...
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-slate-900" />
                  <span>שחור (לא יכול) — {blackCount}</span>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-center text-sm">
                  <thead>
                    <tr>
                      <th className="border bg-slate-100 p-2 font-medium">שעה</th>
                      {days.map((d) => (
                        <th
                          key={d.dayIndex}
                          className="border bg-slate-100 p-2 font-medium min-w-[58px]"
                        >
                          <div className="text-xs">{d.name}</div>
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
                            const kind = prefMap.get(`${d.dayIndex}-${h}`);
                            const bg =
                              kind === "BLACK"
                                ? "bg-slate-900 text-white"
                                : "bg-white";
                            return (
                              <td
                                key={d.dayIndex}
                                className={`border h-10 ${bg}`}
                              >
                                {kind === "BLACK" && (
                                  <X className="mx-auto h-4 w-4" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Note / free-text preferences */}
              <div className="space-y-1.5">
                <div className="text-sm font-medium">הערות / העדפות</div>
                {note.trim() ? (
                  <div
                    dir="rtl"
                    className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-sm leading-relaxed text-slate-800"
                  >
                    {note}
                  </div>
                ) : (
                  <div className="rounded-md border bg-white p-3 text-sm italic text-muted-foreground">
                    אין הערות
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
