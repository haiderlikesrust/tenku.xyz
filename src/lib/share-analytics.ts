import { db } from "@/lib/db";
import { sendShareViewEmail } from "@/lib/notify";

export async function recordShareView(params: {
  fileId?: string;
  folderId?: string;
  ownerUserId: string;
}): Promise<number> {
  const { fileId, folderId, ownerUserId } = params;

  const priorCount = await db.shareView.count({
    where: fileId ? { fileId } : { folderId },
  });

  await db.shareView.create({
    data: {
      userId: ownerUserId,
      fileId: fileId ?? null,
      folderId: folderId ?? null,
    },
  });

  if (priorCount === 0) {
    const owner = await db.user.findUnique({ where: { id: ownerUserId } });
    if (owner?.notifyOnShareView) {
      let resourceName = "Shared item";
      let resourceType: "file" | "folder" = "file";

      if (fileId) {
        const file = await db.file.findUnique({ where: { id: fileId } });
        if (file) {
          resourceName = file.originalName;
          resourceType = "file";
        }
      } else if (folderId) {
        const folder = await db.folder.findUnique({ where: { id: folderId } });
        if (folder) {
          resourceName = folder.name;
          resourceType = "folder";
        }
      }

      await sendShareViewEmail({
        to: owner.email,
        resourceName,
        resourceType,
      });
    }
  }

  return priorCount + 1;
}

export async function getShareViewCount(params: {
  fileId?: string;
  folderId?: string;
}): Promise<number> {
  return db.shareView.count({
    where: params.fileId ? { fileId: params.fileId } : { folderId: params.folderId },
  });
}
