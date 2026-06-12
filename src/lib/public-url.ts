import type { NextRequest } from "next/server";

/** Canonical public origin (e.g. https://tenku.xyz) — never 0.0.0.0 or localhost in production. */
export function getPublicOrigin(request?: NextRequest): string {
  const fromEnv = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (request) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host");

    if (host && !host.startsWith("0.0.0.0") && !host.startsWith("127.0.0.1")) {
      return `${proto ?? "https"}://${host}`;
    }
  }

  return "http://localhost:3000";
}

export function publicUrl(path: string, request?: NextRequest): string {
  const base = getPublicOrigin(request);
  return new URL(path, `${base}/`).toString();
}
