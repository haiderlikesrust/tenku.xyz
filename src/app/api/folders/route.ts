import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { purgeExpiredFiles } from "@/lib/file-lifetime";
import { generateShareToken } from "@/lib/share";

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  await purgeExpiredFiles(user!.id);

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  const now = new Date();

  const [folders, files, currentFolder] = await Promise.all([
    db.folder.findMany({
      where: {
        userId: user!.id,
        parentId: parentId || null,
      },
      orderBy: { name: "asc" },
    }),
    db.file.findMany({
      where: {
        userId: user!.id,
        folderId: parentId || null,
        deletedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { originalName: "asc" },
    }),
    parentId
      ? db.folder.findFirst({
          where: { id: parentId, userId: user!.id },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ folders, files, currentFolder });
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, parentId, autoShare, isDropZone } = body as {
      name?: string;
      parentId?: string | null;
      autoShare?: boolean;
      isDropZone?: boolean;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    if (parentId) {
      const parent = await db.folder.findFirst({
        where: { id: parentId, userId: user!.id },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    const isSchoolFolder = autoShare === true;
    const isDrop = isDropZone === true;

    const folder = await db.folder.create({
      data: {
        name: name.trim(),
        userId: user!.id,
        parentId: parentId || null,
        autoShare: isSchoolFolder,
        isDropZone: isDrop,
        ...(isSchoolFolder
          ? { isPublic: true, shareToken: generateShareToken() }
          : {}),
        ...(isDrop ? { dropToken: generateShareToken() } : {}),
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
