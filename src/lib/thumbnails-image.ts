import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getFileStoragePath, STORAGE_PATH } from "@/lib/storage";

const THUMB_SIZE = 96;

function getThumbPath(userId: string, fileId: string): string {
  return path.join(STORAGE_PATH, userId, fileId, "_thumb.jpg");
}

export async function generateImageThumbnail(
  userId: string,
  fileId: string,
  filename: string
): Promise<string | null> {
  const sourcePath = path.resolve(getFileStoragePath(userId, fileId, filename));
  const thumbPath = path.resolve(getThumbPath(userId, fileId));

  try {
    await sharp(sourcePath)
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
    return thumbPath;
  } catch {
    return null;
  }
}

export async function getImageThumbnailPath(
  userId: string,
  fileId: string
): Promise<string | null> {
  const thumbPath = path.resolve(getThumbPath(userId, fileId));
  try {
    await fs.access(thumbPath);
    return thumbPath;
  } catch {
    return null;
  }
}
