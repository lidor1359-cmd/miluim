import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "soldier_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 יום

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is not set. Generate one with: openssl rand -hex 32"
    );
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

/**
 * חתימת soldierId לערך cookie בפורמט `${soldierId}.${hmac}`
 */
export function signSoldierSession(soldierId: string): string {
  return `${soldierId}.${hmac(soldierId)}`;
}

/**
 * אימות ערך cookie — מחזיר soldierId אם החתימה תקינה, אחרת null
 */
export function verifySoldierSession(value: string | undefined): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0 || idx === value.length - 1) return null;
  const soldierId = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = hmac(soldierId);
  if (sig.length !== expected.length) return null;
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return soldierId;
}

/**
 * השמת cookie לאחר הזדהות מוצלחת
 */
export function setSoldierCookie(soldierId: string): void {
  cookies().set(COOKIE_NAME, signSoldierSession(soldierId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * מחיקת cookie
 */
export function clearSoldierCookie(): void {
  cookies().delete(COOKIE_NAME);
}

/**
 * קריאת ה-cookie מבקשה נוכחית והחזרת soldierId מאומת או null
 */
export function getCurrentSoldierId(): string | null {
  const value = cookies().get(COOKIE_NAME)?.value;
  return verifySoldierSession(value);
}
