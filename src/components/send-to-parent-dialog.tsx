"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareLinkPanel } from "@/components/share-link-panel";
import type { FileItem } from "@/types/storage";

type SendToParentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileItem[];
};

export function SendToParentDialog({
  open,
  onOpenChange,
  files,
}: SendToParentDialogProps) {
  const shareable = files.filter((f) => f.isPublic && f.shareToken);

  if (shareable.length === 0) return null;

  const primary = shareable[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            {shareable.length === 1
              ? `"${primary.originalName}" is ready — copy the link or show the QR code.`
              : `${shareable.length} files are ready to share.`}
          </DialogDescription>
        </DialogHeader>

        {shareable.length === 1 ? (
          <ShareLinkPanel
            shareToken={primary.shareToken!}
            title={primary.originalName}
          />
        ) : (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto">
            {shareable.map((file) => (
              <div key={file.id} className="space-y-2 border-b pb-6 last:border-0">
                <p className="font-medium">{file.originalName}</p>
                <ShareLinkPanel
                  shareToken={file.shareToken!}
                  title={file.originalName}
                  showQr={false}
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
