"use client";

import { logoutAction } from "@/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100"
        title="התנתק"
      >
        <LogOut className="h-4 w-4" />
        התנתק
      </button>
    </form>
  );
}
