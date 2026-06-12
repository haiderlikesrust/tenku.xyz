import { db } from "@/lib/db";
import { isFileExpired } from "@/lib/file-lifetime";
import { deleteFileFromDisk } from "@/lib/storage";

type FileRecord = NonNullable<Awaited<ReturnType<typeof db.file.findUnique>>>;

async function removeExpiredFile(file: FileRecord) {
  try {
    await deleteFileFromDisk(file.userId, file.id);
  } catch {
    // File may already be missing on disk.
  }
  await db.file.delete({ where: { id: file.id } });
}

async function isInPublicSharedFolder(file: FileRecord): Promise<boolean> {
  if (!file.folderId) return false;

  let folderId: string | null = file.folderId;
  while (folderId) {
    const folder: {
      isPublic: boolean;
      parentId: string | null;
      shareToken: string | null;
    } | null = await db.folder.findUnique({
      where: { id: folderId },
      select: { isPublic: true, parentId: true, shareToken: true },
    });
    if (!folder) return false;
    if (folder.isPublic && folder.shareToken) return true;
    folderId = folder.parentId;
  }
  return false;
}

export async function canAccessFile(
  fileId: string,
  userId?: string
): Promise<{ file: FileRecord | null; allowed: boolean }> {
  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file) {
    return { file: null, allowed: false };
  }

  if (file.deletedAt || isFileExpired(file.expiresAt)) {
    if (isFileExpired(file.expiresAt)) {
      await removeExpiredFile(file);
    }
    return { file: null, allowed: false };
  }

  if (userId && file.userId === userId) {
    return { file, allowed: true };
  }

  if (file.isPublic || (await isInPublicSharedFolder(file))) {
    return { file, allowed: true };
  }

  return { file, allowed: false };
}
