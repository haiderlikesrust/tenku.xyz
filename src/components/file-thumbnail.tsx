"use client";

import { useState } from "react";
import { FileIcon } from "lucide-react";
import { isThumbnailSupported } from "@/lib/thumbnail-utils";
import type { FileItem } from "@/types/storage";

type FileThumbnailProps = {
  file: FileItem;
  className?: string;
};

export function FileThumbnail({ file, className = "size-9" }: FileThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const supported = isThumbnailSupported(file.mimeType);

  if (!supported || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-md bg-blue-500/10 ${className}`}
      >
        <FileIcon className="size-4 text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md bg-muted ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/files/${file.id}/thumbnail`}
        alt=""
        className="size-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
