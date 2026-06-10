"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type LoginState = { error?: string } | null;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { error: "ADMIN_PASSWORD לא הוגדר בשרת" };
  }
  if (password !== expected) {
    return { error: "סיסמה שגויה" };
  }

  const hash = await sha256Hex(expected);
  cookies().set("admin_auth", hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  const target = next.startsWith("/admin") && next !== "/admin/login" ? next : "/admin";
  redirect(target);
}

export async function logoutAction() {
  cookies().delete("admin_auth");
  redirect("/admin/login");
}
