"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  openConstraintsWindow,
  lockConstraintsWindow,
  reopenConstraintsWindow,
  getSubmissionStatus,
} from "@/actions/constraints";
import { Unlock, Lock, RefreshCw, Loader2, Check, Clock } from "lucide-react";
import { format } from "date-fns";
import { SoldierPreferencesModal } from "./soldier-preferences-modal";

interface SoldierStatus {
  id: string;
  name: string;
  personalId: string | null;
  color: string;
  submitted: boolean;
  submittedAt: string | null;
  blackCount: number;
}

interface DashboardData {
  weekStartIso: string;
  constraintsState: string;
  constraintsOpenedAt: string | null;
  constraintsLockedAt: string | null;
  soldiers: SoldierStatus[];
}

interface Props {
  weekStartIso: string;
  initialData: DashboardData;
}

export function ConstraintsDashboard({ weekStartIso, initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [selectedSoldier, setSelectedSoldier] = useState<SoldierStatus | null>(
    null
  );

  // Live polling every 3 seconds when window is OPEN
  useEffect(() => {
    if (data.constraintsState !== "OPEN") return;
    const interval = setInterval(async () => {
      const fresh = await getSubmissionStatus(weekStartIso);
      setData(fresh);
    }, 3000);
    return () => clearInterval(interval);
  }, [weekStartIso, data.constraintsState]);

  // Tick once a second to refresh "עודכן הרגע" badge
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    const fresh = await getSubmissionStatus(weekStartIso);
    setData(fresh);
  }

  function handleOpen() {
    startTransition(async () => {
      await openConstraintsWindow(weekStartIso);
      await refresh();
    });
  }

  function handleLock() {
    if (!confirm("לנעול את חלון האילוצים? חיילים לא יוכלו לערוך יותר.")) return;
    startTransition(async () => {
      await lockConstraintsWindow(weekStartIso);
      await refresh();
    });
  }

  function handleReopen() {
    if (!confirm("לפתוח מחדש את חלון האילוצים?")) return;
    startTransition(async () => {
      await reopenConstraintsWindow(weekStartIso);
      await refresh();
    });
  }

  const submitted = data.soldiers.filter((s) => s.submitted);
  const notSubmitted = data.soldiers.filter((s) => !s.submitted);

  const stateLabel =
    data.constraintsState === "OPEN"
      ? "פתוח"
      : data.constraintsState === "LOCKED"
      ? "נעול"
      : "לא נפתח";
  const stateBg =
    data.constraintsState === "OPEN"
      ? "bg-blue-100 text-blue-800"
      : data.constraintsState === "LOCKED"
      ? "bg-red-100 text-red-800"
      : "bg-slate-100 text-slate-800";

  return (
    <>
      {/* Control panel */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>חלון הגשה</CardTitle>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${stateBg}`}>
            {stateLabel}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground space-y-0.5">
            {data.constraintsOpenedAt && (
              <div>
                נפתח: {format(new Date(data.constraintsOpenedAt), "dd/MM HH:mm")}
              </div>
            )}
            {data.constraintsLockedAt && (
              <div>
                ננעל: {format(new Date(data.constraintsLockedAt), "dd/MM HH:mm")}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.constraintsState !== "OPEN" && (
              <Button onClick={handleOpen} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="ms-2 h-4 w-4" />
                )}
                {data.constraintsState === "LOCKED" ? "פתח מחדש" : "פתח חלון"}
              </Button>
            )}
            {data.constraintsState === "OPEN" && (
              <Button onClick={handleLock} disabled={isPending} variant="destructive">
                {isPending ? (
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="ms-2 h-4 w-4" />
                )}
                נעל חלון
              </Button>
            )}
            <Button onClick={refresh} disabled={isPending} variant="outline">
              <RefreshCw className="ms-2 h-4 w-4" />
              רענן
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-600">{submitted.length}</div>
            <div className="text-sm text-muted-foreground">הגישו</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-amber-600">
              {notSubmitted.length}
            </div>
            <div className="text-sm text-muted-foreground">טרם הגישו</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{data.soldiers.length}</div>
            <div className="text-sm text-muted-foreground">סה&quot;כ חיילים</div>
          </CardContent>
        </Card>
      </div>

      {/* Submitted */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Check className="h-5 w-5" /> הגישו ({submitted.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitted.length === 0 ? (
            <p className="text-sm text-muted-foreground">עדיין אף אחד לא הגיש</p>
          ) : (
            <ul className="divide-y">
              {submitted.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSoldier(s)}
                    className="flex items-center gap-2 rounded px-1 -mx-1 hover:bg-slate-100 transition text-right"
                    title="לחץ לצפייה ברשת האילוצים"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="font-medium underline-offset-2 hover:underline">
                      {s.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      · {s.personalId || "—"}
                    </span>
                  </button>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-700">⬛ {s.blackCount}</span>
                    {s.submittedAt && (() => {
                      const sub = new Date(s.submittedAt);
                      const ageSec = (Date.now() - sub.getTime()) / 1000;
                      const isFresh = ageSec >= 0 && ageSec < 60;
                      return (
                        <>
                          {isFresh && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 animate-pulse">
                              עודכן הרגע
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(sub, "dd/MM HH:mm:ss")}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Not submitted */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Clock className="h-5 w-5" /> טרם הגישו ({notSubmitted.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notSubmitted.length === 0 ? (
            <p className="text-sm text-muted-foreground">כולם הגישו!</p>
          ) : (
            <ul className="divide-y">
              {notSubmitted.map((s) => {
                const hasDraft = s.blackCount > 0;
                const inner = (
                  <>
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span
                      className={`font-medium ${
                        hasDraft ? "underline-offset-2 hover:underline" : ""
                      }`}
                    >
                      {s.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      · {s.personalId || "—"}
                    </span>
                  </>
                );
                return (
                <li key={s.id} className="flex items-center justify-between py-2">
                  {hasDraft ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSoldier(s)}
                      className="flex items-center gap-2 rounded px-1 -mx-1 hover:bg-slate-100 transition text-right"
                      title="לחץ לצפייה בטיוטה"
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">{inner}</div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {s.blackCount > 0 && (
                      <>
                        <span>⬛ {s.blackCount}</span>
                        <span className="text-xs italic">(טיוטה)</span>
                      </>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {data.constraintsState === "LOCKED" && (
        <Card>
          <CardContent className="pt-4">
            <Button onClick={handleReopen} disabled={isPending} variant="outline">
              <Unlock className="ms-2 h-4 w-4" />
              פתח מחדש את החלון
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedSoldier && (
        <SoldierPreferencesModal
          soldierId={selectedSoldier.id}
          soldierName={selectedSoldier.name}
          personalId={selectedSoldier.personalId}
          color={selectedSoldier.color}
          weekStartIso={weekStartIso}
          onClose={() => setSelectedSoldier(null)}
        />
      )}
    </>
  );
}
