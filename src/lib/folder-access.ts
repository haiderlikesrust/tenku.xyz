import { db } from "@/lib/db";

export type FolderAccessRole = "owner" | "editor";

export type FolderRecord = {
  id: string;
  name: string;
  userId: string;
  parentId: string | null;
  isPublic: boolean;
  autoShare: boolean;
  isDropZone: boolean;
  shareToken: string | null;
  dropToken: string | null;
  createdAt: Date;
};

export type FolderAccess = {
  folder: FolderRecord;
  role: FolderAccessRole;
  ownerId: string;
};

const folderSelect = {
  id: true,
  name: true,
  userId: true,
  parentId: true,
  isPublic: true,
  autoShare: true,
  isDropZone: true,
  shareToken: true,
  dropToken: true,
  createdAt: true,
} as const;

async function hasMembershipOnFolder(
  folderId: string,
  userId: string
): Promise<boolean> {
  const member = await db.folderMember.findUnique({
    where: { folderId_userId: { folderId, userId } },
  });
  return !!member;
}

export async function getFolderAccess(
  folderId: string,
  userId: string
): Promise<FolderAccess | null> {
  const folder = await db.folder.findUnique({
    where: { id: folderId },
    select: folderSelect,
  });
  if (!folder) return null;

  if (folder.userId === userId) {
    return { folder, role: "owner", ownerId: folder.userId };
  }

  let currentId: string | null = folderId;
  while (currentId) {
    if (await hasMembershipOnFolder(currentId, userId)) {
      return { folder, role: "editor", ownerId: folder.userId };
    }

    const parent: { parentId: string | null } | null = await db.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = parent?.parentId ?? null;
  }

  return null;
}

export async function canReadFolder(
  folderId: string,
  userId: string
): Promise<boolean> {
  const access = await getFolderAccess(folderId, userId);
  return access !== null;
}

export async function canEditFolderContents(
  folderId: string,
  userId: string
): Promise<boolean> {
  const access = await getFolderAccess(folderId, userId);
  return access?.role === "owner" || access?.role === "editor";
}

export async function isFolderOwner(
  folderId: string,
  userId: string
): Promise<boolean> {
  const folder = await db.folder.findUnique({
    where: { id: folderId },
    select: { userId: true },
  });
  return folder?.userId === userId;
}

export async function canManageFolderMembers(
  folderId: string,
  userId: string
): Promise<boolean> {
  return isFolderOwner(folderId, userId);
}

export async function canEditFile(
  fileId: string,
  userId: string
): Promise<boolean> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { userId: true, folderId: true },
  });
  if (!file) return false;
  if (file.userId === userId) return true;
  if (!file.folderId) return false;
  return canEditFolderContents(file.folderId, userId);
}

export async function canReadFile(
  fileId: string,
  userId: string
): Promise<boolean> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { userId: true, folderId: true },
  });
  if (!file) return false;
  if (file.userId === userId) return true;
  if (!file.folderId) return false;
  return canReadFolder(file.folderId, userId);
}

export function serializeFolder(
  folder: FolderRecord,
  options?: {
    accessRole?: FolderAccessRole | null;
    sharedWithMe?: boolean;
    ownerEmail?: string | null;
    memberCount?: number;
  }
) {
  return {
    ...folder,
    accessRole: options?.accessRole ?? null,
    sharedWithMe: options?.sharedWithMe ?? false,
    ownerEmail: options?.ownerEmail ?? null,
    memberCount: options?.memberCount ?? 0,
  };
}
