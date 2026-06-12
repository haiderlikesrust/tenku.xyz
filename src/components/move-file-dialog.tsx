"use client";

import { useEffect, useState } from "react";
import { Folder } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { toast } from "sonner";
import type { FileItem } from "@/types/storage";

type FolderOption = { id: string; name: string; parentId: string | null };

type MoveFileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  onMoved: () => void;
};

function buildPath(folders: FolderOption[], folderId: string | null): string {
  if (!folderId) return "";
  const map = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  let current = folderId;
  while (current) {
    const f = map.get(current);
    if (!f) break;
    parts.unshift(f.name);
    current = f.parentId ?? "";
  }
  return parts.join(" / ");
}

export function MoveFileDialog({
  open,
  onOpenChange,
  file,
  onMoved,
}: MoveFileDialogProps) {
  const { t } = useLocale();
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/folders/all")
      .then((r) => r.json())
      .then((data) => setFolders(data.folders ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  async function moveTo(folderId: string | null) {
    if (!file) return;
    setMoving(true);
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) throw new Error("Move failed");
      toast.success(`Moved "${file.originalName}"`);
      onOpenChange(false);
      onMoved();
    } catch {
      toast.error("Failed to move file");
    } finally {
      setMoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("moveTo")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                disabled={moving || file?.folderId === null}
                onClick={() => moveTo(null)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                <Folder className="size-4 text-amber-500" />
                {t("root")} ({t("myFiles")})
              </button>
            </li>
            {folders.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  disabled={moving || file?.folderId === folder.id}
                  onClick={() => moveTo(folder.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  <Folder className="size-4 shrink-0 text-amber-500" />
                  <span className="truncate">{buildPath(folders, folder.id)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
