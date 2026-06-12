import { NextResponse } from "next/server";
import { purgeExpiredFiles } from "@/lib/file-lifetime";
import { purgeTrashedFiles } from "@/lib/trash";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expired, trashed] = await Promise.all([
    purgeExpiredFiles(),
    purgeTrashedFiles(),
  ]);

  return NextResponse.json({ expired, trashed });
}
