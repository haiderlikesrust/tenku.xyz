export function isThumbnailSupported(mimeType: string): boolean {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}
