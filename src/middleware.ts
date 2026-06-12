import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPublicOrigin } from "@/lib/public-url";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = getPublicOrigin(request);

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", origin);
    const callback = new URL(pathname + request.nextUrl.search, origin).toString();
    loginUrl.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin")) {
    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Do NOT include /api/auth/* — session endpoint must return JSON, not a login redirect
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
