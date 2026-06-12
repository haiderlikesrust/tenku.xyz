"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/types/storage";

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/heic":
      return ".heic";
    case "image/heif":
      return ".heif";
    case "video/mp4":
      return ".mp4";
    case "video/quicktime":
      return ".mov";
    default:
      return "";
  }
}

function normalizeFileName(file: File, index: number): string {
  const trimmed = file.name?.trim();
  if (trimmed && trimmed !== "." && trimmed !== "..") return trimmed;

  const ext = extensionForMime(file.type) || ".jpg";
  return `photo-${Date.now()}-${index}${ext}`;
}

/** iOS Safari invalidates File refs when the input is cleared mid-upload. */
async function stabilizeFiles(files: File[]): Promise<File[]> {
  const stabilized: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength === 0) continue;

      const name = normalizeFileName(file, i);
      const type = file.type || "image/jpeg";
      stabilized.push(new File([buffer], name, { type, lastModified: file.lastModified }));
    } catch {
      // Skip unreadable entries from the picker.
    }
  }

  return stabilized;
}

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
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
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

      const picked = Array.from(files);
      if (picked.length === 0) return;

      uploadingRef.current = true;
      setUploading(true);

      const initialEntries: UploadEntry[] = picked.map((file, i) => ({
        id: `${Date.now()}-${i}`,
        name: normalizeFileName(file, i),
        status: "pending" as const,
      }));
      setEntries(initialEntries);

      const fileList = await stabilizeFiles(picked);
      if (fileList.length === 0) {
        setEntries((prev) =>
          prev.map((e) => ({
            ...e,
            status: "error",
            error: "Could not read selected files",
          }))
        );
        uploadingRef.current = false;
        setUploading(false);
        setTimeout(() => setEntries([]), 3000);
        return;
      }

      if (fileList.length !== picked.length) {
        setEntries(
          fileList.map((file, i) => ({
            id: `${Date.now()}-stable-${i}`,
            name: file.name,
            status: "pending" as const,
          }))
        );
      }

      const uploaded: FileItem[] = [];

      try {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const entryId =
            initialEntries[i]?.id ?? `${Date.now()}-stable-${i}`;

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
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        setTimeout(() => setEntries([]), 2000);
      }
    },
    [disabled, folderId, onUploaded]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const selected = input.files ? Array.from(input.files) : [];
      if (selected.length === 0) return;
      void uploadFiles(selected);
    },
    [uploadFiles]
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
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept="image/*,video/*,.heic,.heif,.mov"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={handleInputChange}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute inset-0 cursor-pointer",
            (disabled || uploading) && "pointer-events-none"
          )}
          aria-hidden="true"
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
