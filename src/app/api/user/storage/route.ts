import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getStorageQuotaBytes, getUserStorageBytes } from "@/lib/storage-usage";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const [usedBytes, quotaBytes] = await Promise.all([
    getUserStorageBytes(user!.id),
    Promise.resolve(getStorageQuotaBytes()),
  ]);

  return NextResponse.json({ usedBytes, quotaBytes });
}
