import { db } from "@/lib/db";

export async function folderHasAutoShare(
  folderId: string | null,
  ownerUserId: string
): Promise<boolean> {
  if (!folderId) return false;

  let currentId: string | null = folderId;

  while (currentId) {
    const folder: { autoShare: boolean; parentId: string | null; userId: string } | null =
      await db.folder.findUnique({
        where: { id: currentId },
        select: { autoShare: true, parentId: true, userId: true },
      });

    if (!folder || folder.userId !== ownerUserId) return false;
    if (folder.autoShare) return true;
    currentId = folder.parentId;
  }

  return false;
}
