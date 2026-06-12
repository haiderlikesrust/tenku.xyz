import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { folderHasAutoShare } from "@/lib/folders";
import { computeExpiresAt } from "@/lib/file-lifetime";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateShareToken } from "@/lib/share";
import { getMaxUploadBytes, saveFile } from "@/lib/storage";
import { assertStorageAvailable } from "@/lib/storage-usage";
import { validateUpload } from "@/lib/upload-security";
import { generateImageThumbnail } from "@/lib/thumbnails-image";

const UPLOAD_RATE_LIMIT = 30;
const UPLOAD_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!checkRateLimit(`upload:${user!.id}`, UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > getMaxUploadBytes()) {
      return NextResponse.json({ error: "File exceeds maximum upload size" }, { status: 413 });
    }

    const quota = await assertStorageAvailable(user!.id, file.size);
    if (!quota.ok) {
      return NextResponse.json({ error: quota.message }, { status: 413 });
    }

    if (folderId) {
      const folder = await db.folder.findFirst({
        where: { id: folderId, userId: user!.id },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validateUpload(file.name, buffer);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 415 });
    }

    const { mimeType } = validation;
    const shouldAutoShare = await folderHasAutoShare(folderId, user!.id);

    const record = await db.file.create({
      data: {
        name: file.name,
        originalName: file.name,
        mimeType,
        size: file.size,
        userId: user!.id,
        folderId: folderId || null,
        expiresAt: computeExpiresAt(),
        ...(shouldAutoShare
          ? { isPublic: true, shareToken: generateShareToken() }
          : {}),
      },
    });

    const storedName = await saveFile(user!.id, record.id, file.name, buffer);

    const updated = await db.file.update({
      where: { id: record.id },
      data: { name: storedName },
    });

    if (mimeType.startsWith("image/")) {
      void generateImageThumbnail(user!.id, record.id, storedName);
    }

    return NextResponse.json(updated, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
