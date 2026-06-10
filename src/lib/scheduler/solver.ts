// CSP backtracking solver for guard duty scheduling

import {
  SHIFT_HOURS,
  ShiftHour,
  DAYS_IN_WEEK,
  MIN_GAP_HOURS,
  SHIFT_DURATION_HOURS,
  SolverInput,
  SolverResult,
  SolverAssignment,
  SlotKey,
  isNightShift,
  isWeekendDay,
  getSlotStartMs,
} from "./types";

interface SlotInternal {
  index: number;
  dayIndex: number;
  hour: ShiftHour;
  positionId: string;
  startMs: number;
  endMs: number;
  domain: Set<string>; // soldier ids still allowed
  locked: boolean;
  assignedSoldierId: string | null;
}

interface SoldierState {
  totalShifts: number;
  nightShifts: number;
  weekendShifts: number;
  shiftMs: number[]; // sorted start times this soldier is assigned
}

function buildSlots(input: SolverInput): SlotInternal[] {
  const slots: SlotInternal[] = [];
  let idx = 0;
  for (let d = 0; d < DAYS_IN_WEEK; d++) {
    for (const h of SHIFT_HOURS) {
      for (const pid of input.positionIds) {
        const startMs = getSlotStartMs(input.weekStartMs, d, h);
        slots.push({
          index: idx++,
          dayIndex: d,
          hour: h,
          positionId: pid,
          startMs,
          endMs: startMs + SHIFT_DURATION_HOURS * 60 * 60 * 1000,
          domain: new Set(input.soldiers.map((s) => s.id)),
          locked: false,
          assignedSoldierId: null,
        });
      }
    }
  }
  return slots;
}

function applyBlackPreferencesToDomains(
  slots: SlotInternal[],
  input: SolverInput
): void {
  // BLACK preferences = hard constraints (חייל לא יכול)
  for (const slot of slots) {
    for (const p of input.preferences) {
      if (p.kind !== "BLACK") continue;
      if (p.dayIndex === slot.dayIndex && p.hour === slot.hour) {
        slot.domain.delete(p.soldierId);
      }
    }
  }
}

function buildGreenLookup(input: SolverInput): Set<string> {
  // Returns set of "soldierId:dayIndex:hour" for fast lookup of GREEN
  const s = new Set<string>();
  for (const p of input.preferences) {
    if (p.kind !== "GREEN") continue;
    s.add(`${p.soldierId}:${p.dayIndex}:${p.hour}`);
  }
  return s;
}

const GREEN_BONUS = 6; // bonus משמעותי כדי שהסולבר יעדיף שיבוץ ירוק

function applyExistingAssignments(
  slots: SlotInternal[],
  input: SolverInput,
  soldierStates: Map<string, SoldierState>
): void {
  if (!input.existingAssignments) return;
  for (const ea of input.existingAssignments) {
    const slot = slots.find(
      (s) =>
        s.dayIndex === ea.dayIndex &&
        s.hour === ea.hour &&
        s.positionId === ea.positionId
    );
    if (!slot) continue;
    // Pre-assign the slot. This works even if the soldier isn't in the
    // auto-pool (e.g. Iron Dome / manual-only): in that case the soldier
    // simply has no SoldierState and can never be picked elsewhere.
    slot.assignedSoldierId = ea.soldierId;
    slot.locked = ea.locked === true;
    // Remove from this slot's auto-candidates (already filled).
    slot.domain.delete(ea.soldierId);
    if (soldierStates.has(ea.soldierId)) {
      updateSoldierState(soldierStates, ea.soldierId, slot, +1);
    }
  }
}

function initSoldierStates(input: SolverInput): Map<string, SoldierState> {
  const m = new Map<string, SoldierState>();
  for (const s of input.soldiers) {
    m.set(s.id, {
      totalShifts: 0,
      nightShifts: 0,
      weekendShifts: 0,
      shiftMs: [],
    });
  }
  return m;
}

