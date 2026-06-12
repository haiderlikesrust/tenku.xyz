import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessFile } from "@/lib/file-access";
import { readFileStream } from "@/lib/storage";
import { SAFE_INLINE_MIMES } from "@/lib/upload-security";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "true";

  const { file, allowed } = await canAccessFile(id, session?.user?.id);

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stream = readFileStream(file.userId, file.id, file.name);
    const webStream = Readable.toWeb(stream) as ReadableStream;
    const forceDownload = download || !SAFE_INLINE_MIMES.has(file.mimeType);
    const disposition = forceDownload ? "attachment" : "inline";
    const encodedName = encodeURIComponent(file.originalName);

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `${disposition}; filename="${file.originalName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(file.size),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
