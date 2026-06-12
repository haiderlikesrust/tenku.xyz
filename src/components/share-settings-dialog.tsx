"use client";

import { useEffect, useState } from "react";
import { Inbox, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShareLinkPanel } from "@/components/share-link-panel";
import { useLocale } from "@/components/locale-provider";
import { buildDropUrl } from "@/lib/share-actions";
import { toast } from "sonner";

type ShareSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: "file" | "folder";
  resourceId: string;
  resourceName: string;
  isPublic: boolean;
  autoShare?: boolean;
  isDropZone?: boolean;
  shareToken: string | null;
  dropToken?: string | null;
  onUpdated: () => void;
};

export function ShareSettingsDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
  isPublic: initialPublic,
  autoShare: initialAutoShare = false,
  isDropZone: initialDropZone = false,
  shareToken: initialToken,
  dropToken: initialDropToken = null,
  onUpdated,
}: ShareSettingsDialogProps) {
  const { t } = useLocale();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [autoShare, setAutoShare] = useState(initialAutoShare);
  const [isDropZone, setIsDropZone] = useState(initialDropZone);
  const [shareToken, setShareToken] = useState(initialToken);
  const [dropToken, setDropToken] = useState(initialDropToken);
  const [views, setViews] = useState<number | null>(null);
  const [notifyOnShareView, setNotifyOnShareView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setIsPublic(initialPublic);
      setAutoShare(initialAutoShare);
      setIsDropZone(initialDropZone);
      setShareToken(initialToken);
      setDropToken(initialDropToken);
    }
  }

  useEffect(() => {
    if (!open) return;

    const statsParam =
      resourceType === "file"
        ? `fileId=${resourceId}`
        : `folderId=${resourceId}`;

    fetch(`/api/share/stats?${statsParam}`)
      .then((r) => r.json())
      .then((d) => setViews(d.views ?? 0))
      .catch(() => {});

    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((d) => setNotifyOnShareView(!!d.notifyOnShareView))
      .catch(() => {});
  }, [open, resourceId, resourceType]);

  async function patchFolder(body: Record<string, unknown>) {
    const res = await fetch(`/api/folders/${resourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to update");
    }
    return res.json();
  }

  async function patchFile(body: Record<string, unknown>) {
    const res = await fetch(`/api/files/${resourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to update");
    }
    return res.json();
  }

  async function togglePublic(value: boolean) {
    setLoading(true);
    try {
      const updated =
        resourceType === "file"
          ? await patchFile({ isPublic: value })
          : await patchFolder({ isPublic: value });

      setIsPublic(updated.isPublic);
      setShareToken(updated.shareToken);
      toast.success(value ? "Public link enabled" : "Public access revoked");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAutoShare(value: boolean) {
    setLoading(true);
    try {
      const updated = await patchFolder({ autoShare: value });
      setAutoShare(updated.autoShare);
      setIsPublic(updated.isPublic);
      setShareToken(updated.shareToken);
      toast.success(value ? "Auto-share enabled" : "Auto-share disabled");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDropZone(value: boolean) {
    setLoading(true);
    try {
      const updated = await patchFolder({ isDropZone: value });
      setIsDropZone(updated.isDropZone);
      setDropToken(updated.dropToken);
      toast.success(value ? "Drop zone enabled" : "Drop zone disabled");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function toggleNotify(value: boolean) {
    setLoading(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnShareView: value }),
      });
      setNotifyOnShareView(value);
    } catch {
      toast.error("Failed to update notification setting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shareSettings")}</DialogTitle>
          <DialogDescription>
            &ldquo;{resourceName}&rdquo;
            {views !== null && (
              <span className="mt-1 block text-xs">
                {views} {t("views")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={notifyOnShareView}
              onChange={(e) => toggleNotify(e.target.checked)}
              disabled={loading}
              className="mt-1 size-4 accent-primary"
            />
            <span className="text-sm">{t("notifyOnView")}</span>
          </label>

          {resourceType === "folder" && (
            <>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Share2 className="size-4" />
                      Auto-share folder
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Every upload gets a share link automatically
                    </p>
                  </div>
                  <Badge variant={autoShare ? "default" : "secondary"}>
                    {autoShare ? "On" : "Off"}
                  </Badge>
                </div>
                <Button
                  className="mt-3 w-full min-h-10"
                  variant={autoShare ? "outline" : "default"}
                  disabled={loading}
                  onClick={() => toggleAutoShare(!autoShare)}
                >
                  {autoShare ? "Disable auto-share" : "Enable auto-share"}
                </Button>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Inbox className="size-4" />
                      {t("dropZone")}
                    </Label>
                    <p className="text-sm text-muted-foreground">{t("dropZoneHint")}</p>
                  </div>
                  <Badge variant={isDropZone ? "default" : "secondary"}>
                    {isDropZone ? "On" : "Off"}
                  </Badge>
                </div>
                <Button
                  className="mt-3 w-full min-h-10"
                  variant={isDropZone ? "outline" : "default"}
                  disabled={loading}
                  onClick={() => toggleDropZone(!isDropZone)}
                >
                  {isDropZone ? "Disable drop zone" : "Enable drop zone"}
                </Button>
                {isDropZone && dropToken && (
                  <ShareLinkPanel
                    shareToken={dropToken}
                    title={resourceName}
                    urlBuilder={buildDropUrl}
                    label="Drop link"
                  />
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Public link</Label>
              <p className="text-sm text-muted-foreground">
                Anyone with the link can view this {resourceType}
              </p>
            </div>
            <Badge variant={isPublic ? "default" : "secondary"}>
              {isPublic ? "Public" : "Private"}
            </Badge>
          </div>

          {isPublic && shareToken && (
            <ShareLinkPanel shareToken={shareToken} title={resourceName} />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isPublic ? (
            <Button variant="destructive" disabled={loading} onClick={() => togglePublic(false)}>
              Revoke access
            </Button>
          ) : (
            <Button disabled={loading} onClick={() => togglePublic(true)}>
              Make public
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