function updateSoldierState(
  states: Map<string, SoldierState>,
  soldierId: string,
  slot: SlotInternal,
  delta: 1 | -1
): void {
  const st = states.get(soldierId);
  if (!st) return;
  st.totalShifts += delta;
  if (isNightShift(slot.hour)) st.nightShifts += delta;
  if (isWeekendDay(slot.dayIndex)) st.weekendShifts += delta;
  if (delta === 1) {
    // insert sorted
    let i = 0;
    while (i < st.shiftMs.length && st.shiftMs[i] < slot.startMs) i++;
    st.shiftMs.splice(i, 0, slot.startMs);
  } else {
    const idx = st.shiftMs.indexOf(slot.startMs);
    if (idx >= 0) st.shiftMs.splice(idx, 1);
  }
}

/**
 * Check if assigning `soldierId` to `slot` violates min-rest constraint
 * given current assignments in soldier state.
 */
function violatesRest(
  state: SoldierState,
  slot: SlotInternal
): boolean {
  const gapMs = MIN_GAP_HOURS * 60 * 60 * 1000;
  for (const ms of state.shiftMs) {
    if (Math.abs(ms - slot.startMs) < gapMs) return true;
  }
  return false;
}

/**
 * Pick next unassigned slot using MRV (Most Constrained Variable):
 * smallest legal domain first; tiebreak by earliest time.
 */
function pickNextSlot(
  slots: SlotInternal[],
  soldierStates: Map<string, SoldierState>
): SlotInternal | null {
  let best: SlotInternal | null = null;
  let bestSize = Infinity;
  for (const slot of slots) {
    if (slot.assignedSoldierId !== null) continue;
    // count effective domain: domain minus those violating rest
    let effective = 0;
    for (const sid of slot.domain) {
      const st = soldierStates.get(sid)!;
      if (!violatesRest(st, slot)) effective++;
    }
    if (effective < bestSize) {
      bestSize = effective;
      best = slot;
      if (effective === 0) return slot; // dead-end early
    }
  }
  return best;
}

/**
 * Score how good it is to assign a soldier to a slot.
 * Lower = better. Used for value ordering.
 * Prefers soldiers with fewer shifts (balance) and avoids creating tight clusters.
 */
function valueScore(
  soldierId: string,
  slot: SlotInternal,
  soldierStates: Map<string, SoldierState>,
  avgTarget: number,
  greenSet: Set<string>
): number {
  const st = soldierStates.get(soldierId)!;
  // Heavily prefer those below average
  let score = (st.totalShifts - avgTarget) * 10;
  if (isNightShift(slot.hour)) score += st.nightShifts * 5;
  if (isWeekendDay(slot.dayIndex)) score += st.weekendShifts * 5;
  // GREEN bonus - החייל סימן שהוא רוצה את המשמרת הזו
  if (greenSet.has(`${soldierId}:${slot.dayIndex}:${slot.hour}`)) {
    score -= GREEN_BONUS;
  }
  return score;
}

interface SolverContext {
  slots: SlotInternal[];
  soldiersById: Map<string, { id: string; name: string }>;
  soldierStates: Map<string, SoldierState>;
  avgTarget: number;
  greenSet: Set<string>;
  startMs: number;
  timeBudgetMs: number;
  conflicts: string[];
}

/**
 * Recursive backtracking with MRV variable ordering and LCV-ish value ordering.
 */
function backtrack(ctx: SolverContext): boolean {
  if (Date.now() - ctx.startMs > ctx.timeBudgetMs) return false;
  const slot = pickNextSlot(ctx.slots, ctx.soldierStates);
  if (!slot) return true; // all assigned
  if (slot.domain.size === 0) {
    ctx.conflicts.push(
      `אין חייל זמין למשמרת יום ${slot.dayIndex + 1} שעה ${slot.hour}:00`
    );
    return false;
  }

  // Order candidate soldiers by value score (ascending)
  const candidates: { id: string; score: number }[] = [];
  for (const sid of slot.domain) {
    const st = ctx.soldierStates.get(sid)!;
    if (violatesRest(st, slot)) continue;
    candidates.push({ id: sid, score: valueScore(sid, slot, ctx.soldierStates, ctx.avgTarget, ctx.greenSet) });
  }
  if (candidates.length === 0) return false;
  candidates.sort((a, b) => a.score - b.score);

  for (const c of candidates) {
    // Assign
    slot.assignedSoldierId = c.id;
    updateSoldierState(ctx.soldierStates, c.id, slot, +1);

    if (backtrack(ctx)) return true;

    // Undo
    updateSoldierState(ctx.soldierStates, c.id, slot, -1);
    slot.assignedSoldierId = null;
  }
  return false;
}

