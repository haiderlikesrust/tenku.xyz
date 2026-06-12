import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { activeFileWhere, trashedFileWhere } from "@/lib/file-filters";
import { purgeExpiredFiles } from "@/lib/file-lifetime";

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  await purgeExpiredFiles(user!.id);

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const q = searchParams.get("q")?.trim();
  const now = new Date();

  if (q) {
    const files = await db.file.findMany({
      where: {
        ...activeFileWhere(user!.id, now),
        originalName: { contains: q },
      },
      orderBy: { originalName: "asc" },
      take: 100,
    });
    return NextResponse.json({ files });
  }

  if (view === "recent") {
    const files = await db.file.findMany({
      where: activeFileWhere(user!.id, now),
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ files });
  }

  if (view === "starred") {
    const files = await db.file.findMany({
      where: { ...activeFileWhere(user!.id, now), starred: true },
      orderBy: { originalName: "asc" },
    });
    return NextResponse.json({ files });
  }

  if (view === "trash") {
    const files = await db.file.findMany({
      where: trashedFileWhere(user!.id),
      orderBy: { deletedAt: "desc" },
    });
    return NextResponse.json({ files });
  }

  return NextResponse.json({ error: "Invalid query" }, { status: 400 });
}
