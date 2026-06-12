import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";

export const STORAGE_PATH = process.env.STORAGE_PATH ?? "./storage";

function assertInsideStorageRoot(resolved: string): void {
  const storageRoot = path.resolve(STORAGE_PATH);
  const relative = path.relative(storageRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage path");
  }
}

export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^\w.\-() ]+/g, "_");
  return base || "file";
}

export function getFileStoragePath(
  userId: string,
  fileId: string,
  filename: string
): string {
  const safeName = sanitizeFilename(filename);
  return path.join(STORAGE_PATH, userId, fileId, safeName);
}

export async function ensureStorageDir(
  userId: string,
  fileId: string
): Promise<string> {
  const dir = path.join(STORAGE_PATH, userId, fileId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFile(
  userId: string,
  fileId: string,
  filename: string,
  data: Buffer
): Promise<string> {
  await ensureStorageDir(userId, fileId);
  const filePath = getFileStoragePath(userId, fileId, filename);
  const resolved = path.resolve(filePath);
  assertInsideStorageRoot(resolved);

  await fs.writeFile(resolved, data);
  return sanitizeFilename(filename);
}

export function readFileStream(
  userId: string,
  fileId: string,
  filename: string
): ReturnType<typeof createReadStream> {
  const filePath = getFileStoragePath(userId, fileId, filename);
  const resolved = path.resolve(filePath);
  assertInsideStorageRoot(resolved);

  return createReadStream(resolved);
}

export async function deleteFileFromDisk(
  userId: string,
  fileId: string
): Promise<void> {
  const dir = path.join(STORAGE_PATH, userId, fileId);
  const resolved = path.resolve(dir);
  assertInsideStorageRoot(resolved);

  await fs.rm(resolved, { recursive: true, force: true });
}

export function getMaxUploadBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "100", 10);
  return mb * 1024 * 1024;
}
