import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

const LOCALES = ["en", "es"] as const;

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const dbUser = await db.user.findUnique({
    where: { id: user!.id },
    select: { locale: true, notifyOnShareView: true, role: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(dbUser);
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { locale, notifyOnShareView } = body as {
      locale?: string;
      notifyOnShareView?: boolean;
    };

    const data: { locale?: string; notifyOnShareView?: boolean } = {};

    if (locale !== undefined) {
      if (!LOCALES.includes(locale as (typeof LOCALES)[number])) {
        return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
      }
      data.locale = locale;
    }

    if (notifyOnShareView !== undefined) {
      data.notifyOnShareView = notifyOnShareView;
    }

    const updated = await db.user.update({
      where: { id: user!.id },
      data,
      select: { locale: true, notifyOnShareView: true, role: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
