import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isFileExpired } from "@/lib/file-lifetime";
import { recordShareView } from "@/lib/share-analytics";
import { publicFileSelect, publicFolderSelect } from "@/lib/share-public";

type RouteContext = { params: Promise<{ token: string }> };

async function collectDescendantFolderIds(
  rootId: string,
  ownerUserId: string
): Promise<string[]> {
  const ids: string[] = [rootId];
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await db.folder.findMany({
      where: { parentId: current, userId: ownerUserId },
      select: { id: true },
    });
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }

  return ids;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const now = new Date();

  const file = await db.file.findFirst({
    where: {
      shareToken: token,
      isPublic: true,
      deletedAt: null,
      expiresAt: { gt: now },
    },
    select: publicFileSelect,
  });

  if (file) {
    if (isFileExpired(file.expiresAt)) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
    }

    const owner = await db.file.findFirst({
      where: { shareToken: token },
      select: { userId: true, id: true },
    });
    if (owner) {
      await recordShareView({ fileId: owner.id, ownerUserId: owner.userId });
    }

    return NextResponse.json({ type: "file" as const, item: file });
  }

  const folder = await db.folder.findFirst({
    where: { shareToken: token, isPublic: true },
    select: { ...publicFolderSelect, userId: true },
  });

  if (!folder) {
    return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
  }

  await recordShareView({ folderId: folder.id, ownerUserId: folder.userId });

  const folderIds = await collectDescendantFolderIds(folder.id, folder.userId);

  const [children, files] = await Promise.all([
    db.folder.findMany({
      where: { id: { in: folderIds }, userId: folder.userId },
      select: publicFolderSelect,
      orderBy: { name: "asc" },
    }),
    db.file.findMany({
      where: {
        folderId: { in: folderIds },
        userId: folder.userId,
        deletedAt: null,
        expiresAt: { gt: now },
      },
      select: publicFileSelect,
      orderBy: { originalName: "asc" },
    }),
  ]);

  const { userId: _ownerId, ...publicFolder } = folder;

  return NextResponse.json({
    type: "folder" as const,
    item: {
      ...publicFolder,
      children,
      files,
    },
  });
}
