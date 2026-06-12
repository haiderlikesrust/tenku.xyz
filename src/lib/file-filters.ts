export function activeFileWhere(userId: string, now = new Date()) {
  return {
    userId,
    deletedAt: null,
    expiresAt: { gt: now },
  } as const;
}

export function trashedFileWhere(userId: string) {
  return {
    userId,
    deletedAt: { not: null },
  } as const;
}
