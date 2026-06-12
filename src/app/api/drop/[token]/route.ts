import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeExpiresAt } from "@/lib/file-lifetime";
import { folderHasAutoShare } from "@/lib/folders";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateShareToken } from "@/lib/share";
import { getMaxUploadBytes, saveFile } from "@/lib/storage";
import { assertStorageAvailable } from "@/lib/storage-usage";
import { validateUpload } from "@/lib/upload-security";
import { generateImageThumbnail } from "@/lib/thumbnails-image";

type RouteContext = { params: Promise<{ token: string }> };

const DROP_RATE_LIMIT = 10;
const DROP_RATE_WINDOW_MS = 60_000;
const MAX_FILES_PER_DROP_ZONE = 500;

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  const folder = await db.folder.findFirst({
    where: { dropToken: token, isDropZone: true },
    select: { id: true, name: true },
  });

  if (!folder) {
    return NextResponse.json({ error: "Drop zone not found" }, { status: 404 });
  }

  return NextResponse.json({ name: folder.name });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const ip = getClientIp(request);

  if (!checkRateLimit(`drop:${ip}:${token}`, DROP_RATE_LIMIT, DROP_RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const folder = await db.folder.findFirst({
    where: { dropToken: token, isDropZone: true },
  });

  if (!folder) {
    return NextResponse.json({ error: "Drop zone not found" }, { status: 404 });
  }

  try {
    const dropCount = await db.file.count({
      where: { folderId: folder.id, deletedAt: null },
    });
    if (dropCount >= MAX_FILES_PER_DROP_ZONE) {
      return NextResponse.json({ error: "Drop zone is full" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > getMaxUploadBytes()) {
      return NextResponse.json({ error: "File exceeds maximum upload size" }, { status: 413 });
    }

    const quota = await assertStorageAvailable(folder.userId, file.size);
    if (!quota.ok) {
      return NextResponse.json({ error: "Drop zone storage is full" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validateUpload(file.name, buffer);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 415 });
    }

    const { mimeType } = validation;
    const shouldAutoShare = await folderHasAutoShare(folder.id, folder.userId);

    const record = await db.file.create({
      data: {
        name: file.name,
        originalName: file.name,
        mimeType,
        size: file.size,
        userId: folder.userId,
        folderId: folder.id,
        expiresAt: computeExpiresAt(),
        ...(shouldAutoShare
          ? { isPublic: true, shareToken: generateShareToken() }
          : {}),
      },
    });

    const savedName = await saveFile(folder.userId, record.id, file.name, buffer);

    if (savedName !== record.name) {
      await db.file.update({ where: { id: record.id }, data: { name: savedName } });
    }

    if (mimeType.startsWith("image/")) {
      void generateImageThumbnail(folder.userId, record.id, savedName);
    }

    return NextResponse.json(
      { id: record.id, originalName: record.originalName },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
