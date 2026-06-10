"use client";

import { useState, useTransition, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SoldierChip } from "@/components/schedule/SoldierChip";
import { ShiftCell } from "@/components/schedule/ShiftCell";
import {
  autoGenerate,
  clearSchedule,
  setAssignment,
  setAssignmentLock,
  lockAllFilled,
  unlockAll,
  publishSchedule,
} from "@/actions/schedule";
import { SHIFT_HOURS } from "@/lib/scheduler/types";
import { Sparkles, Trash2, Send, Loader2, Lock, Unlock } from "lucide-react";

interface SoldierLite {
  id: string;
  name: string;
  color: string;
}

interface Position {
  id: string;
  name: string;
}

interface DayInfo {
  dayIndex: number;
  name: string;
  label: string;
  iso: string;
}

interface AssignmentLite {
  dayIndex: number;
  hour: number;
  positionId: string;
  soldierId: string | null;
  locked: boolean;
}

interface PreferenceLite {
  soldierId: string;
  dayIndex: number;
  hour: number;
  kind: "BLACK" | "GREEN";
}

export function ScheduleBuilder({
  scheduleId,
  weekStartIso,
  status,
  soldiers,
  positions,
  dayDates,
  initialAssignments,
  preferences,
}: {
  scheduleId: string;
  weekStartIso: string;
  status: string;
  soldiers: SoldierLite[];
  positions: Position[];
  dayDates: DayInfo[];
  initialAssignments: AssignmentLite[];
  preferences: PreferenceLite[];
}) {
  const [assignments, setAssignments] = useState<Map<string, string | null>>(
    () => {
      const m = new Map<string, string | null>();
      for (const a of initialAssignments) {
        m.set(`${a.dayIndex}-${a.hour}-${a.positionId}`, a.soldierId);
      }
      return m;
    }
  );
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const a of initialAssignments) {
      if (a.locked) s.add(`${a.dayIndex}-${a.hour}-${a.positionId}`);
    }
    return s;
  });
  const [draggedSoldierId, setDraggedSoldierId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<{
    assignedShifts: number;
    totalShifts: number;
    fairnessScore: number;
  } | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const soldiersById = useMemo(() => {
    const m = new Map<string, SoldierLite>();
    for (const s of soldiers) m.set(s.id, s);
    return m;
  }, [soldiers]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Build lookup: "soldierId:dayIndex:hour" → kind
  const prefMap = useMemo(() => {
    const m = new Map<string, "BLACK" | "GREEN">();
    for (const p of preferences) {
      m.set(`${p.soldierId}:${p.dayIndex}:${p.hour}`, p.kind);
    }
    return m;
  }, [preferences]);

  function getDragHighlight(
    soldierId: string,
    dayIndex: number,
    hour: number
  ): "blocked" | "preferred" | "ok" {
    const kind = prefMap.get(`${soldierId}:${dayIndex}:${hour}`);
    if (kind === "BLACK") return "blocked";
    if (kind === "GREEN") return "preferred";
    return "ok";
  }

  // Compute per-soldier total shifts for legend
  const shiftCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [, sid] of assignments) {
      if (sid) counts.set(sid, (counts.get(sid) || 0) + 1);
    }
    return counts;
  }, [assignments]);

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    if (id.startsWith("soldier-")) {
      setDraggedSoldierId(id.slice("soldier-".length));
    } else if (id.startsWith("cell-")) {
      const key = id.slice("cell-".length);
      const sid = assignments.get(key);
      setDraggedSoldierId(sid ?? null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggedSoldierId(null);
    const activeId = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    if (!overId.startsWith("cell-")) return;

    const targetKey = overId.slice("cell-".length);
    const [tDay, tHour, tPos] = targetKey.split("-");

    // Don't drop onto a locked cell
    if (lockedKeys.has(targetKey)) return;

    let soldierId: string | null = null;
    let sourceKey: string | null = null;

    if (activeId.startsWith("soldier-")) {
      soldierId = activeId.slice("soldier-".length);
    } else if (activeId.startsWith("cell-")) {
      sourceKey = activeId.slice("cell-".length);
      // Locked source can't be moved
      if (sourceKey && lockedKeys.has(sourceKey)) return;
      soldierId = assignments.get(sourceKey) ?? null;
    }

    if (!soldierId) return;

    // Optimistic update
    setAssignments((prev) => {
      const next = new Map(prev);
      if (sourceKey) {
        // Swap: move target's current to source
        const targetSoldier = next.get(targetKey) ?? null;
        next.set(sourceKey, targetSoldier);
      }
      next.set(targetKey, soldierId);
      return next;
    });

    // Persist
    startTransition(async () => {
      await setAssignment(
        scheduleId,
        Number(tDay),
        Number(tHour),
        tPos,
        soldierId,
        weekStartIso
      );
      if (sourceKey) {
        const [sDay, sHour, sPos] = sourceKey.split("-");
        const targetSoldier = assignments.get(targetKey) ?? null;
        await setAssignment(
          scheduleId,
          Number(sDay),
          Number(sHour),
          sPos,
          targetSoldier,
          weekStartIso
        );
      }
    });
  }

  function handleClearCell(key: string) {
    if (lockedKeys.has(key)) return;
    const [d, h, p] = key.split("-");
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(key, null);
      return next;
    });
    startTransition(async () => {
      await setAssignment(scheduleId, Number(d), Number(h), p, null, weekStartIso);
    });
  }

  function handleToggleLock(key: string) {
    const [d, h, p] = key.split("-");
    const willLock = !lockedKeys.has(key);
    // Can't lock an empty cell
    if (willLock && !assignments.get(key)) return;
    setLockedKeys((prev) => {
      const next = new Set(prev);
      if (willLock) next.add(key);
      else next.delete(key);
      return next;
    });
    startTransition(async () => {
      await setAssignmentLock(
        scheduleId,
        Number(d),
        Number(h),
        p,
        willLock,
        weekStartIso
      );
    });
  }

  async function handleLockAll() {
    startTransition(async () => {
      await lockAllFilled(scheduleId, weekStartIso);
      const next = new Set<string>();
      for (const [k, sid] of assignments) {
        if (sid) next.add(k);
      }
      setLockedKeys(next);
    });
  }

  async function handleUnlockAll() {
    if (!confirm("לשחרר את כל השיבוצים הקשיחים?")) return;
    startTransition(async () => {
      await unlockAll(scheduleId, weekStartIso);
      setLockedKeys(new Set());
    });
  }

  async function handleAutoGenerate() {
    setGenerating(true);
    setConflicts([]);
    try {
      const result = await autoGenerate(scheduleId, weekStartIso);
      setStats({
        assignedShifts: result.stats.assignedShifts,
        totalShifts: result.stats.totalShifts,
        fairnessScore: result.stats.fairnessScore,
      });
      setConflicts(result.conflicts || []);
      // Reload data without full page refresh - use server state via revalidatePath
      // But since assignments are local, we need to refresh
      window.location.reload();
    } finally {
      setGenerating(false);
    }
  }

  async function handleClearSchedule() {
    if (!confirm("למחוק את כל השיבוצים בשבוע זה?")) return;
    startTransition(async () => {
      await clearSchedule(scheduleId, weekStartIso);
      setAssignments(new Map());
    });
  }

  async function handlePublish() {
    if (!confirm("לפרסם את השבצ\"ק?")) return;
    startTransition(async () => {
      await publishSchedule(scheduleId, weekStartIso);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="space-y-4 order-2 lg:order-1">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>פעולות</CardTitle>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  status === "PUBLISHED"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {status === "PUBLISHED" ? "פורסם" : "טיוטה"}
              </span>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={handleAutoGenerate} disabled={generating || isPending}>
                {generating ? (
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="ms-2 h-4 w-4" />
                )}
                שיבוץ אוטומטי
              </Button>
              <Button
                variant="outline"
                onClick={handleLockAll}
                disabled={isPending}
                title="נעל את כל השיבוצים המלאים כעת. שיבוץ אוטומטי לא יגע בהם"
              >
                <Lock className="ms-2 h-4 w-4" />
                נעל את כל השיבוצים הקיימים
                {lockedKeys.size > 0 && (
                  <span className="ms-1 text-xs opacity-70">
                    ({lockedKeys.size} נעולים)
                  </span>
                )}
              </Button>
              {lockedKeys.size > 0 && (
                <Button
                  variant="outline"
                  onClick={handleUnlockAll}
                  disabled={isPending}
                >
                  <Unlock className="ms-2 h-4 w-4" />
                  שחרר הכל
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleClearSchedule}
                disabled={isPending}
              >
                <Trash2 className="ms-2 h-4 w-4" />
                נקה הכל
              </Button>
              <Button
                variant="default"
                onClick={handlePublish}
                disabled={isPending || status === "PUBLISHED"}
              >
                <Send className="ms-2 h-4 w-4" />
                פרסם
              </Button>
            </CardContent>
          </Card>

          {stats && (
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.assignedShifts}/{stats.totalShifts}
                    </div>
                    <div className="text-muted-foreground">משובצים</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.fairnessScore}
                    </div>
                    <div className="text-muted-foreground">ציון הוגנות</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {soldiers.length}
                    </div>
                    <div className="text-muted-foreground">חיילים</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {conflicts.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">
                  התנגשויות ({conflicts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pe-5 text-sm space-y-1">
                  {conflicts.slice(0, 10).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {positions.map((pos) => (
            <Card key={pos.id}>
              <CardHeader>
                <CardTitle className="text-lg">{pos.name}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-center text-sm">
                  <thead>
                    <tr>
                      <th className="border bg-slate-100 p-2 font-medium">
                        שעה
                      </th>
                      {dayDates.map((d) => (
                        <th
                          key={d.dayIndex}
                          className="border bg-slate-100 p-2 font-medium min-w-[100px]"
                        >
                          <div>{d.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFT_HOURS.map((h) => {
                      const endH = (h + 4) % 24;
                      const timeLabel = `${pad(h)}:00-${pad(endH)}:00`;
                      return (
                        <tr key={h}>
                          <td className="border bg-slate-50 p-2 font-medium whitespace-nowrap">
                            {timeLabel}
                          </td>
                          {dayDates.map((d) => {
                            const key = `${d.dayIndex}-${h}-${pos.id}`;
                            const soldierId = assignments.get(key);
                            const soldier = soldierId
                              ? soldiersById.get(soldierId)
                              : null;
                            const highlight = draggedSoldierId
                              ? getDragHighlight(
                                  draggedSoldierId,
                                  d.dayIndex,
                                  h
                                )
                              : null;
                            return (
                              <ShiftCell
                                key={key}
                                cellKey={key}
                                soldier={soldier ?? null}
                                locked={lockedKeys.has(key)}
                                onClear={() => handleClearCell(key)}
                                onToggleLock={() => handleToggleLock(key)}
                                highlight={highlight}
                              />
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="order-1 lg:order-2">
          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-lg">מקרא חיילים</CardTitle>
              <p className="text-xs text-muted-foreground">
                גרור חייל לתא בלוח
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                {soldiers.map((s) => (
                  <SoldierChip
                    key={s.id}
                    id={`soldier-${s.id}`}
                    soldier={s}
                    count={shiftCounts.get(s.id) || 0}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DragOverlay>
        {draggedSoldierId && soldiersById.get(draggedSoldierId) && (
          <SoldierChip
            id="overlay"
            soldier={soldiersById.get(draggedSoldierId)!}
            count={0}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
