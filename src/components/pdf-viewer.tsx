"use client";

import { Printer, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { printFileUrl } from "@/lib/print";

type PdfViewerProps = {
  url: string;
  showPrint?: boolean;
};

export function PdfViewer({ url, showPrint = true }: PdfViewerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b px-3 py-2 sm:px-4">
        {showPrint && (
          <Button
            variant="default"
            className="min-h-9 gap-1.5 px-3"
            onClick={() => printFileUrl(url)}
          >
            <Printer className="size-4" />
            Print
          </Button>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", className: "min-h-9 gap-1.5 px-3" })}
        >
          <ExternalLink className="size-4" />
          Open
        </a>
      </div>
      <div className="relative min-h-[60vh] flex-1 bg-muted/30">
        <iframe
          src={url}
          title="PDF preview"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
