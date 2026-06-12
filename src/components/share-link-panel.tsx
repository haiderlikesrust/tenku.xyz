"use client";

import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  buildShareUrl,
  buildWhatsAppUrl,
  canNativeShare,
  copyShareLink,
  nativeShare,
} from "@/lib/share-actions";
import { toast } from "sonner";

type ShareLinkPanelProps = {
  shareToken: string;
  title?: string;
  showQr?: boolean;
  compact?: boolean;
  urlBuilder?: (token: string) => string;
  label?: string;
};

export function ShareLinkPanel({
  shareToken,
  title = "Shared file",
  showQr = true,
  compact = false,
  urlBuilder = buildShareUrl,
  label = "Copy link",
}: ShareLinkPanelProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = urlBuilder(shareToken);

  async function handleCopy() {
    const ok = await copyShareLink(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy link");
    }
  }

  async function handleNativeShare() {
    const ok = await nativeShare({
      title,
      url: shareUrl,
      text: "Check out this shared file",
    });
    if (!ok) {
      toast.error("Sharing is not available on this device");
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {showQr && (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4 dark:bg-background">
          <QRCodeSVG value={shareUrl} size={compact ? 160 : 200} level="M" />
          <p className="text-center text-xs text-muted-foreground">
            Scan with a phone camera to open
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          className="min-h-11 flex-1 text-base"
          onClick={handleCopy}
        >
          {copied ? <Check className="mr-2 size-5" /> : <Copy className="mr-2 size-5" />}
          {label}
        </Button>

        {canNativeShare() && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 flex-1 text-base"
            onClick={handleNativeShare}
          >
            <Share2 className="mr-2 size-5" />
            Share…
          </Button>
        )}

        <a
          href={buildWhatsAppUrl(shareUrl, `${title}: ${shareUrl}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "outline",
            className:
              "min-h-11 flex-1 border-green-600/30 text-base text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30",
          })}
        >
          <MessageCircle className="mr-2 size-5" />
          WhatsApp
        </a>
      </div>

      <p className="break-all rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        {shareUrl}
      </p>
    </div>
  );
}
