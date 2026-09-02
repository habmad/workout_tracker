import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  authEnv,
  mustEnforceAuth,
  verifySessionToken,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!mustEnforceAuth()) {
    return NextResponse.next();
  }

  const { secret, configured } = authEnv();

  if (!configured) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Auth is not configured (APP_PASSWORD / AUTH_SECRET)" },
        { status: 503 },
      );
    }
    return new NextResponse(
      "Auth is not configured. Set APP_PASSWORD and AUTH_SECRET on the server.",
      { status: 503 },
    );
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token, secret);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
