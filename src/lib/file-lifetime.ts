import { db } from "@/lib/db";
import { deleteFileFromDisk } from "@/lib/storage";

const DEFAULT_LIFETIME_DAYS = 7;

export function getFileLifetimeDays(): number {
  const days = parseInt(process.env.FILE_LIFETIME_DAYS ?? String(DEFAULT_LIFETIME_DAYS), 10);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_LIFETIME_DAYS;
}

export function computeExpiresAt(from: Date = new Date()): Date {
  const days = getFileLifetimeDays();
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isFileExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

export async function purgeExpiredFiles(userId?: string): Promise<number> {
  const now = new Date();

  const expired = await db.file.findMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null,
      ...(userId ? { userId } : {}),
    },
  });

  for (const file of expired) {
    try {
      await deleteFileFromDisk(file.userId, file.id);
    } catch {
      // File may already be missing on disk.
    }
    await db.file.delete({ where: { id: file.id } });
  }

  return expired.length;
}
