import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { getWeekStart, formatWeekStartParam } from "@/lib/dates";

export default async function AdminDashboard() {
  const [soldiersCount, schedules, submissionsThisWeek, activeSoldiers] =
    await Promise.all([
      prisma.soldier.count(),
      prisma.schedule.findMany({
        orderBy: { weekStartDate: "desc" },
        take: 5,
      }),
      prisma.soldierWeekSubmission.count({
        where: { weekStartDate: getWeekStart(new Date()) },
      }),
      prisma.soldier.count({ where: { active: true } }),
    ]);

  const thisWeekStart = getWeekStart(new Date());
  const thisWeekParam = formatWeekStartParam(thisWeekStart);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">דשבורד</h1>
        <p className="text-muted-foreground">סקירת המערכת</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">חיילים פעילים</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSoldiers}</div>
            <p className="text-xs text-muted-foreground">
              מתוך {soldiersCount} סך הכול
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הגישו השבוע</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissionsThisWeek}</div>
            <p className="text-xs text-muted-foreground">מתוך {activeSoldiers} חיילים</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">שבצ&quot;קים</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.length}</div>
            <p className="text-xs text-muted-foreground">
              {schedules.filter((s) => s.status === "PUBLISHED").length} פורסמו
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href={`/admin/schedule/${thisWeekParam}`}>
            <Button>שבצ&quot;ק השבוע הזה</Button>
          </Link>
          <Link href="/admin/soldiers">
            <Button variant="outline">ניהול חיילים</Button>
          </Link>
          <Link href="/admin/constraints">
            <Button variant="outline">ניהול אילוצים</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>שבצ&quot;קים אחרונים</CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-muted-foreground">אין שבצ&quot;קים עדיין</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => {
                const param = formatWeekStartParam(s.weekStartDate);
                return (
                  <Link
                    key={s.id}
                    href={`/admin/schedule/${param}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-medium">
                        שבוע מתאריך {format(s.weekStartDate, "dd/MM/yyyy")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.status === "PUBLISHED" ? "פורסם" : "טיוטה"}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      פתח
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
