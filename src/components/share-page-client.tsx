"use client";

import { useEffect, useState } from "react";
import {
  Folder,
  FileIcon,
  Download,
  Eye,
  Globe,
  ChevronRight,
  Home,
  Printer,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePreviewModal } from "@/components/file-preview-modal";
import { ShareLinkPanel } from "@/components/share-link-panel";
import { formatDate, formatFileSize } from "@/lib/format";
import { printFileUrl } from "@/lib/print";
import type { FileItem, FolderItem, ShareTarget } from "@/types/storage";

type SharePageClientProps = {
  token: string;
};

export function SharePageClient({ token }: SharePageClientProps) {
  const [data, setData] = useState<ShareTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string | null; name: string }[]
  >([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Not found");
        }
        const result = (await res.json()) as ShareTarget;
        setData(result);
        if (result.type === "folder") {
          setBreadcrumbs([{ id: result.item.id, name: result.item.name }]);
          setCurrentFolderId(result.item.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <Globe className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Share link unavailable</h1>
        <p className="text-muted-foreground">{error ?? "This link may have expired."}</p>
        <LinkButton href="/">Go home</LinkButton>
      </div>
    );
  }

  if (data.type === "file") {
    const file = data.item;
    const contentUrl = `/api/files/${file.id}/content`;
    const isPdf = file.mimeType === "application/pdf";

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <Badge variant="secondary" className="mb-2">
              <Globe className="mr-1 size-3" />
              Shared file
            </Badge>
            <h1 className="text-lg font-semibold sm:text-xl">{file.originalName}</h1>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.size)} · {formatDate(file.createdAt)}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                className="min-h-11 flex-1"
                onClick={() => setPreviewFile(file)}
              >
                <Eye className="mr-2 size-4" />
                Open
              </Button>
              {isPdf && (
                <Button
                  variant="secondary"
                  className="min-h-11 flex-1"
                  onClick={() => printFileUrl(contentUrl)}
                >
                  <Printer className="mr-2 size-4" />
                  Print
                </Button>
              )}
              <a
                href={`${contentUrl}?download=true`}
                download
                className={buttonVariants({ variant: "outline", className: "min-h-11 flex-1" })}
              >
                <Download className="mr-2 size-4" />
                Download
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
          <ShareLinkPanel shareToken={token} title={file.originalName} />
        </main>
        <FilePreviewModal
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          publicMode
        />
      </div>
    );
  }

  const rootFolder = data.item;
  const activeFolderId = currentFolderId ?? rootFolder.id;
  const displayFolders = rootFolder.children.filter((c) => c.parentId === activeFolderId);
  const displayFiles = rootFolder.files.filter((f) => f.folderId === activeFolderId);

  function navigateToFolder(folder: FolderItem) {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function navigateToBreadcrumb(index: number) {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  }

  const isEmpty = displayFolders.length === 0 && displayFiles.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Badge variant="secondary" className="mb-2">
            <Globe className="mr-1 size-3" />
            Shared folder
          </Badge>
          <h1 className="text-lg font-semibold sm:text-xl">{rootFolder.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <ShareLinkPanel shareToken={token} title={rootFolder.name} />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.id ?? "root"} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="size-4 text-muted-foreground" />}
              <button
                type="button"
                onClick={() => navigateToBreadcrumb(i)}
                className="flex min-h-10 items-center gap-1 text-sm hover:underline"
              >
                {i === 0 && <Home className="size-4" />}
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {isEmpty ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <Folder className="mx-auto mb-3 size-12 text-muted-foreground/50" />
            <p className="font-medium">This folder is empty</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayFolders.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Folder className="size-4" />
                  Folders
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {displayFolders.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {displayFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted/40"
                      onClick={() => navigateToFolder(folder)}
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <Folder className="size-5 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">Folder</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {displayFiles.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileIcon className="size-4" />
                  Files
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {displayFiles.length}
                  </span>
                </h2>
                <div className="overflow-hidden rounded-lg border bg-card">
                  {displayFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex min-h-14 items-center gap-2 border-b px-3 py-3 last:border-b-0 hover:bg-muted/40 sm:gap-3 sm:px-4"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => setPreviewFile(file)}
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                          <FileIcon className="size-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </button>
                      {file.mimeType === "application/pdf" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 shrink-0"
                          onClick={() => printFileUrl(`/api/files/${file.id}/content`)}
                        >
                          <Printer className="size-4" />
                        </Button>
                      )}
                      <a
                        href={`/api/files/${file.id}/content?download=true`}
                        download
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon",
                          className: "size-9 shrink-0",
                        })}
                      >
                        <Download className="size-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        publicMode
      />
    </div>
  );
}
