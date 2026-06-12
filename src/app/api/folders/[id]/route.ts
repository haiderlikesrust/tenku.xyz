import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { generateShareToken } from "@/lib/share";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;
  const folder = await db.folder.findFirst({
    where: { id, userId: user!.id },
    include: {
      children: { orderBy: { name: "asc" } },
      files: {
        where: { deletedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { originalName: "asc" },
      },
    },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  return NextResponse.json(folder);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  try {
    const folder = await db.folder.findFirst({
      where: { id, userId: user!.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, isPublic, autoShare, isDropZone } = body as {
      name?: string;
      isPublic?: boolean;
      autoShare?: boolean;
      isDropZone?: boolean;
    };

    const data: {
      name?: string;
      isPublic?: boolean;
      autoShare?: boolean;
      isDropZone?: boolean;
      shareToken?: string | null;
      dropToken?: string | null;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (isPublic !== undefined) {
      data.isPublic = isPublic;
      if (isPublic && !folder.shareToken) {
        data.shareToken = generateShareToken();
      }
      if (!isPublic) {
        data.shareToken = null;
      }
    }

    if (autoShare !== undefined) {
      data.autoShare = autoShare;
      if (autoShare) {
        data.isPublic = true;
        if (!folder.shareToken) {
          data.shareToken = generateShareToken();
        }
      }
    }

    if (isDropZone !== undefined) {
      data.isDropZone = isDropZone;
      if (isDropZone && !folder.dropToken) {
        data.dropToken = generateShareToken();
      }
      if (!isDropZone) {
        data.dropToken = null;
      }
    }

    const updated = await db.folder.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  const folder = await db.folder.findFirst({
    where: { id, userId: user!.id },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  await db.folder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
