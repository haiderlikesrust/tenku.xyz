export function buildDropUrl(dropToken: string): string {
  if (typeof window === "undefined") {
    return `/drop/${dropToken}`;
  }
  return `${window.location.origin}/drop/${dropToken}`;
}

export function buildShareUrl(shareToken: string): string {
  if (typeof window === "undefined") {
    return `/share/${shareToken}`;
  }
  return `${window.location.origin}/share/${shareToken}`;
}

export function buildWhatsAppUrl(shareUrl: string, message?: string): string {
  const text = message ?? `Shared file: ${shareUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyShareLink(shareUrl: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch {
    return false;
  }
}

export async function nativeShare(options: {
  title: string;
  url: string;
  text?: string;
}): Promise<boolean> {
  if (!navigator.share) return false;

  try {
    await navigator.share({
      title: options.title,
      url: options.url,
      text: options.text ?? "Check out this shared file",
    });
    return true;
  } catch {
    return false;
  }
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}
