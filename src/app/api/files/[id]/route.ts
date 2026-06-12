import { NextResponse } from "next/server";

import { db } from "@/lib/db";

import { requireAuth } from "@/lib/auth-helpers";

import { generateShareToken } from "@/lib/share";

import { deleteFileFromDisk } from "@/lib/storage";

import { softDeleteFile, restoreFile } from "@/lib/trash";



type RouteContext = { params: Promise<{ id: string }> };



export async function GET(_request: Request, context: RouteContext) {

  const { user, error } = await requireAuth();

  if (error) return error;



  const { id } = await context.params;

  const file = await db.file.findFirst({

    where: { id, userId: user!.id, deletedAt: null },

  });



  if (!file) {

    return NextResponse.json({ error: "File not found" }, { status: 404 });

  }



  return NextResponse.json(file);

}



export async function PATCH(request: Request, context: RouteContext) {

  const { user, error } = await requireAuth();

  if (error) return error;



  const { id } = await context.params;



  try {

    const file = await db.file.findFirst({

      where: { id, userId: user!.id },

    });



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

      const ok = await restoreFile(id, user!.id);

      if (!ok) {

        return NextResponse.json({ error: "File not in trash" }, { status: 400 });

      }

      const restored = await db.file.findUnique({ where: { id } });

      return NextResponse.json(restored);

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

        const folder = await db.folder.findFirst({

          where: { id: folderId, userId: user!.id },

        });

        if (!folder) {

          return NextResponse.json({ error: "Folder not found" }, { status: 404 });

        }

      }

      data.folderId = folderId || null;

    }



    if (starred !== undefined) {

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



  const file = await db.file.findFirst({

    where: { id, userId: user!.id },

  });



  if (!file) {

    return NextResponse.json({ error: "File not found" }, { status: 404 });

  }



  if (permanent || file.deletedAt) {

    await deleteFileFromDisk(user!.id, file.id);

    await db.file.delete({ where: { id } });

    return NextResponse.json({ success: true, permanent: true });

  }



  const ok = await softDeleteFile(id, user!.id);

  if (!ok) {

    return NextResponse.json({ error: "File not found" }, { status: 404 });

  }



  return NextResponse.json({ success: true, trashed: true });

}


