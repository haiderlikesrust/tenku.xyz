"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/locale-provider";
import { toast } from "sonner";
import type { FolderMemberItem } from "@/types/storage";

type FolderMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  onUpdated?: () => void;
};

export function FolderMembersDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  onUpdated,
}: FolderMembersDialogProps) {
  const { t } = useLocale();
  const [members, setMembers] = useState<FolderMemberItem[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/folders/${folderId}/members`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load members");
        const data = await res.json();
        setMembers(data.members ?? []);
      })
      .catch(() => toast.error("Failed to load members"))
      .finally(() => setLoading(false));
  }, [open, folderId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      setMembers((prev) => [...prev, data.member]);
      setEmail("");
      toast.success(t("memberInvited"));
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    try {
      const res = await fetch(
        `/api/folders/${folderId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Remove failed");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success(t("memberRemoved"));
      onUpdated?.();
    } catch {
      toast.error("Failed to remove member");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("folderMembers")}</DialogTitle>
          <DialogDescription>
            {folderName} — invite other Tenku users by email. They can upload, delete, and
            manage files in this folder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-2">
          <Label htmlFor="invite-email">{t("inviteByEmail")}</Label>
          <div className="flex gap-2">
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviting}
            />
            <Button type="submit" disabled={inviting || !email.trim()}>
              <UserPlus className="mr-1 size-4" />
              {t("invite")}
            </Button>
          </div>
        </form>

        <div className="max-h-48 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.email}</p>
                  {member.name && (
                    <p className="truncate text-xs text-muted-foreground">{member.name}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => removeMember(member.userId)}
                  aria-label="Remove member"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
