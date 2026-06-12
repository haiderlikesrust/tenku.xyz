import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
  "application/json",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mov: "video/quicktime",
  txt: "text/plain",
  json: "application/json",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return EXT_TO_MIME[ext ?? ""] ?? "application/octet-stream";
}

export async function validateUpload(
  filename: string,
  buffer: Buffer
): Promise<{ ok: true; mimeType: string } | { ok: false; error: string }> {
  const detected = await fileTypeFromBuffer(buffer);
  const guessed = guessMimeType(filename);
  const mimeType = detected?.mime ?? guessed;

  if (!ALLOWED_MIMES.has(mimeType)) {
    return { ok: false, error: "File type not allowed" };
  }

  if (
    detected &&
    guessed !== "application/octet-stream" &&
    detected.mime !== guessed
  ) {
    const bothImages =
      detected.mime.startsWith("image/") && guessed.startsWith("image/");
    const bothVideos =
      detected.mime.startsWith("video/") && guessed.startsWith("video/");
    if (!bothImages && !bothVideos) {
      return { ok: false, error: "File type does not match extension" };
    }
  }

  return { ok: true, mimeType };
}

export const SAFE_INLINE_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
]);
