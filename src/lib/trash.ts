import { db } from "@/lib/db";
import { canEditFile } from "@/lib/folder-access";
import { deleteFileFromDisk } from "@/lib/storage";

const TRASH_RETENTION_DAYS = 7;

export function getTrashRetentionMs(): number {
  return TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

export async function softDeleteFile(fileId: string, userId: string): Promise<boolean> {
  const file = await db.file.findFirst({
    where: { id: fileId, deletedAt: null },
  });
  if (!file || !(await canEditFile(fileId, userId))) return false;

  await db.file.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });
  return true;
}

export async function restoreFile(fileId: string, userId: string): Promise<boolean> {
  const file = await db.file.findFirst({
    where: { id: fileId, userId, deletedAt: { not: null } },
  });
  if (!file) return false;

  await db.file.update({
    where: { id: fileId },
    data: { deletedAt: null },
  });
  return true;
}

export async function purgeTrashedFiles(userId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - getTrashRetentionMs());

  const trashed = await db.file.findMany({
    where: {
      deletedAt: { not: null, lte: cutoff },
      ...(userId ? { userId } : {}),
    },
  });

  for (const file of trashed) {
    try {
      await deleteFileFromDisk(file.userId, file.id);
    } catch {
      // File may already be missing on disk.
    }
    await db.file.delete({ where: { id: file.id } });
  }

  return trashed.length;
}
