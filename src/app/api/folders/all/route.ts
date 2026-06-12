import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const folders = await db.folder.findMany({
    where: { userId: user!.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });

  return NextResponse.json({ folders });
}
