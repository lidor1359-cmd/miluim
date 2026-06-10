import Link from "next/link";
import { Users, Calendar, AlertCircle, Home, Star } from "lucide-react";
import { LogoutButton } from "./logout-button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/admin" className="text-xl font-bold">
            שבצ&quot;ק מילואים
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100"
            >
              <Home className="h-4 w-4" />
              דשבורד
            </Link>
            <Link
              href="/admin/soldiers"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100"
            >
              <Users className="h-4 w-4" />
              חיילים
            </Link>
            <Link
              href="/admin/constraints"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100"
            >
              <AlertCircle className="h-4 w-4" />
              אילוצים
            </Link>
            <Link
              href="/admin/schedule"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100"
            >
              <Calendar className="h-4 w-4" />
              שבצ&quot;ק
            </Link>
            <Link
              href="/admin/shabbat"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100"
            >
              <Star className="h-4 w-4" />
              שבתות
            </Link>
            <div className="mx-2 h-6 w-px bg-slate-200" />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
