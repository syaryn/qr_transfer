import i18next from "https://deno.land/x/i18next/index.js";
import Backend from "https://deno.land/x/i18next_fs_backend/index.js";
import i18nextMiddleware from "https://deno.land/x/i18next_http_middleware/index.js";

i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    // debug: true,
    initImmediate: false, // setting initImediate to false, will load the resources synchronously
    backend: {
      loadPath: "locales/{{lng}}.json",
    },
    fallbackLng: "en",
    preload: ["en", "ja"],
  });

export const i18n = i18next;
export const middleware = i18nextMiddleware;
