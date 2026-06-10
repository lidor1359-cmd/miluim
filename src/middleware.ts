import { NextRequest, NextResponse } from "next/server";

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) {
    // אם לא הוגדרה סיסמה (dev בלי env) - אל תחסום
    return NextResponse.next();
  }

  const expected = await sha256Hex(adminPass);
  const cookie = req.cookies.get("admin_auth")?.value;

  if (cookie !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
