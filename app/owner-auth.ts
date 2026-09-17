import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type OwnerUser = {
  displayName: string;
};

const COOKIE_NAME = "aipm_owner_session";
const SESSION_DAYS = 30;

function sessionSecret() {
  const value = process.env.AIPM_SESSION_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("AUTH_NOT_CONFIGURED");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createOwnerSession() {
  const payload = Buffer.from(JSON.stringify({
    sub: "primary-owner",
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function verifyOwnerSession(value: string | undefined) {
  if (!value) return false;
  const [payload, provided, extra] = value.split(".");
  if (!payload || !provided || extra || !safeEqual(provided, signature(payload))) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return decoded.sub === "primary-owner" && typeof decoded.exp === "number" && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

export async function getOwnerUser(): Promise<OwnerUser | null> {
  try {
    const store = await cookies();
    if (!verifyOwnerSession(store.get(COOKIE_NAME)?.value)) return null;
    return { displayName: process.env.AIPM_OWNER_NAME?.trim() || "陈俊呈" };
  } catch {
    return null;
  }
}

export async function requireOwnerUser(returnTo: string) {
  const user = await getOwnerUser();
  if (user) return user;
  redirect(ownerSignInPath(returnTo));
}

export function verifyOwnerAccessCode(value: string) {
  const expected = process.env.AIPM_ACCESS_CODE_HASH?.trim().toLowerCase();
  if (!expected || !/^[a-f0-9]{64}$/.test(expected)) throw new Error("AUTH_NOT_CONFIGURED");
  const actual = createHash("sha256").update(value.trim(), "utf8").digest("hex");
  return safeEqual(actual, expected);
}

export function ownerCookie(requestUrl?: string) {
  const protocol = requestUrl ? new URL(requestUrl).protocol : "https:";
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      // The private workspace also runs locally with `next start` (production
      // mode) over plain HTTP. A Secure cookie would be discarded there and
      // make a successful login look like an endless loading/redirect loop.
      secure: protocol === "https:",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    },
  };
}

export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || url.protocol.replace(":", "");
  return host ? `${protocol}://${host}` : url.origin;
}

export function ownerSignInPath(returnTo: string) {
  return `/access?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function ownerSignOutPath(returnTo = "/") {
  return `/api/auth/logout?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || url.pathname.startsWith("/api/auth") || url.pathname === "/access") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
