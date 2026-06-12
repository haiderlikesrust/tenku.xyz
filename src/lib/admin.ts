import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export function isAdminEmail(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  return !!adminEmail && email.toLowerCase() === adminEmail;
}

export async function requireAdmin() {
  const { user, error } = await requireAuth();
  if (error) return { error, user: null };

  const dbUser = await db.user.findUnique({ where: { id: user!.id } });
  if (!dbUser || dbUser.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  return { error: null, user: dbUser };
}
