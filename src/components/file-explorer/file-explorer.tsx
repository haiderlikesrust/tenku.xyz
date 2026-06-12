"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Folder,
  FileIcon,
  MoreVertical,
  Share2,
  Trash2,
  Pencil,
  Eye,
  Download,
  ChevronRight,
  LogOut,
  FolderPlus,
  Share,
  CheckSquare,
  X,
  Star,
  Search,
  Inbox,
  FolderInput,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadZone } from "@/components/upload-zone";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import { ShareSettingsDialog } from "@/components/share-settings-dialog";
import { InstallPrompt } from "@/components/install-prompt";
import { RenameDialog } from "@/components/rename-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FilePreviewModal } from "@/components/file-preview-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { StorageBar } from "@/components/storage-bar";
import { FileThumbnail } from "@/components/file-thumbnail";
import { MoveFileDialog } from "@/components/move-file-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { formatExpiry, formatFileSize } from "@/lib/format";
import { buildShareUrl, copyShareLink } from "@/lib/share-actions";
import { toast } from "sonner";
import type { FileItem, FolderItem } from "@/types/storage";

type ViewMode = "browse" | "recent" | "starred" | "trash" | "search";

type Breadcrumb = { id: string | null; name: string };

type ItemTarget =
  | { type: "file"; item: FileItem }
  | { type: "folder"; item: FolderItem };

type ShareTarget = ItemTarget;

