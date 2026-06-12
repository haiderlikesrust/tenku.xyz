"use client";

import { useState } from "react";
import { Inbox, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type CreateFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  onCreated: () => void;
  defaultSchool?: boolean;
  defaultDropZone?: boolean;
};

export function CreateFolderDialog({
  open,
  onOpenChange,
  parentId,
  onCreated,
  defaultSchool = false,
  defaultDropZone = false,
}: CreateFolderDialogProps) {
  const [name, setName] = useState(defaultSchool ? "Shared files" : "");
  const [schoolFolder, setSchoolFolder] = useState(defaultSchool);
  const [dropZone, setDropZone] = useState(defaultDropZone);
  const [loading, setLoading] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(defaultSchool ? "Shared files" : "");
      setSchoolFolder(defaultSchool);
      setDropZone(defaultDropZone);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          parentId,
          autoShare: schoolFolder,
          isDropZone: dropZone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create folder");
      }

      toast.success(
        schoolFolder
          ? `Auto-share folder "${name.trim()}" created`
          : `Folder "${name.trim()}" created`
      );
      setName("");
      setSchoolFolder(false);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            {schoolFolder && (
              <DialogDescription>
                Auto-share folders create a public link for every upload automatically.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My folder"
                className="mt-2"
                autoFocus
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="checkbox"
                checked={schoolFolder}
                onChange={(e) => setSchoolFolder(e.target.checked)}
                className="mt-1 size-4 accent-primary"
              />
              <div>
                <span className="flex items-center gap-1.5 font-medium">
                  <Share2 className="size-4" />
                  Auto-share folder
                </span>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Automatically share uploads via a public link
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="checkbox"
                checked={dropZone}
                onChange={(e) => setDropZone(e.target.checked)}
                className="mt-1 size-4 accent-primary"
              />
              <div>
                <span className="flex items-center gap-1.5 font-medium">
                  <Inbox className="size-4" />
                  Drop zone folder
                </span>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Public link for others to upload files without an account
                </p>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
