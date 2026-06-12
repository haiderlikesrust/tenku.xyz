import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { canManageFolderMembers, getFolderAccess } from "@/lib/folder-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  if (!(await canManageFolderMembers(id, user!.id))) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const members = await db.folderMember.findMany({
    where: { folderId: id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  if (!(await canManageFolderMembers(id, user!.id))) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const invitee = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!invitee) {
      return NextResponse.json(
        { error: "No account found with that email. They need to register first." },
        { status: 404 }
      );
    }

    if (invitee.id === user!.id) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    const folder = await db.folder.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (folder?.userId === invitee.id) {
      return NextResponse.json({ error: "That user already owns this folder" }, { status: 400 });
    }

    const existing = await db.folderMember.findUnique({
      where: { folderId_userId: { folderId: id, userId: invitee.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "User already has access" }, { status: 409 });
    }

    const member = await db.folderMember.create({
      data: {
        folderId: id,
        userId: invitee.id,
        role: "editor",
        invitedBy: user!.id,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        member: {
          id: member.id,
          userId: member.user.id,
          email: member.user.email,
          name: member.user.name,
          role: member.role,
          createdAt: member.createdAt,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;
  const access = await getFolderAccess(id, user!.id);

  if (!access) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const memberUserId = searchParams.get("userId");

  if (!memberUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (access.role === "owner") {
    const member = await db.folderMember.findUnique({
      where: { folderId_userId: { folderId: id, userId: memberUserId } },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    await db.folderMember.delete({ where: { id: member.id } });
    return NextResponse.json({ success: true });
  }

  if (access.role === "editor" && memberUserId === user!.id) {
    await db.folderMember.deleteMany({
      where: { folderId: id, userId: user!.id },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
