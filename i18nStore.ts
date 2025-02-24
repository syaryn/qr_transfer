import { atom } from "npm:nanostores";
import en from "./locales/en.json" with { type: "json" };
import ja from "./locales/ja.json" with { type: "json" };

export const currentLang = atom(
  navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en",
);

export const translations = atom<Record<string, string>>(
  currentLang.get() === "ja" ? ja : en,
);

export function t(key: string): string {
  const trans = translations.get();
  return trans[key] || key;
}
