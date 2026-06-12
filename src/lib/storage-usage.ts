import { db } from "@/lib/db";
import { activeFileWhere } from "@/lib/file-filters";

const DEFAULT_QUOTA_GB = 5;

export function getStorageQuotaBytes(): number {
  const gb = parseInt(process.env.STORAGE_QUOTA_GB ?? String(DEFAULT_QUOTA_GB), 10);
  return (Number.isFinite(gb) && gb > 0 ? gb : DEFAULT_QUOTA_GB) * 1024 * 1024 * 1024;
}

export async function getUserStorageBytes(userId: string): Promise<number> {
  const result = await db.file.aggregate({
    where: activeFileWhere(userId),
    _sum: { size: true },
  });
  return result._sum.size ?? 0;
}

export async function assertStorageAvailable(
  userId: string,
  incomingBytes: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [usedBytes, quotaBytes] = await Promise.all([
    getUserStorageBytes(userId),
    Promise.resolve(getStorageQuotaBytes()),
  ]);

  if (usedBytes + incomingBytes > quotaBytes) {
    return { ok: false, message: "Storage quota exceeded" };
  }

  return { ok: true };
}
