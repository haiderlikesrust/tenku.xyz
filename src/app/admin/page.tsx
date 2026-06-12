"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/format";
import { useLocale } from "@/components/locale-provider";
import { toast } from "sonner";

type Stats = {
  userCount: number;
  fileCount: number;
  folderCount: number;
  totalStorageBytes: number;
};

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  storageBytes: number;
  _count: { files: number; folders: number };
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ])
      .then(([statsData, usersData]) => {
        setStats(statsData);
        setUsers(usersData.users ?? []);
      })
      .finally(() => setLoading(false));
  }, [session, status, router]);

  async function handlePurge() {
    setPurging(true);
    try {
      const res = await fetch("/api/admin/purge", { method: "POST" });
      if (!res.ok) throw new Error("Purge failed");
      const data = await res.json();
      toast.success(
        `${t("purgeDone")}: ${data.expired} expired, ${data.trashed} trashed`
      );
    } catch {
      toast.error("Purge failed");
    } finally {
      setPurging(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Shield className="size-5" />
            <h1 className="text-lg font-semibold">{t("adminPanel")}</h1>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-7 items-center rounded-lg border px-2.5 text-sm font-medium hover:bg-muted"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("totalUsers")}</p>
              <p className="text-2xl font-semibold">{stats.userCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("totalFiles")}</p>
              <p className="text-2xl font-semibold">{stats.fileCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("totalStorage")}</p>
              <p className="text-2xl font-semibold">
                {formatFileSize(stats.totalStorageBytes)}
              </p>
            </div>
          </div>
        )}

        <Button onClick={handlePurge} disabled={purging}>
          <Trash2 className="mr-2 size-4" />
          {purging ? "Purging…" : t("purgeNow")}
        </Button>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-right font-medium">Files</th>
                <th className="px-4 py-2 text-right font-medium">Storage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.role}</td>
                  <td className="px-4 py-2 text-right">{user._count.files}</td>
                  <td className="px-4 py-2 text-right">
                    {formatFileSize(user.storageBytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
