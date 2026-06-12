import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { purgeExpiredFiles } from "@/lib/file-lifetime";
import { purgeTrashedFiles } from "@/lib/trash";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [expired, trashed] = await Promise.all([
    purgeExpiredFiles(),
    purgeTrashedFiles(),
  ]);

  return NextResponse.json({ expired, trashed });
}
