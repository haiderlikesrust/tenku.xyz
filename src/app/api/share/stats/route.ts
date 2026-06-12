import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { getShareViewCount } from "@/lib/share-analytics";

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");
  const folderId = searchParams.get("folderId");

  if (!fileId && !folderId) {
    return NextResponse.json({ error: "fileId or folderId required" }, { status: 400 });
  }

  if (fileId) {
    const file = await db.file.findFirst({
      where: { id: fileId, userId: user!.id },
    });
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (folderId) {
    const folder = await db.folder.findFirst({
      where: { id: folderId, userId: user!.id },
    });
    if (!folder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const count = await getShareViewCount({
    fileId: fileId ?? undefined,
    folderId: folderId ?? undefined,
  });

  return NextResponse.json({ views: count });
}
