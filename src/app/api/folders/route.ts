import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import {
  canEditFolderContents,
  getFolderAccess,
  serializeFolder,
} from "@/lib/folder-access";
import { purgeExpiredFiles } from "@/lib/file-lifetime";
import { generateShareToken } from "@/lib/share";

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  await purgeExpiredFiles(user!.id);

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  const now = new Date();

  if (parentId) {
    const access = await getFolderAccess(parentId, user!.id);
    if (!access) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const ownerId = access.ownerId;
    const [childFolders, files, memberCount] = await Promise.all([
      db.folder.findMany({
        where: { parentId, userId: ownerId },
        orderBy: { name: "asc" },
      }),
      db.file.findMany({
        where: {
          userId: ownerId,
          folderId: parentId,
          deletedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { originalName: "asc" },
      }),
      access.role === "owner"
        ? db.folderMember.count({ where: { folderId: parentId } })
        : Promise.resolve(0),
    ]);

    const owner =
      access.role === "editor"
        ? await db.user.findUnique({
            where: { id: ownerId },
            select: { email: true },
          })
        : null;

    return NextResponse.json({
      folders: childFolders.map((f) =>
        serializeFolder(f, {
          accessRole: access.role,
          sharedWithMe: access.role === "editor",
          ownerEmail: owner?.email ?? null,
        })
      ),
      files,
      currentFolder: serializeFolder(access.folder, {
        accessRole: access.role,
        sharedWithMe: access.role === "editor",
        ownerEmail: owner?.email ?? null,
        memberCount,
      }),
    });
  }

  const [ownedFolders, memberships] = await Promise.all([
    db.folder.findMany({
      where: { userId: user!.id, parentId: null },
      orderBy: { name: "asc" },
    }),
    db.folderMember.findMany({
      where: { userId: user!.id },
      include: {
        folder: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    }),
  ]);

  const memberCounts = await db.folderMember.groupBy({
    by: ["folderId"],
    where: { folderId: { in: ownedFolders.map((f) => f.id) } },
    _count: { _all: true },
  });
  const countByFolder = new Map(
    memberCounts.map((row) => [row.folderId, row._count._all])
  );

  const sharedFolders = memberships
    .filter((m) => m.folder.parentId === null)
    .map((m) =>
      serializeFolder(m.folder, {
        accessRole: "editor",
        sharedWithMe: true,
        ownerEmail: m.folder.user.email,
      })
    );

  const folders = [
    ...ownedFolders.map((f) =>
      serializeFolder(f, {
        accessRole: "owner",
        memberCount: countByFolder.get(f.id) ?? 0,
      })
    ),
    ...sharedFolders,
  ];

  const files = await db.file.findMany({
    where: {
      userId: user!.id,
      folderId: null,
      deletedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { originalName: "asc" },
  });

  return NextResponse.json({ folders, files, currentFolder: null });
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, parentId, autoShare, isDropZone } = body as {
      name?: string;
      parentId?: string | null;
      autoShare?: boolean;
      isDropZone?: boolean;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    let ownerId = user!.id;

    if (parentId) {
      const access = await getFolderAccess(parentId, user!.id);
      if (!access || !(await canEditFolderContents(parentId, user!.id))) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
      ownerId = access.ownerId;

      if (access.role === "editor" && (autoShare || isDropZone)) {
        return NextResponse.json(
          { error: "Only the folder owner can create special folders" },
          { status: 403 }
        );
      }
    }

    const isSchoolFolder = autoShare === true;
    const isDrop = isDropZone === true;

    const folder = await db.folder.create({
      data: {
        name: name.trim(),
        userId: ownerId,
        parentId: parentId || null,
        autoShare: isSchoolFolder,
        isDropZone: isDrop,
        ...(isSchoolFolder
          ? { isPublic: true, shareToken: generateShareToken() }
          : {}),
        ...(isDrop ? { dropToken: generateShareToken() } : {}),
      },
    });

    return NextResponse.json(
      serializeFolder(folder, {
        accessRole: ownerId === user!.id ? "owner" : "editor",
        sharedWithMe: ownerId !== user!.id,
      }),
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
