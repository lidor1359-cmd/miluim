"use client";

import {
  useConstraintsForm,
  type PrefItem,
} from "./use-constraints-form";
import { DesktopGrid } from "./desktop-grid";
import { MobileAccordion } from "./mobile-accordion";
import { SoldierNoteBox } from "./soldier-note-box";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  weekStartIso: string;
  weekStartMs: number;
  constraintsState: string;
  initialPreferences: PrefItem[];
  initialSubmitted: boolean;
  initialSubmittedAt: string | null;
  initialNote: string;
  limits: { maxBlack: number; maxGreen: number };
}

export function PreferenceGrid(props: Props) {
  const form = useConstraintsForm({
    weekStartIso: props.weekStartIso,
    constraintsState: props.constraintsState,
    initialPreferences: props.initialPreferences,
    initialSubmitted: props.initialSubmitted,
    initialSubmittedAt: props.initialSubmittedAt,
    limits: props.limits,
  });

  return (
    <>
      {/* Status bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                props.constraintsState === "OPEN" && !form.submitted
                  ? "bg-blue-100 text-blue-800"
                  : form.submitted
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {form.stateLabel}
            </span>
            <span className="text-xs font-medium text-slate-700">
              לתאריכים:{" "}
              {format(new Date(props.weekStartMs), "dd/MM")}
              {" - "}
              {format(
                new Date(props.weekStartMs + 7 * 24 * 60 * 60 * 1000),
                "dd/MM"
              )}
            </span>
            {form.submitted && form.submittedAt && (
              <span className="text-xs text-muted-foreground">
                · הוגש: {format(new Date(form.submittedAt), "dd/MM HH:mm")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-4 text-sm space-y-1.5">
          <div>
            <strong>אופן השימוש:</strong> לחץ על תא כדי לסמן.
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded bg-slate-900"></span>
            <span>
              <strong>שחור</strong> - לא יכול (אילוץ)
            </span>
          </div>
          <div className="text-muted-foreground md:hidden">
            לחץ על כותרת היום כדי לפתוח/לסגור את השעות שלו.
          </div>
        </CardContent>
      </Card>

      {form.errorMsg && (
        <div className="rounded border border-destructive bg-red-50 p-3 text-sm text-destructive">
          {form.errorMsg}
        </div>
      )}

      <DesktopGrid form={form} weekStartMs={props.weekStartMs} />
      <MobileAccordion form={form} weekStartMs={props.weekStartMs} />

      {/* Free-text notes/preferences */}
      <SoldierNoteBox
        weekStartIso={props.weekStartIso}
        initialNote={props.initialNote}
        editable={form.editable}
      />

      {/* Submit area */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
          {!form.submitted ? (
            <>
              <p className="text-sm text-muted-foreground">
                לחץ &quot;הגש סופית&quot; כשסיימת לסמן.
              </p>
              <Button
                onClick={form.handleSubmit}
                disabled={!form.editable || form.isPending}
                size="lg"
              >
                {form.isPending ? (
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="ms-2 h-4 w-4" />
                )}
                הגש סופית
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                האילוצים שלך נשמרו. ניתן לערוך עד נעילת החלון.
              </p>
              <Button
                onClick={form.handleUnsubmit}
                disabled={
                  props.constraintsState !== "OPEN" || form.isPending
                }
                variant="outline"
              >
                {form.isPending ? (
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="ms-2 h-4 w-4" />
                )}
                ערוך
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
