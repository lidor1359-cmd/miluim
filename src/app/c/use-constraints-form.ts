"use client";

import { useState, useTransition } from "react";
import {
  togglePreference,
  submitConstraints,
  unsubmitConstraints,
} from "@/actions/constraints";

export type Kind = "BLACK" | "GREEN";

export interface PrefItem {
  dayIndex: number;
  hour: number;
  kind: Kind;
}

export interface LockedShift {
  dayIndex: number;
  hour: number;
  soldierName: string;
  soldierColor: string;
}

export const NAMED_LOCKED_SOLDIERS = new Set<string>(["כיפת ברזל"]);

export interface ConstraintsFormInput {
  weekStartIso: string;
  constraintsState: string;
  initialPreferences: PrefItem[];
  initialSubmitted: boolean;
  initialSubmittedAt: string | null;
  limits: { maxGreen: number };
  lockedShifts: LockedShift[];
}

export function keyOf(dayIndex: number, hour: number): string {
  return `${dayIndex}-${hour}`;
}

export function useConstraintsForm(input: ConstraintsFormInput) {
  const [prefs, setPrefs] = useState<Map<string, Kind>>(() => {
    const m = new Map<string, Kind>();
    for (const p of input.initialPreferences) {
      m.set(keyOf(p.dayIndex, p.hour), p.kind);
    }
    return m;
  });
  const [submitted, setSubmitted] = useState(input.initialSubmitted);
  const [submittedAt, setSubmittedAt] = useState(input.initialSubmittedAt);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const blackCount = Array.from(prefs.values()).filter(
    (v) => v === "BLACK"
  ).length;

  // Map of locked cells: keyOf(d,h) -> array of LockedShift (could be multiple positions same cell)
  const lockedByCell = new Map<string, LockedShift[]>();
  for (const s of input.lockedShifts) {
    const k = keyOf(s.dayIndex, s.hour);
    const arr = lockedByCell.get(k);
    if (arr) arr.push(s);
    else lockedByCell.set(k, [s]);
  }

  function isLocked(dayIndex: number, hour: number): boolean {
    return lockedByCell.has(keyOf(dayIndex, hour));
  }

  function getLocked(dayIndex: number, hour: number): LockedShift[] | undefined {
    return lockedByCell.get(keyOf(dayIndex, hour));
  }

  const editable = input.constraintsState === "OPEN" && !submitted;
  const stateLabel =
    input.constraintsState === "NOT_OPENED"
      ? "חלון האילוצים טרם נפתח"
      : input.constraintsState === "LOCKED"
      ? "חלון האילוצים ננעל"
      : submitted
      ? "הוגשו אילוצים"
      : "פתוח להגשה";

  function handleCellClick(dayIndex: number, hour: number) {
    if (!editable) return;
    if (isLocked(dayIndex, hour)) return;
    const k = keyOf(dayIndex, hour);
    const current = prefs.get(k);

    const next: Kind | null = current ? null : "BLACK";

    setErrorMsg(null);
    setPrefs((prev) => {
      const m = new Map(prev);
      if (next === null) m.delete(k);
      else m.set(k, next);
      return m;
    });

    startTransition(async () => {
      const result = await togglePreference(
        input.weekStartIso,
        dayIndex,
        hour
      );
      if ("error" in result && result.error) {
        setErrorMsg(result.error);
        setPrefs((prev) => {
          const m = new Map(prev);
          if (current) m.set(k, current);
          else m.delete(k);
          return m;
        });
      }
    });
  }

  function handleSubmit() {
    if (!confirm("להגיש סופית? לא תוכל לערוך עד שהגישת בטלה.")) return;
    startTransition(async () => {
      const result = await submitConstraints(input.weekStartIso);
      if ("error" in result && result.error) {
        setErrorMsg(result.error);
      } else {
        setSubmitted(true);
        setSubmittedAt(new Date().toISOString());
        setErrorMsg(null);
      }
    });
  }

  function handleUnsubmit() {
    if (!confirm("לפתוח את האילוצים לעריכה מחדש?")) return;
    startTransition(async () => {
      const result = await unsubmitConstraints(input.weekStartIso);
      if ("error" in result && result.error) {
        setErrorMsg(result.error);
      } else {
        setSubmitted(false);
        setSubmittedAt(null);
        setErrorMsg(null);
      }
    });
  }

  return {
    prefs,
    blackCount,
    editable,
    stateLabel,
    submitted,
    submittedAt,
    errorMsg,
    isPending,
    constraintsState: input.constraintsState,
    limits: input.limits,
    handleCellClick,
    handleSubmit,
    handleUnsubmit,
    isLocked,
    getLocked,
  };
}

export type ConstraintsForm = ReturnType<typeof useConstraintsForm>;
