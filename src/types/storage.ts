export type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  isPublic: boolean;
  autoShare: boolean;
  isDropZone: boolean;
  shareToken: string | null;
  dropToken: string | null;
  createdAt: string;
  accessRole?: "owner" | "editor" | null;
  sharedWithMe?: boolean;
  ownerEmail?: string | null;
  memberCount?: number;
};

export type FolderMemberItem = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export type FileItem = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  isPublic: boolean;
  shareToken: string | null;
  starred: boolean;
  deletedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export type ShareTarget =
  | { type: "file"; item: FileItem }
  | { type: "folder"; item: FolderItem & { children: FolderItem[]; files: FileItem[] } };

export type StorageUsage = {
  usedBytes: number;
  quotaBytes: number;
};
