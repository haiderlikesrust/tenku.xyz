"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { isLocale, translate, type Locale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/messages/en";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const fromSession = session?.user?.locale;
    if (fromSession && isLocale(fromSession)) {
      setLocaleState(fromSession);
      return;
    }
    const stored = localStorage.getItem("tenku-locale");
    if (stored && isLocale(stored)) {
      setLocaleState(stored);
    }
  }, [session?.user?.locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      setLocaleState(next);
      localStorage.setItem("tenku-locale", next);
      if (session?.user) {
        await fetch("/api/user/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });
        await update({ locale: next });
      }
    },
    [session?.user, update]
  );

  const t = useCallback((key: MessageKey) => translate(locale, key), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
