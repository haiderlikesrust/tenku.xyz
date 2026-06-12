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
