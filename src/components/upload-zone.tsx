"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/types/storage";

type UploadStatus = "pending" | "uploading" | "done" | "error";

type UploadEntry = {
  id: string;
  name: string;
  status: UploadStatus;
  error?: string;
};

type UploadZoneProps = {
  folderId: string | null;
  onUploaded: (files: FileItem[]) => void | Promise<void>;
  disabled?: boolean;
};

export function UploadZone({ folderId, onUploaded, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const uploadingRef = useRef(false);

  const updateEntry = (id: string, patch: Partial<UploadEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled || uploadingRef.current) return;

      const fileList = Array.from(files);
      if (fileList.length === 0) return;

      uploadingRef.current = true;
      setUploading(true);

      const initialEntries: UploadEntry[] = fileList.map((file, i) => ({
        id: `${Date.now()}-${i}`,
        name: file.name,
        status: "pending",
      }));
      setEntries(initialEntries);

      const uploaded: FileItem[] = [];

      try {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const entryId = initialEntries[i].id;

          updateEntry(entryId, { status: "uploading" });

          const formData = new FormData();
          formData.append("file", file);
          if (folderId) {
            formData.append("folderId", folderId);
          }

          try {
            const res = await fetch("/api/files/upload", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Upload failed");
            }

            const created = (await res.json()) as FileItem;
            uploaded.push(created);
            updateEntry(entryId, { status: "done" });
          } catch (err) {
            updateEntry(entryId, {
              status: "error",
              error: err instanceof Error ? err.message : "Upload failed",
            });
          }
        }

        if (uploaded.length > 0) {
          await onUploaded(uploaded);
        }
      } finally {
        uploadingRef.current = false;
        setUploading(false);
        setTimeout(() => setEntries([]), 2000);
      }
    },
    [disabled, folderId, onUploaded]
  );

  const doneCount = entries.filter((e) => e.status === "done").length;
  const totalCount = entries.length;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-8",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploading && "border-primary/50 bg-primary/5",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length && !uploading) {
            uploadFiles(e.dataTransfer.files);
          }
        }}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={disabled || uploading}
          onChange={(e) => {
            if (e.target.files?.length) {
              uploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />

        {uploading ? (
          <>
            <Loader2 className="mx-auto mb-3 size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Uploading {doneCount} of {totalCount} file{totalCount !== 1 ? "s" : ""}…
            </p>
            <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%",
                }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload className="mx-auto mb-3 size-10 text-muted-foreground sm:size-8" />
            <p className="text-base font-medium sm:text-sm">
              Tap to upload files
            </p>
            <p className="mt-1 text-sm text-muted-foreground sm:text-xs">
              Or drag & drop · Files are removed after 7 days
            </p>
          </>
        )}
      </div>

      {entries.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 text-sm">
              {entry.status === "uploading" && (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              )}
              {entry.status === "done" && (
                <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              )}
              {entry.status === "error" && (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              )}
              {entry.status === "pending" && (
                <div className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
              )}
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              {entry.status === "uploading" && (
                <span className="text-xs text-muted-foreground">Uploading…</span>
              )}
              {entry.status === "done" && (
                <span className="text-xs text-green-600">Done</span>
              )}
              {entry.error && (
                <span className="text-xs text-destructive">{entry.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
