import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";
import en from "./locales/en.json";
import { storage } from "./services/storageService";
import type { Lang } from "./types";

const supported = new Set<Lang>(["zh-CN", "zh-TW", "en"]);
const queryValue = new URLSearchParams(location.search).get("lang") as Lang | null;
const query = queryValue && supported.has(queryValue) ? queryValue : null;
const saved = storage.getLanguage();
const configuredDefault = import.meta.env.VITE_DEFAULT_LANGUAGE as Lang | undefined;

function browserLanguage(): Lang | null {
  const preferences = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const raw of preferences) {
    const value = raw.toLowerCase();
    if (
      value === "zh-tw" ||
      value === "zh-hk" ||
      value === "zh-mo" ||
      value.includes("hant")
    ) {
      return "zh-TW";
    }
    if (value === "zh" || value === "zh-cn" || value === "zh-sg" || value.includes("hans")) {
      return "zh-CN";
    }
    if (value.startsWith("en")) return "en";
  }
  return null;
}

function defaultLanguage(): Lang {
  if (query) return query;
  if (saved && supported.has(saved)) return saved;
  const browser = browserLanguage();
  if (browser) return browser;
  if (configuredDefault && supported.has(configuredDefault)) return configuredDefault;
  return "en";
}

await i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "zh-TW": { translation: zhTW },
    en: { translation: en },
  },
  lng: defaultLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
