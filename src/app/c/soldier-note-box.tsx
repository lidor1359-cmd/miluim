"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { saveSoldierNote } from "@/actions/constraints";
import { Loader2, Check, NotebookPen } from "lucide-react";

interface Props {
  weekStartIso: string;
  initialNote: string;
  editable: boolean;
}

const MAX_LEN = 2000;
const DEBOUNCE_MS = 800;

export function SoldierNoteBox({ weekStartIso, initialNote, editable }: Props) {
  const [text, setText] = useState(initialNote);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastSavedRef = useRef(initialNote);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flush(value: string) {
    if (value === lastSavedRef.current) return;
    startTransition(async () => {
      const result = await saveSoldierNote(weekStartIso, value);
      if ("error" in result && result.error) {
        setErrorMsg(result.error);
      } else {
        lastSavedRef.current = value;
        setSavedAt(Date.now());
        setErrorMsg(null);
      }
    });
  }

  function scheduleSave(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flush(value), DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Clear the "נשמר" badge after 3 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setTick((x) => x + 1), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const showSavedBadge =
    savedAt !== null && Date.now() - savedAt < 3000 && !isPending;

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <NotebookPen className="h-4 w-4 text-slate-600" />
            הערות / העדפות
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isPending && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                שומר...
              </span>
            )}
            {showSavedBadge && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Check className="h-3 w-3" />
                נשמר
              </span>
            )}
            <span>
              {text.length}/{MAX_LEN}
            </span>
          </div>
        </div>
        <textarea
          dir="rtl"
          value={text}
          onChange={(e) => {
            const v = e.target.value.slice(0, MAX_LEN);
            setText(v);
            if (editable) scheduleSave(v);
          }}
          onBlur={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (editable) flush(text);
          }}
          disabled={!editable}
          placeholder={
            editable
              ? "כתוב כאן הערות, בקשות או העדפות לפני הגשה (לדוגמה: יש לי אירוע בשני בערב, אילוצים נקודתיים אחרים, וכו')..."
              : "אין הערות"
          }
          rows={4}
          className="w-full resize-y rounded-md border bg-white p-3 text-sm leading-relaxed shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
        />
        {errorMsg && (
          <div className="rounded border border-destructive bg-red-50 p-2 text-xs text-destructive">
            {errorMsg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
