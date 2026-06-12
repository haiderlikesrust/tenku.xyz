import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { activeFileWhere } from "@/lib/file-filters";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { files: true, folders: true } },
    },
  });

  const storageByUser = await db.file.groupBy({
    by: ["userId"],
    where: { deletedAt: null, expiresAt: { gt: new Date() } },
    _sum: { size: true },
  });

  const storageMap = new Map(
    storageByUser.map((row) => [row.userId, row._sum.size ?? 0])
  );

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      storageBytes: storageMap.get(u.id) ?? 0,
    })),
  });
}
