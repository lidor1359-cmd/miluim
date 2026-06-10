import { redirect } from "next/navigation";
import { getActiveConstraintWeek } from "@/actions/constraints";
import { formatWeekStartParam } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ConstraintsAdminIndexPage() {
  const weekStart = await getActiveConstraintWeek();
  redirect(`/admin/constraints/${formatWeekStartParam(weekStart)}`);
}
