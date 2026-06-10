import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next ?? "/admin";
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">כניסת מנהל</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          הזן סיסמת ניהול כדי להמשיך
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