export function FileExplorer() {
  const { data: session } = useSession();
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, name: "My Files" },
  ]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createSchoolFolder, setCreateSchoolFolder] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<ItemTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemTarget | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [moveFile, setMoveFile] = useState<FileItem | null>(null);
  const [createDropZone, setCreateDropZone] = useState(false);

  const fetchContents = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 300 * attempt));
          }

          if (viewMode === "browse") {
            const params = currentFolderId ? `?parentId=${currentFolderId}` : "";
            const res = await fetch(`/api/folders${params}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to load (${res.status})`);
            const data = await res.json();
            setFolders(data.folders);
            setFiles(data.files);
            setCurrentFolder(data.currentFolder ?? null);
          } else {
            setFolders([]);
            setCurrentFolder(null);
            let url = "/api/files";
            if (viewMode === "search" && searchQuery.trim()) {
              url += `?q=${encodeURIComponent(searchQuery.trim())}`;
            } else if (viewMode !== "search") {
              url += `?view=${viewMode}`;
            }
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to load (${res.status})`);
            const data = await res.json();
            setFiles(data.files ?? []);
          }

          if (!silent) setLoading(false);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Failed to load");
        }
      }

      if (!silent) toast.error("Failed to load files");
      if (!silent) setLoading(false);
      throw lastError;
    },
    [currentFolderId, viewMode, searchQuery]
  );

  const handleUploaded = useCallback(
    async (newFiles: FileItem[]) => {
      const relevant = newFiles.filter((f) => f.folderId === currentFolderId);
      if (relevant.length > 0) {
        setFiles((prev) => {
          const existing = new Set(prev.map((f) => f.id));
          const merged = [...prev];
          for (const file of relevant) {
            if (!existing.has(file.id)) {
              merged.push(file);
            }
          }
          return merged.sort((a, b) => a.originalName.localeCompare(b.originalName));
        });

        const shareable = relevant.filter((f) => f.isPublic && f.shareToken);
        const inAutoShare =
          currentFolder?.autoShare ||
          folders.some((f) => f.autoShare);

        if (shareable.length > 0 && inAutoShare) {
          const url = buildShareUrl(shareable[0].shareToken!);
          const copied = await copyShareLink(url);
          if (copied) {
            toast.success(t("copyLink"));
          }
        } else {
          toast.success(
            relevant.length === 1
              ? `"${relevant[0].originalName}" uploaded`
              : `${relevant.length} files uploaded`
          );
        }
      }

      try {
        await fetchContents({ silent: true });
      } catch {
        // Optimistic update already applied.
      }
    },
    [currentFolderId, currentFolder?.autoShare, folders, fetchContents, t]
  );

  async function toggleStar(file: FileItem) {
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !file.starred }),
    });
    if (!res.ok) {
      toast.error("Failed to update star");
      return;
    }
    await fetchContents({ silent: true });
  }

  async function handleBulkRestore() {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;
    setBulkWorking(true);
    try {
      const res = await fetch("/api/files/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: ids, action: "restore" }),
      });
      if (!res.ok) throw new Error("Restore failed");
      toast.success(`Restored ${ids.length} file${ids.length === 1 ? "" : "s"}`);
      clearSelection();
      await fetchContents({ silent: true });
    } catch {
      toast.error("Restore failed");
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkPermanentDelete() {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;
    setBulkWorking(true);
    try {
      const res = await fetch("/api/files/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: ids, action: "delete_permanent" }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Permanently deleted ${ids.length} file${ids.length === 1 ? "" : "s"}`);
      clearSelection();
      await fetchContents({ silent: true });
    } catch {
      toast.error("Delete failed");
    } finally {
      setBulkWorking(false);
    }
  }

  useEffect(() => {
    // Legitimate data fetch on mount / folder change; the loading flag it sets is
    // intended to drive the UI, not a cascading-render bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContents();
  }, [fetchContents]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedFileIds(new Set());
  }, [currentFolderId]);

  function clearSelection() {
    setSelectedFileIds(new Set());
    setSelectionMode(false);
  }

  function toggleFileSelection(fileId: string) {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  function toggleSelectAllFiles() {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map((f) => f.id)));
    }
  }

  async function handleBulkDownload() {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;

    setBulkWorking(true);
    try {
      const res = await fetch("/api/files/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: ids, action: "download" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Download failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tenku-files-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        ids.length === 1 ? "Downloaded 1 file" : `Downloaded ${ids.length} files as ZIP`
      );
      clearSelection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;

    setBulkWorking(true);
    try {
      const res = await fetch("/api/files/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: ids, action: "delete" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }

      toast.success(ids.length === 1 ? "Deleted 1 file" : `Deleted ${ids.length} files`);
      clearSelection();
      await fetchContents({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBulkWorking(false);
      setBulkDeleteOpen(false);
    }
  }

  function navigateToFolder(folder: FolderItem) {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function navigateToBreadcrumb(index: number) {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  }

  async function handleRename(name: string) {
    if (!renameTarget) return;
    const { type, item } = renameTarget;

    const endpoint =
      type === "folder" ? `/api/folders/${item.id}` : `/api/files/${item.id}`;
    const body =
      type === "folder" ? { name } : { originalName: name };

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      toast.error(`Failed to rename ${type}`);
      return;
    }
    toast.success(`Renamed to "${name}"`);
    fetchContents();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;
    const name = type === "folder" ? item.name : item.originalName;

    const endpoint =
      type === "folder" ? `/api/folders/${item.id}` : `/api/files/${item.id}`;

    const res = await fetch(endpoint, { method: "DELETE" });
    if (!res.ok) {
      toast.error(`Failed to delete ${type}`);
      return;
    }
    toast.success(`"${name}" deleted`);
    fetchContents();
  }

  const hasFolders = viewMode === "browse" && folders.length > 0;
  const hasFiles = files.length > 0;
  const isEmpty = !loading && !hasFolders && !hasFiles;
  const isTrashView = viewMode === "trash";
  const showBrowseChrome = viewMode === "browse";

  function FolderCard({ folder }: { folder: FolderItem }) {
    return (
      <div className="group relative rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40">
        <button
          type="button"
          className="flex w-full items-start gap-3 text-left"
          onClick={() => navigateToFolder(folder)}
        >
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
              folder.autoShare ? "bg-primary/10" : "bg-amber-500/10"
            }`}
          >
            <Folder
              className={`size-5 ${folder.autoShare ? "text-primary" : "text-amber-500"}`}
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate font-medium leading-tight">{folder.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {folder.autoShare
                ? "Auto-share"
                : folder.isDropZone
                  ? "Drop zone"
                  : "Folder"}
            </p>
          </div>
        </button>
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setRenameTarget({ type: "folder", item: folder })}
              >
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShareTarget({ type: "folder", item: folder })}
              >
                <Share2 className="mr-2 size-4" />
                Share settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget({ type: "folder", item: folder })}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  function FileRow({ file }: { file: FileItem }) {
    const isSelected = selectedFileIds.has(file.id);

    return (
      <div
        className={`flex min-h-[3.25rem] items-center gap-2 border-b px-3 py-2.5 last:border-b-0 sm:gap-3 sm:px-4 ${
          isSelected ? "bg-primary/5" : "hover:bg-muted/40"
        }`}
      >
        {selectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleFileSelection(file.id)}
            className="size-4 shrink-0 accent-primary"
            aria-label={`Select ${file.originalName}`}
          />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() =>
            selectionMode ? toggleFileSelection(file.id) : setPreviewFile(file)
          }
        >
          <FileThumbnail file={file} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium sm:text-base">{file.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)} · {formatExpiry(file.expiresAt)}
            </p>
          </div>
        </button>
        {!selectionMode && !isTrashView && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => toggleStar(file)}
            aria-label={file.starred ? t("unstar") : t("star")}
          >
            <Star
              className={`size-4 ${file.starred ? "fill-amber-400 text-amber-400" : ""}`}
            />
          </Button>
        )}
        {!selectionMode && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isTrashView ? (
              <>
                <DropdownMenuItem
                  onClick={async () => {
                    await fetch(`/api/files/${file.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ restore: true }),
                    });
                    toast.success(t("restore"));
                    fetchContents();
                  }}
                >
                  {t("restore")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => {
                    await fetch(`/api/files/${file.id}?permanent=true`, { method: "DELETE" });
                    toast.success(t("deleteForever"));
                    fetchContents();
                  }}
                >
                  {t("deleteForever")}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                  <Eye className="mr-2 size-4" />
                  {t("preview")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = `/api/files/${file.id}/content?download=true`;
                  }}
                >
                  <Download className="mr-2 size-4" />
                  {t("download")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMoveFile(file)}>
                  <FolderInput className="mr-2 size-4" />
                  {t("moveTo")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRenameTarget({ type: "file", item: file })}>
                  <Pencil className="mr-2 size-4" />
                  {t("rename")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareTarget({ type: "file", item: file })}>
                  <Share2 className="mr-2 size-4" />
                  {t("shareSettings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteTarget({ type: "file", item: file })}
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    );
  }

  const selectedCount = selectedFileIds.size;
  const allFilesSelected = hasFiles && selectedFileIds.size === files.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{t("appName")}</h1>
            <div className="mt-0.5 hidden sm:block">
              <StorageBar />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {session?.user?.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium hover:bg-muted"
              >
                <Shield className="size-4" />
                {t("admin")}
              </Link>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => signOut({ callbackUrl: "/" })}
              aria-label={t("signOut")}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <InstallPrompt />

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {(
            [
              { mode: "browse" as const, label: t("myFiles") },
              { mode: "recent" as const, label: t("recent") },
              { mode: "starred" as const, label: t("starred") },
              { mode: "trash" as const, label: t("trash") },
            ] as const
          ).map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setViewMode(mode);
                setSearchQuery("");
              }}
              className={cn(
                "hover:text-foreground",
                viewMode === mode
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setViewMode("search");
            }}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"
          />
        </div>

        {isTrashView && (
          <p className="mb-4 text-sm text-muted-foreground">{t("trashHint")}</p>
        )}

        {showBrowseChrome && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <div key={crumb.id ?? "root"} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <button
                    type="button"
                    onClick={() => navigateToBreadcrumb(i)}
                    className="truncate hover:underline"
                  >
                    {i === 0 ? t("myFiles") : crumb.name}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {currentFolder && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() =>
                    setShareTarget({ type: "folder", item: currentFolder })
                  }
                >
                  <Share2 className="size-3.5" />
                  <span className="ml-1.5 hidden sm:inline">{t("shareSettings")}</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <FolderPlus className="size-3.5" />
                      <span className="hidden sm:inline">{t("newFolder")}</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setCreateSchoolFolder(false);
                      setCreateDropZone(false);
                      setCreateFolderOpen(true);
                    }}
                  >
                    <Folder className="mr-2 size-4" />
                    {t("newFolder")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCreateSchoolFolder(true);
                      setCreateDropZone(false);
                      setCreateFolderOpen(true);
                    }}
                  >
                    <Share className="mr-2 size-4" />
                    {t("autoShareFolder")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCreateSchoolFolder(false);
                      setCreateDropZone(true);
                      setCreateFolderOpen(true);
                    }}
                  >
                    <Inbox className="mr-2 size-4" />
                    {t("dropZoneFolder")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {hasFiles && (
                <Button
                  variant={selectionMode ? "default" : "ghost"}
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (selectionMode) clearSelection();
                    else setSelectionMode(true);
                  }}
                >
                  <CheckSquare className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {showBrowseChrome && (
        <div className="mb-6">
          <UploadZone folderId={currentFolderId} onUploaded={handleUploaded} />
        </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <Folder className="mx-auto mb-3 size-12 text-muted-foreground/50" />
            <p className="font-medium">
              {viewMode === "search" ? t("noResults") : t("emptyFolder")}
            </p>
            {showBrowseChrome && (
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyFolderHint")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {hasFolders && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Folder className="size-4" />
                  Folders
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {folders.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {folders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} />
                  ))}
                </div>
              </section>
            )}

            {hasFiles && (
              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileIcon className="size-4" />
                    Files
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {files.length}
                    </span>
                  </h2>
                  {selectionMode && (
                    <button
                      type="button"
                      onClick={toggleSelectAllFiles}
                      className="text-sm text-primary hover:underline"
                    >
                      {allFilesSelected ? "Deselect all" : "Select all"}
                    </button>
                  )}
                </div>
                <div className="overflow-hidden rounded-lg border bg-card">
                  {files.map((file) => (
                    <FileRow key={file.id} file={file} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {selectionMode && selectedCount > 0 && <div className="h-20" />}
      </main>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={(open) => {
          setCreateFolderOpen(open);
          if (!open) {
            setCreateSchoolFolder(false);
            setCreateDropZone(false);
          }
        }}
        parentId={currentFolderId}
        onCreated={fetchContents}
        defaultSchool={createSchoolFolder}
        defaultDropZone={createDropZone}
      />

      <MoveFileDialog
        open={!!moveFile}
        onOpenChange={(open) => !open && setMoveFile(null)}
        file={moveFile}
        onMoved={() => fetchContents()}
      />

      {shareTarget && (
        <ShareSettingsDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          resourceType={shareTarget.type}
          resourceId={shareTarget.item.id}
          resourceName={
            shareTarget.type === "file"
              ? shareTarget.item.originalName
              : shareTarget.item.name
          }
          isPublic={shareTarget.item.isPublic}
          autoShare={
            shareTarget.type === "folder" ? shareTarget.item.autoShare : undefined
          }
          isDropZone={
            shareTarget.type === "folder" ? shareTarget.item.isDropZone : undefined
          }
          dropToken={
            shareTarget.type === "folder" ? shareTarget.item.dropToken : undefined
          }
          shareToken={shareTarget.item.shareToken}
          onUpdated={() => {
            fetchContents();
            setShareTarget(null);
          }}
        />
      )}

      <RenameDialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title={renameTarget?.type === "folder" ? "Rename folder" : "Rename file"}
        label={renameTarget?.type === "folder" ? "Folder name" : "File name"}
        currentName={
          renameTarget
            ? renameTarget.type === "folder"
              ? renameTarget.item.name
              : renameTarget.item.originalName
            : ""
        }
        onRename={handleRename}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === "folder" ? "Delete folder" : "Delete file"}
        description={
          deleteTarget?.type === "folder"
            ? `"${deleteTarget.item.name}" and all of its contents will be permanently deleted.`
            : deleteTarget
              ? `"${deleteTarget.item.originalName}" will be moved to trash.`
              : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />

      {selectionMode && selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 sm:gap-3">
            <span className="flex-1 text-sm font-medium">
              {selectedCount} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-9"
              disabled={bulkWorking}
              onClick={clearSelection}
            >
              <X className="mr-1.5 size-4" />
              Clear
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="min-h-9"
              disabled={bulkWorking}
              onClick={handleBulkDownload}
            >
              <Download className="mr-1.5 size-4" />
              Download
            </Button>
            {isTrashView ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-9"
                  disabled={bulkWorking}
                  onClick={handleBulkRestore}
                >
                  {t("restore")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="min-h-9"
                  disabled={bulkWorking}
                  onClick={handleBulkPermanentDelete}
                >
                  {t("deleteForever")}
                </Button>
              </>
            ) : (
            <Button
              variant="destructive"
              size="sm"
              className="min-h-9"
              disabled={bulkWorking}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 size-4" />
              {t("delete")}
            </Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete selected files"
        description={`${selectedCount} file${selectedCount === 1 ? "" : "s"} will be moved to trash.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
