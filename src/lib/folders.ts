import { db } from "@/lib/db";

export async function folderHasAutoShare(
  folderId: string | null,
  userId: string
): Promise<boolean> {
  if (!folderId) return false;

  let currentId: string | null = folderId;

  while (currentId) {
    const folder: { autoShare: boolean; parentId: string | null } | null =
      await db.folder.findFirst({
        where: { id: currentId, userId },
        select: { autoShare: true, parentId: true },
      });

    if (!folder) return false;
    if (folder.autoShare) return true;
    currentId = folder.parentId;
  }

  return false;
}
