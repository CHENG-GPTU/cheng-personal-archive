import { NextResponse } from "next/server";
import { ownerCookie, requestOrigin, safeReturnPath } from "../../../owner-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to"));
  const origin = requestOrigin(request);
  const response = NextResponse.redirect(new URL(returnTo, origin), 303);
  const cookie = ownerCookie(origin);
  response.cookies.set(cookie.name, "", { ...cookie.options, maxAge: 0 });
  return response;
}
