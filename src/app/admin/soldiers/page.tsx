import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SoldiersTable } from "./soldiers-table";
import { SOLDIER_COLORS } from "@/lib/colors";

export const dynamic = "force-dynamic";

export default async function SoldiersPage() {
  const soldiers = await prisma.soldier.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ניהול חיילים</h1>
        <p className="text-muted-foreground">
          הוספה ועריכה של חיילים, כולל מספרים אישיים להזדהות
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>רשימת חיילים ({soldiers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <SoldiersTable
            soldiers={soldiers.map((s) => ({
              id: s.id,
              name: s.name,
              personalId: s.personalId,
              color: s.color,
              phone: s.phone,
              active: s.active,
            }))}
            availableColors={[...SOLDIER_COLORS]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