export function solveSchedule(input: SolverInput): SolverResult {
  const startMs = Date.now();
  const slots = buildSlots(input);
  applyBlackPreferencesToDomains(slots, input);
  const soldierStates = initSoldierStates(input);
  applyExistingAssignments(slots, input, soldierStates);
  const greenSet = buildGreenLookup(input);

  const totalSlots = slots.length;
  const numSoldiers = input.soldiers.length;
  const avgTarget = numSoldiers > 0 ? totalSlots / numSoldiers : 0;

  const ctx: SolverContext = {
    slots,
    soldiersById: new Map(input.soldiers.map((s) => [s.id, s])),
    soldierStates,
    avgTarget,
    greenSet,
    startMs,
    timeBudgetMs: 5000,
    conflicts: [],
  };

  const success = backtrack(ctx);

  const assignments: SolverAssignment[] = [];
  const unassigned: SlotKey[] = [];
  for (const slot of slots) {
    if (slot.assignedSoldierId) {
      assignments.push({
        dayIndex: slot.dayIndex,
        hour: slot.hour,
        positionId: slot.positionId,
        soldierId: slot.assignedSoldierId,
        locked: slot.locked,
      });
    } else {
      unassigned.push({
        dayIndex: slot.dayIndex,
        hour: slot.hour,
        positionId: slot.positionId,
      });
    }
  }

  // Build stats
  const shiftsPerSoldier: Record<string, number> = {};
  const nightShiftsPerSoldier: Record<string, number> = {};
  const weekendShiftsPerSoldier: Record<string, number> = {};
  for (const [sid, st] of soldierStates.entries()) {
    shiftsPerSoldier[sid] = st.totalShifts;
    nightShiftsPerSoldier[sid] = st.nightShifts;
    weekendShiftsPerSoldier[sid] = st.weekendShifts;
  }

  const counts = Object.values(shiftsPerSoldier);
  const mean = counts.reduce((a, b) => a + b, 0) / Math.max(counts.length, 1);
  const variance =
    counts.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(counts.length, 1);
  const fairnessScore = 100 - Math.min(variance * 10, 100);

  return {
    success,
    assignments,
    unassigned,
    conflicts: ctx.conflicts,
    stats: {
      totalShifts: totalSlots,
      assignedShifts: assignments.length,
      shiftsPerSoldier,
      nightShiftsPerSoldier,
      weekendShiftsPerSoldier,
      fairnessScore: Math.round(fairnessScore),
      durationMs: Date.now() - startMs,
    },
  };
}

/**
 * Refine an existing valid assignment by simulated annealing swap moves
 * to improve fairness.
 */
