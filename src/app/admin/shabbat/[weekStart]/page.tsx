import { notFound } from "next/navigation";
import Link from "next/link";
import { addDays, format } from "date-fns";
import {
  parseWeekStartParam,
  formatWeekStartParam,
} from "@/lib/dates";
import { getShabbatTracking } from "@/actions/shabbat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, Check, X } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShabbatTrackingPage({
  params,
}: {
  params: { weekStart: string };
}) {
  const weekStart = parseWeekStartParam(params.weekStart);
  if (!weekStart) notFound();

  const data = await getShabbatTracking(weekStart.toISOString());
  const prevWeek = formatWeekStartParam(addDays(weekStart, -7));
  const nextWeek = formatWeekStartParam(addDays(weekStart, 7));
  const endDate = addDays(weekStart, 7);

  // Sort by closedShabbatWeeks asc (those who closed least come first - they should close next)
  const sorted = [...data.soldiers].sort(
    (a, b) => a.closedShabbatWeeks - b.closedShabbatWeeks
  );
  const closedThisWeek = data.soldiers.filter((s) => s.closedShabbatThisWeek);
  const notClosedThisWeek = data.soldiers.filter(
    (s) => !s.closedShabbatThisWeek
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">מעקב שבתות</h1>
          <p className="text-muted-foreground">
            שבוע {format(weekStart, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/shabbat/${prevWeek}`}>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
              שבוע קודם
            </Button>
          </Link>
          <Link href={`/admin/shabbat/${nextWeek}`}>
            <Button variant="outline" size="sm">
              שבוע הבא
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {closedThisWeek.length}
            </div>
            <div className="text-sm text-muted-foreground">סגרו שבת השבוע</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-amber-600">
              {notClosedThisWeek.length}
            </div>
            <div className="text-sm text-muted-foreground">לא סגרו שבת השבוע</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{data.soldiers.length}</div>
            <div className="text-sm text-muted-foreground">סה&quot;כ חיילים</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>סטטוס שבת לכל חייל</CardTitle>
          <p className="text-sm text-muted-foreground">
            ממוין לפי מספר שבתות שסגר היסטורית (פחות = עדיפות לסגירה הבאה)
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-start font-medium">חייל</th>
                <th className="p-2 text-center font-medium">השבוע</th>
                <th className="p-2 text-center font-medium">משמרות שבת השבוע</th>
                <th className="p-2 text-center font-medium">שבתות שסגר (סה״כ)</th>
                <th className="p-2 text-center font-medium">משמרות שבת (סה״כ)</th>
                <th className="p-2 text-center font-medium">שבת אחרונה</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.soldierId} className="border-b">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    {s.closedShabbatThisWeek ? (
                      <Check className="mx-auto h-5 w-5 text-green-600" />
                    ) : (
                      <X className="mx-auto h-5 w-5 text-slate-300" />
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {s.shabbatShiftsThisWeek > 0 ? s.shabbatShiftsThisWeek : "—"}
                  </td>
                  <td className="p-2 text-center font-medium">
                    {s.closedShabbatWeeks}
                  </td>
                  <td className="p-2 text-center text-muted-foreground">
                    {s.totalShabbatShifts}
                  </td>
                  <td className="p-2 text-center text-xs text-muted-foreground">
                    {s.lastClosedWeek
                      ? format(new Date(s.lastClosedWeek), "dd/MM/yyyy")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
