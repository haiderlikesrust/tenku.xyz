import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [userCount, fileCount, folderCount, storage] = await Promise.all([
    db.user.count(),
    db.file.count({ where: { deletedAt: null } }),
    db.folder.count(),
    db.file.aggregate({
      where: { deletedAt: null, expiresAt: { gt: new Date() } },
      _sum: { size: true },
    }),
  ]);

  return NextResponse.json({
    userCount,
    fileCount,
    folderCount,
    totalStorageBytes: storage._sum.size ?? 0,
  });
}
