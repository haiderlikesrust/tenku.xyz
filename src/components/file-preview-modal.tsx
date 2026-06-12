"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Download, FileIcon, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { printFileUrl } from "@/lib/print";
import type { FileItem } from "@/types/storage";

const PdfViewer = dynamic(
  () => import("@/components/pdf-viewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading preview...</p>
      </div>
    ),
  }
);

type FilePreviewModalProps = {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicMode?: boolean;
};

function getContentUrl(fileId: string, download = false) {
  const params = download ? "?download=true" : "";
  return `/api/files/${fileId}/content${params}`;
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setError(true));
  }, [url]);

  if (error) return <p className="text-destructive">Failed to load text content</p>;
  if (text === null) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
      {text}
    </pre>
  );
}

export function FilePreviewModal({
  file,
  open,
  onOpenChange,
  publicMode = false,
}: FilePreviewModalProps) {
  if (!file) return null;

  const activeFile = file;
  const contentUrl = getContentUrl(activeFile.id);
  const mime = activeFile.mimeType;

  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  const canPrint = isPdf || isImage;

  function renderPreview() {
    if (mime === "application/pdf") {
      return (
        <div className="h-[70vh]">
          <PdfViewer url={contentUrl} />
        </div>
      );
    }

    if (mime.startsWith("image/")) {
      return (
        <div className="flex max-h-[70vh] items-center justify-center overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={contentUrl}
            alt={activeFile.originalName}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      );
    }

    if (mime.startsWith("text/") || mime === "application/json") {
      return <TextPreview url={contentUrl} />;
    }

    if (mime.startsWith("video/")) {
      return (
        <div className="flex items-center justify-center p-4">
          <video src={contentUrl} controls className="max-h-[70vh] max-w-full" />
        </div>
      );
    }

    if (mime.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center gap-4 p-8">
          <FileIcon className="size-16 text-muted-foreground" />
          <p className="font-medium">{activeFile.originalName}</p>
          <audio src={contentUrl} controls className="w-full max-w-md" />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <FileIcon className="size-16 text-muted-foreground" />
        <p className="font-medium">{activeFile.originalName}</p>
        <p className="text-sm text-muted-foreground">
          Preview not available for this file type
        </p>
        <a
          href={getContentUrl(activeFile.id, true)}
          download={activeFile.originalName}
          className={buttonVariants()}
        >
          <Download className="mr-2 size-4" />
          Download
        </a>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{activeFile.originalName}</DialogTitle>
        </DialogHeader>
        {renderPreview()}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          {canPrint && (
            <Button
              type="button"
              className="min-h-10 flex-1 sm:flex-none"
              onClick={() => printFileUrl(contentUrl)}
            >
              <Printer className="mr-2 size-4" />
              Print
            </Button>
          )}
          {!publicMode && (
            <a
              href={getContentUrl(activeFile.id, true)}
              download={activeFile.originalName}
              className={buttonVariants({
                variant: "outline",
                className: "min-h-10 flex-1 sm:flex-none",
              })}
            >
              <Download className="mr-2 size-4" />
              Download
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
