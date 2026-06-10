import { prisma } from "@/lib/db";
import { getCurrentSoldierId } from "@/lib/soldier-session";
import {
  getActiveConstraintWeek,
  getSoldierConstraintView,
} from "@/actions/constraints";
import {
  getActiveSoldierScheduleWeek,
  getAdjacentPublishedWeek,
  getSoldierScheduleView,
} from "@/actions/schedule";
import { getWeekStart } from "@/lib/dates";
import { format } from "date-fns";
import { PreferenceGrid } from "./preference-grid";
import { IdentifyForm } from "./identify-form";
import { CTabs, type TabKey } from "./c-tabs";
import { MySchedule } from "./my-schedule";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { tab?: string; week?: string };
}

/**
 * Returns the OPEN constraint week's date range string (e.g. "14/06 - 20/06"),
 * or null if there is no OPEN window.
 */
async function getOpenConstraintRangeLabel(): Promise<string | null> {
  const open = await prisma.schedule.findFirst({
    where: { constraintsState: "OPEN" },
    orderBy: { weekStartDate: "desc" },
  });
  if (!open) return null;
  const start = open.weekStartDate;
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`;
}

function UnauthLanding({
  rangeLabel,
  expired,
}: {
  rangeLabel: string | null;
  expired: boolean;
}) {
  return (
    <main className="min-h-screen bg-slate-50 py-10" dir="rtl">
      <div className="container max-w-md space-y-4 px-3">
        <div className="rounded-lg bg-white p-6 shadow">
          {rangeLabel ? (
            <>
              <h1 className="mb-1 text-2xl font-bold">הגשת אילוצים</h1>
              <p className="text-sm text-muted-foreground">
                לשבוע{" "}
                <span className="font-semibold text-slate-800">
                  {rangeLabel}
                </span>
              </p>
            </>
          ) : (
            <h1 className="mb-1 text-2xl font-bold">כניסה</h1>
          )}
          <p className="mb-6 mt-3 text-sm text-muted-foreground">
            {expired
              ? "ההזדהות פגה. אנא הזדהה מחדש בשם המלא שלך."
              : "כדי להתחיל, הזן את השם המלא שלך."}
          </p>
          <IdentifyForm />
        </div>
      </div>
    </main>
  );
}

export default async function SoldierHomePage({ searchParams }: PageProps) {
  const soldierId = getCurrentSoldierId();

  // Unauthenticated → identification form
  if (!soldierId) {
    const rangeLabel = await getOpenConstraintRangeLabel();
    return <UnauthLanding rangeLabel={rangeLabel} expired={false} />;
  }

  // Confirm soldier still exists and is active
  const soldier = await prisma.soldier.findUnique({ where: { id: soldierId } });
  if (!soldier || !soldier.active) {
    const rangeLabel = await getOpenConstraintRangeLabel();
    return <UnauthLanding rangeLabel={rangeLabel} expired={true} />;
  }

  // ===== Load data for both tabs =====

  // Schedule tab: week comes from ?week=YYYY-MM-DD, else most recent published
  let scheduleWeek: Date | null = null;
  if (searchParams?.week) {
    try {
      scheduleWeek = getWeekStart(new Date(searchParams.week));
    } catch {
      scheduleWeek = null;
    }
  }
  if (!scheduleWeek) {
    scheduleWeek = await getActiveSoldierScheduleWeek();
  }

  const scheduleView = scheduleWeek
    ? await getSoldierScheduleView(soldierId, scheduleWeek.toISOString())
    : null;

  const [prevWeekIso, nextWeekIso] = scheduleView
    ? await Promise.all([
        getAdjacentPublishedWeek(scheduleView.weekStartIso, "prev"),
        getAdjacentPublishedWeek(scheduleView.weekStartIso, "next"),
      ])
    : [null, null];

  // Constraints tab: always the active constraint week
  const constraintsWeek = await getActiveConstraintWeek();
  const constraintsView = await getSoldierConstraintView(constraintsWeek);

  const constraintsOpen =
    !!constraintsView && constraintsView.constraintsState === "OPEN";

  // ===== Resolve active tab =====
  // Priority:
  //   1. Explicit ?tab= param
  //   2. If constraints window is OPEN and soldier hasn't submitted yet → constraints
  //   3. Else if there's a published schedule for the soldier → schedule
  //   4. Else → schedule (will show "no schedule yet" message)
  const tabParam = (searchParams?.tab ?? "") as string;
  let active: TabKey;
  if (tabParam === "constraints" || tabParam === "schedule") {
    active = tabParam;
  } else if (constraintsOpen && !constraintsView?.submitted) {
    active = "constraints";
  } else if (scheduleView) {
    active = "schedule";
  } else if (constraintsOpen) {
    active = "constraints";
  } else {
    active = "schedule";
  }

  const tabs = [
    {
      key: "schedule" as TabKey,
      label: "השמירות שלי",
      available: !!scheduleView,
      badge:
        scheduleView && scheduleView.myShifts.length > 0
          ? String(scheduleView.myShifts.length)
          : null,
    },
    {
      key: "constraints" as TabKey,
      label: "הגשת אילוצים",
      available: !!constraintsView,
      badge: constraintsOpen && !constraintsView?.submitted ? "פתוח" : null,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 py-6" dir="rtl">
      <div className="container max-w-4xl space-y-4 px-3">
        {/* Soldier header */}
        <div
          className="rounded-lg p-5 text-center text-white shadow"
          style={{ backgroundColor: soldier.color }}
        >
          <p className="text-sm opacity-90">שלום</p>
          <h1 className="text-3xl font-bold">{soldier.name}</h1>
        </div>

        {/* Tabs */}
        <CTabs active={active} tabs={tabs} />

        {/* Tab content */}
        {active === "schedule" ? (
          scheduleView ? (
            <MySchedule
              view={scheduleView}
              soldier={{
                id: soldier.id,
                name: soldier.name,
                color: soldier.color,
              }}
              prevWeekIso={prevWeekIso}
              nextWeekIso={nextWeekIso}
            />
          ) : (
            <div className="rounded-lg bg-white p-6 text-center text-sm text-muted-foreground shadow">
              עדיין לא פורסם שבצ&quot;ק.
            </div>
          )
        ) : constraintsView ? (
          <PreferenceGrid
            weekStartIso={constraintsView.weekStartIso}
            weekStartMs={new Date(constraintsView.weekStartIso).getTime()}
            constraintsState={constraintsView.constraintsState}
            initialPreferences={constraintsView.preferences}
            initialSubmitted={constraintsView.submitted}
            initialSubmittedAt={constraintsView.submittedAt}
            initialNote={constraintsView.note}
            limits={constraintsView.limits}
          />
        ) : (
          <div className="rounded-lg bg-white p-6 text-center text-sm text-muted-foreground shadow">
            חלון הגשת האילוצים סגור כרגע.
          </div>
        )}
      </div>
    </main>
  );
}
