import { Readable, PassThrough } from "stream";
import path from "path";
import type { Archiver } from "archiver";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { activeFileWhere } from "@/lib/file-filters";
import { deleteFileFromDisk, getFileStoragePath } from "@/lib/storage";
import { softDeleteFile, restoreFile } from "@/lib/trash";

function uniqueZipName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0;
  used.set(name, count + 1);
  if (count === 0) return name;
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  return `${base} (${count})${ext}`;
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { fileIds, action } = body as {
      fileIds?: string[];
      action?: "delete" | "download" | "restore" | "delete_permanent";
    };

    if (!fileIds?.length) {
      return NextResponse.json({ error: "No files selected" }, { status: 400 });
    }

    if (fileIds.length > 100) {
      return NextResponse.json({ error: "Maximum 100 files per request" }, { status: 400 });
    }

    if (action === "restore") {
      let restored = 0;
      for (const id of fileIds) {
        if (await restoreFile(id, user!.id)) restored++;
      }
      return NextResponse.json({ restored });
    }

    if (action === "delete_permanent") {
      const files = await db.file.findMany({
        where: { id: { in: fileIds }, userId: user!.id, deletedAt: { not: null } },
      });
      for (const file of files) {
        await deleteFileFromDisk(user!.id, file.id);
        await db.file.delete({ where: { id: file.id } });
      }
      return NextResponse.json({ deleted: files.length });
    }

    const files = await db.file.findMany({
      where: {
        id: { in: fileIds },
        ...activeFileWhere(user!.id),
      },
    });

    if (files.length === 0) {
      return NextResponse.json({ error: "No files found" }, { status: 404 });
    }

    if (action === "delete") {
      for (const file of files) {
        await softDeleteFile(file.id, user!.id);
      }
      return NextResponse.json({ deleted: files.length, trashed: true });
    }

    if (action === "download") {
      const archiverModule = await import("archiver");
      const createArchive = archiverModule as unknown as (
        format: string,
        options?: { zlib?: { level: number } }
      ) => Archiver;
      const archive = createArchive("zip", { zlib: { level: 5 } });
      const passThrough = new PassThrough();
      archive.pipe(passThrough);

      const usedNames = new Map<string, number>();

      for (const file of files) {
        const filePath = path.resolve(
          getFileStoragePath(user!.id, file.id, file.name)
        );
        archive.file(filePath, { name: uniqueZipName(file.originalName, usedNames) });
      }

      archive.finalize();

      archive.on("error", () => {
        passThrough.destroy();
      });

      const webStream = Readable.toWeb(passThrough) as ReadableStream;

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="tenku-files-${Date.now()}.zip"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Bulk operation failed" }, { status: 500 });
  }
}
