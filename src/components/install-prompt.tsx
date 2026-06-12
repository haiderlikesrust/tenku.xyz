"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "tenku-install-dismissed";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) return;

    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");

    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Install on your home screen</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {platform === "ios" && (
              <>
                Tap <strong>Share</strong> in Safari, then{" "}
                <strong>Add to Home Screen</strong> for quick access.
              </>
            )}
            {platform === "android" && (
              <>
                Tap the menu (⋮) in Chrome, then{" "}
                <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </>
            )}
            {platform === "other" && (
              <>
                Add this site to your home screen for one-tap access from any device.
              </>
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={dismiss}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