export function refineSchedule(
  input: SolverInput,
  initial: SolverAssignment[],
  iterations = 2000
): SolverResult {
  const startMs = Date.now();
  const slots = buildSlots(input);
  applyBlackPreferencesToDomains(slots, input);
  const soldierStates = initSoldierStates(input);
  const greenSet = buildGreenLookup(input);

  // Apply initial
  const slotByKey = new Map<string, SlotInternal>();
  for (const slot of slots) {
    slotByKey.set(`${slot.dayIndex}-${slot.hour}-${slot.positionId}`, slot);
  }
  for (const a of initial) {
    const slot = slotByKey.get(`${a.dayIndex}-${a.hour}-${a.positionId}`);
    if (!slot) continue;
    slot.assignedSoldierId = a.soldierId;
    slot.locked = a.locked === true;
    if (soldierStates.has(a.soldierId)) {
      updateSoldierState(soldierStates, a.soldierId, slot, +1);
    }
  }

  function currentCost(): number {
    const totals: number[] = [];
    const nights: number[] = [];
    const weekends: number[] = [];
    for (const st of soldierStates.values()) {
      totals.push(st.totalShifts);
      nights.push(st.nightShifts);
      weekends.push(st.weekendShifts);
    }
    function variance(arr: number[]): number {
      if (arr.length === 0) return 0;
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
    }
    // GREEN bonus: דקירה כל מיני שיבוצים שתואמים העדפה ירוקה
    let greenMatched = 0;
    for (const slot of slots) {
      if (!slot.assignedSoldierId) continue;
      if (greenSet.has(`${slot.assignedSoldierId}:${slot.dayIndex}:${slot.hour}`)) {
        greenMatched++;
      }
    }
    return (
      10 * variance(totals) +
      8 * variance(nights) +
      8 * variance(weekends) -
      GREEN_BONUS * greenMatched
    );
  }

  let cost = currentCost();
  let temp = 1.0;
  const cooling = 0.995;

  const assignedSlots = slots.filter((s) => s.assignedSoldierId !== null);

  for (let i = 0; i < iterations; i++) {
    if (Date.now() - startMs > 3000) break;

    // Pick two random assigned slots
    const a = assignedSlots[Math.floor(Math.random() * assignedSlots.length)];
    const b = assignedSlots[Math.floor(Math.random() * assignedSlots.length)];
    if (!a.assignedSoldierId || !b.assignedSoldierId) continue;
    if (a.assignedSoldierId === b.assignedSoldierId) continue;
    if (a.locked || b.locked) continue;

    const aSid = a.assignedSoldierId;
    const bSid = b.assignedSoldierId;

    // Check swap is hard-feasible
    if (!a.domain.has(bSid) || !b.domain.has(aSid)) continue;

    // Tentatively remove both then check rest constraints
    updateSoldierState(soldierStates, aSid, a, -1);
    updateSoldierState(soldierStates, bSid, b, -1);

    const stA = soldierStates.get(aSid)!;
    const stB = soldierStates.get(bSid)!;
    if (violatesRest(stB, a) || violatesRest(stA, b)) {
      // revert
      updateSoldierState(soldierStates, aSid, a, +1);
      updateSoldierState(soldierStates, bSid, b, +1);
      continue;
    }

    // Perform swap
    a.assignedSoldierId = bSid;
    b.assignedSoldierId = aSid;
    updateSoldierState(soldierStates, bSid, a, +1);
    updateSoldierState(soldierStates, aSid, b, +1);

    const newCost = currentCost();
    const dCost = newCost - cost;
    if (dCost < 0 || Math.random() < Math.exp(-dCost / temp)) {
      cost = newCost;
    } else {
      // revert
      updateSoldierState(soldierStates, bSid, a, -1);
      updateSoldierState(soldierStates, aSid, b, -1);
      a.assignedSoldierId = aSid;
      b.assignedSoldierId = bSid;
      updateSoldierState(soldierStates, aSid, a, +1);
      updateSoldierState(soldierStates, bSid, b, +1);
    }

    temp *= cooling;
  }

  // Build result
  const assignments: SolverAssignment[] = [];
  const unassigned: SlotKey[] = [];
  for (const slot of slots) {
    if (slot.assignedSoldierId) {
      assignments.push({
        dayIndex: slot.dayIndex,
        hour: slot.hour,
        positionId: slot.positionId,
        soldierId: slot.assignedSoldierId,
        locked: slot.locked,
      });
    } else {
      unassigned.push({
        dayIndex: slot.dayIndex,
        hour: slot.hour,
        positionId: slot.positionId,
      });
    }
  }

  const shiftsPerSoldier: Record<string, number> = {};
  const nightShiftsPerSoldier: Record<string, number> = {};
  const weekendShiftsPerSoldier: Record<string, number> = {};
  for (const [sid, st] of soldierStates.entries()) {
    shiftsPerSoldier[sid] = st.totalShifts;
    nightShiftsPerSoldier[sid] = st.nightShifts;
    weekendShiftsPerSoldier[sid] = st.weekendShifts;
  }

  return {
    success: true,
    assignments,
    unassigned,
    conflicts: [],
    stats: {
      totalShifts: slots.length,
      assignedShifts: assignments.length,
      shiftsPerSoldier,
      nightShiftsPerSoldier,
      weekendShiftsPerSoldier,
      fairnessScore: Math.round(100 - Math.min(cost, 100)),
      durationMs: Date.now() - startMs,
    },
  };
}
