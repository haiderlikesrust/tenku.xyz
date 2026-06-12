import fs from "fs/promises";
import path from "path";
import { getFileStoragePath, STORAGE_PATH } from "@/lib/storage";

const THUMB_SIZE = 96;

function getThumbPath(userId: string, fileId: string): string {
  return path.join(STORAGE_PATH, userId, fileId, "_thumb.jpg");
}

export async function generatePdfThumbnail(
  userId: string,
  fileId: string,
  filename: string
): Promise<string | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("@napi-rs/canvas");

    const sourcePath = path.resolve(getFileStoragePath(userId, fileId, filename));
    const data = new Uint8Array(await fs.readFile(sourcePath));

    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = THUMB_SIZE / Math.max(viewport.width, viewport.height);
    const scaled = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(scaled.width), Math.ceil(scaled.height));
    const ctx = canvas.getContext("2d");

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport: scaled,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    const thumbPath = path.resolve(getThumbPath(userId, fileId));
    const buffer = canvas.toBuffer("image/jpeg");
    await fs.writeFile(thumbPath, buffer);
    return thumbPath;
  } catch {
    return null;
  }
}
