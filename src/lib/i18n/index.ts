import { en, type MessageKey } from "./messages/en";
import { es } from "./messages/es";

export type Locale = "en" | "es";

const messages: Record<Locale, Record<MessageKey, string>> = { en, es };

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "es";
}
