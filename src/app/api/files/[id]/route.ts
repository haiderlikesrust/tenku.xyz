import { NextResponse } from "next/server";

import { db } from "@/lib/db";

import { requireAuth } from "@/lib/auth-helpers";

import {
  canEditFile,
  canEditFolderContents,
  getFolderAccess,
} from "@/lib/folder-access";

import { generateShareToken } from "@/lib/share";

import { deleteFileFromDisk } from "@/lib/storage";

import { softDeleteFile, restoreFile } from "@/lib/trash";



type RouteContext = { params: Promise<{ id: string }> };



export async function GET(_request: Request, context: RouteContext) {

  const { user, error } = await requireAuth();

  if (error) return error;



  const { id } = await context.params;

  const file = await db.file.findFirst({

    where: { id, deletedAt: null },

  });



  if (!file || !(await canEditFile(id, user!.id))) {

    return NextResponse.json({ error: "File not found" }, { status: 404 });

  }



  return NextResponse.json(file);

}



export async function PATCH(request: Request, context: RouteContext) {

  const { user, error } = await requireAuth();

  if (error) return error;



  const { id } = await context.params;



  try {

    const file = await db.file.findUnique({ where: { id } });



    if (!file) {

      return NextResponse.json({ error: "File not found" }, { status: 404 });

    }



    const body = await request.json();

    const { originalName, isPublic, folderId, starred, restore } = body as {

      originalName?: string;

      isPublic?: boolean;

      folderId?: string | null;

      starred?: boolean;

      restore?: boolean;

    };



    if (restore === true) {

      if (file.userId !== user!.id) {

        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      }

      const ok = await restoreFile(id, user!.id);

      if (!ok) {

        return NextResponse.json({ error: "File not in trash" }, { status: 400 });

      }

      const restored = await db.file.findUnique({ where: { id } });

      return NextResponse.json(restored);

    }



    if (!(await canEditFile(id, user!.id))) {

      return NextResponse.json({ error: "File not found" }, { status: 404 });

    }



    const data: {

      originalName?: string;

      isPublic?: boolean;

      shareToken?: string | null;

      folderId?: string | null;

      starred?: boolean;

    } = {};



    if (originalName !== undefined) {

      if (!originalName.trim()) {

        return NextResponse.json({ error: "File name is required" }, { status: 400 });

      }

      data.originalName = originalName.trim();

    }



    if (isPublic !== undefined) {

      if (file.userId !== user!.id) {

        return NextResponse.json({ error: "Only the file owner can change sharing" }, { status: 403 });

      }

      data.isPublic = isPublic;

      if (isPublic && !file.shareToken) {

        data.shareToken = generateShareToken();

      }

      if (!isPublic) {

        data.shareToken = null;

      }

    }



    if (folderId !== undefined) {

      if (folderId) {

        const access = await getFolderAccess(folderId, user!.id);

        if (!access || !(await canEditFolderContents(folderId, user!.id))) {

          return NextResponse.json({ error: "Folder not found" }, { status: 404 });

        }

        if (access.ownerId !== file.userId) {

          return NextResponse.json({ error: "Cannot move file outside owner storage" }, { status: 400 });

        }

      } else if (file.userId !== user!.id) {

        return NextResponse.json({ error: "Cannot move shared files to root" }, { status: 400 });

      }

      data.folderId = folderId || null;

    }



    if (starred !== undefined) {

      if (file.userId !== user!.id) {

        return NextResponse.json({ error: "Only the file owner can star files" }, { status: 403 });

      }

      data.starred = starred;

    }



    const updated = await db.file.update({

      where: { id },

      data,

    });



    return NextResponse.json(updated);

  } catch {

    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });

  }

}



export async function DELETE(request: Request, context: RouteContext) {

  const { user, error } = await requireAuth();

  if (error) return error;



  const { id } = await context.params;

  const { searchParams } = new URL(request.url);

  const permanent = searchParams.get("permanent") === "true";



  const file = await db.file.findUnique({ where: { id } });



  if (!file || !(await canEditFile(id, user!.id))) {

    return NextResponse.json({ error: "File not found" }, { status: 404 });

  }



  if (permanent || file.deletedAt) {

    if (file.userId !== user!.id) {

      return NextResponse.json({ error: "Only the owner can permanently delete" }, { status: 403 });

    }

    await deleteFileFromDisk(file.userId, file.id);

    await db.file.delete({ where: { id } });

    return NextResponse.json({ success: true, permanent: true });

  }



  const ok = await softDeleteFile(id, user!.id);

  if (!ok) {

    return NextResponse.json({ error: "File not found" }, { status: 404 });

  }



  return NextResponse.json({ success: true, trashed: true });

}
