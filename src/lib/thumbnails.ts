import {
  generateImageThumbnail,
  getImageThumbnailPath,
} from "@/lib/thumbnails-image";
import { isThumbnailSupported } from "@/lib/thumbnail-utils";

export { isThumbnailSupported };

export async function ensureThumbnail(
  userId: string,
  fileId: string,
  filename: string,
  mimeType: string
): Promise<string | null> {
  const existing = await getImageThumbnailPath(userId, fileId);
  if (existing) return existing;

  if (mimeType.startsWith("image/")) {
    return generateImageThumbnail(userId, fileId, filename);
  }

  if (mimeType === "application/pdf") {
    const { generatePdfThumbnail } = await import("@/lib/thumbnails-pdf");
    return generatePdfThumbnail(userId, fileId, filename);
  }

  return null;
}
