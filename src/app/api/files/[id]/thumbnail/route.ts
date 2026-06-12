import { createReadStream } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessFile } from "@/lib/file-access";
import { ensureThumbnail, isThumbnailSupported } from "@/lib/thumbnails";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  const { file, allowed } = await canAccessFile(id, session?.user?.id);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isThumbnailSupported(file.mimeType)) {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
  }

  const thumbPath = await ensureThumbnail(file.userId, file.id, file.name, file.mimeType);

  if (!thumbPath) {
    return NextResponse.json({ error: "Thumbnail unavailable" }, { status: 404 });
  }

  const stream = createReadStream(thumbPath);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
