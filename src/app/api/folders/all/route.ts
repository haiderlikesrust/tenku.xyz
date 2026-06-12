import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const [owned, memberships] = await Promise.all([
    db.folder.findMany({
      where: { userId: user!.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true },
    }),
    db.folderMember.findMany({
      where: { userId: user!.id },
      include: {
        folder: {
          select: { id: true, name: true, parentId: true, userId: true },
        },
      },
    }),
  ]);

  const sharedTrees: { id: string; name: string; parentId: string | null }[] = [];

  for (const membership of memberships) {
    const ownerId = membership.folder.userId;
    const subtree = await db.folder.findMany({
      where: { userId: ownerId },
      select: { id: true, name: true, parentId: true },
    });

    const accessible = new Set<string>();
    const childrenByParent = new Map<string | null, string[]>();
    for (const folder of subtree) {
      const key = folder.parentId;
      const list = childrenByParent.get(key) ?? [];
      list.push(folder.id);
      childrenByParent.set(key, list);
    }

    const queue = [membership.folderId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (accessible.has(id)) continue;
      accessible.add(id);
      const children = childrenByParent.get(id) ?? [];
      queue.push(...children);
    }

    for (const folder of subtree) {
      if (accessible.has(folder.id)) {
        sharedTrees.push(folder);
      }
    }
  }

  const byId = new Map<string, { id: string; name: string; parentId: string | null }>();
  for (const folder of [...owned, ...sharedTrees]) {
    byId.set(folder.id, folder);
  }

  return NextResponse.json({ folders: Array.from(byId.values()) });
}
