import { nanoid } from "nanoid";

export function generateShareToken(): string {
  return nanoid(21);
}

export function getShareUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/share/${token}`;
}
