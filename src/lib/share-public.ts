export const publicFileSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  size: true,
  folderId: true,
  isPublic: true,
  expiresAt: true,
  createdAt: true,
} as const;

export const publicFolderSelect = {
  id: true,
  name: true,
  parentId: true,
  isPublic: true,
  autoShare: true,
  createdAt: true,
} as const;
