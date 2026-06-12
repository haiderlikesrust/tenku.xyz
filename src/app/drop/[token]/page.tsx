"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type DropPageProps = { params: Promise<{ token: string }> };

export default function DropPage({ params }: DropPageProps) {
  const { t } = useLocale();
  const [token, setToken] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/drop/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setFolderName(data.name);
      })
      .catch(() => setError("Drop zone not found"))
      .finally(() => setLoading(false));
  }, [token]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!token) return;
      setUploading(true);
      setDone(false);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/drop/${token}`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [token]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !folderName) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">
          {t("dropPageTitle")} {folderName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("dropPageHint")}</p>

        <div className="relative mt-6">
          <input
            type="file"
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          <div className="flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? "Uploading…" : t("tapUpload")}
          </div>
        </div>

        {done && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="size-4" />
            {t("uploadSuccess")}
          </p>
        )}
        {error && folderName && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
