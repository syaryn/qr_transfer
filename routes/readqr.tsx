import { Handlers, PageProps } from "$fresh/server.ts";
import ReadQR from "../islands/ReadQR.tsx";
import { i18n } from "../i18n.ts";
import Instructions from "../components/Instructions.tsx";
import { Partial } from "$fresh/runtime.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const acceptLanguage = req.headers.get("accept-language") || "";
    const userLang = acceptLanguage.toLowerCase().startsWith("ja")
      ? "ja"
      : "en";
    const urlPrefix = Deno.env.get("url_prefix") || "";

    // 翻訳キー "readqr.title", "readqr.description", "readqr.trademark" から文字列取得
    const currentMsg = {
      title: i18n.t("readqr.title", { lng: userLang }),
      description: i18n.t("readqr.description", { lng: userLang }),
      trademark: i18n.t("readqr.trademark", { lng: userLang }),
    };

    return ctx.render({ userLang, urlPrefix, currentMsg });
  },
};

export default function ReadQRPage(
  props: PageProps<
    {
      userLang: "ja" | "en";
      urlPrefix: string;
      currentMsg: { title: string; description: string; trademark: string };
    }
  >,
) {
  const { userLang, urlPrefix, currentMsg } = props.data;
  return (
    <div
      f-client-nav
      class="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <Partial name="main">
        <div class="max-w-lg w-full space-y-8">
          <div>
            <img
              class="mx-auto h-24 w-auto"
              src="/logo.svg"
              alt={currentMsg.title}
            />
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {currentMsg.title}
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
              {currentMsg.description}
            </p>
            <Instructions userLang={userLang} />
          </div>
          <ReadQR />
        </div>
      </Partial>
      <footer class="mt-8 text-center text-xs">
        <p>{currentMsg.trademark}</p>
      </footer>
    </div>
  );
}
