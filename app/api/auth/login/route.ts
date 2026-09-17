import { NextResponse } from "next/server";
import { createOwnerSession, ownerCookie, requestOrigin, safeReturnPath, verifyOwnerAccessCode } from "../../../owner-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safeReturnPath(form.get("return_to")?.toString());
  const accessCode = form.get("access_code")?.toString() || "";
  const origin = requestOrigin(request);

  try {
    if (!verifyOwnerAccessCode(accessCode)) {
      return NextResponse.redirect(new URL(`/access?error=1&return_to=${encodeURIComponent(returnTo)}`, origin), 303);
    }
    const response = NextResponse.redirect(new URL(returnTo, origin), 303);
    const cookie = ownerCookie(origin);
    response.cookies.set(cookie.name, createOwnerSession(), cookie.options);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED") {
      return NextResponse.redirect(new URL(`/access?config=1&return_to=${encodeURIComponent(returnTo)}`, origin), 303);
    }
    throw error;
  }
}
