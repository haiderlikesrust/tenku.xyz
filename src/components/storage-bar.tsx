"use client";

import { useEffect, useState } from "react";
import { formatFileSize } from "@/lib/format";
import type { StorageUsage } from "@/types/storage";

export function StorageBar() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    fetch("/api/user/storage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const pct = Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>
        {formatFileSize(usage.usedBytes)} / {formatFileSize(usage.quotaBytes)}
      </span>
    </div>
  );
}
