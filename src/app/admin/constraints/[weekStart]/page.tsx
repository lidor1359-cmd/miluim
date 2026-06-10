import { notFound } from "next/navigation";
import Link from "next/link";
import { addDays, format } from "date-fns";
import {
  parseWeekStartParam,
  formatWeekStartParam,
} from "@/lib/dates";
import { getSubmissionStatus } from "@/actions/constraints";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { ConstraintsDashboard } from "./constraints-dashboard";

export const dynamic = "force-dynamic";

export default async function ConstraintsAdminWeekPage({
  params,
}: {
  params: { weekStart: string };
}) {
  const weekStart = parseWeekStartParam(params.weekStart);
  if (!weekStart) notFound();

  const data = await getSubmissionStatus(weekStart.toISOString());
  const prevWeek = formatWeekStartParam(addDays(weekStart, -7));
  const nextWeek = formatWeekStartParam(addDays(weekStart, 7));
  const endDate = addDays(weekStart, 6);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">אילוצים שבועיים</h1>
          <p className="text-muted-foreground">
            {format(weekStart, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/constraints/${prevWeek}`}>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
              שבוע קודם
            </Button>
          </Link>
          <Link href={`/admin/constraints/${nextWeek}`}>
            <Button variant="outline" size="sm">
              שבוע הבא
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <ConstraintsDashboard
        weekStartIso={weekStart.toISOString()}
        initialData={data}
      />
    </div>
  );
}
