import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12"
      dir="rtl"
    >
      <div className="container max-w-4xl px-3">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-5xl font-bold">שבצ&quot;ק מילואים</h1>
          <p className="text-lg text-muted-foreground">
            פלטפורמה לניהול שבצ&quot;ק שמירות, הגשת אילוצים ושיבוץ אוטומטי
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                <CardTitle>חייל</CardTitle>
              </div>
              <CardDescription>
                הגשת אילוצים וצפייה במשמרות השבוע שלך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/c">
                <Button className="w-full" size="lg">
                  כניסה לאזור החייל
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                כניסה בשם מלא בלבד
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-6 w-6 text-slate-700" />
                <CardTitle>מנהל</CardTitle>
              </div>
              <CardDescription>
                ניהול חיילים, בניית שבצ&quot;ק וצפייה באילוצים
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button className="w-full" size="lg" variant="outline">
                  כניסה לדשבורד
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                דורש סיסמת אדמין
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
