import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks"; // 追加
import { IconClipboard, IconQrcode, IconX } from "npm:@tabler/icons-preact";
import QRCode from "npm:qrcode";
import { t } from "../i18nStore.ts";
import { qr_data } from "../stores/dataStore.ts";

interface QRGeneratorProps {
  urlPrefix: string;
}

export default function QRGenerator(props: QRGeneratorProps) {
  // コンポーネント初期化時にqr_dataが空の場合、props.urlPrefixをセット
  useEffect(() => {
    if (qr_data.value.trim() === "") {
      qr_data.value = props.urlPrefix;
    }
  }, [props.urlPrefix]);

  const copyMsg = useSignal("");
  const qrError = useSignal("");
  const isLoading = useSignal(true);
  const qrImage = useSignal("");
  const readingQRImage = useSignal("");
  const showModal = useSignal(false);
  const tabIndex = useSignal(0);

  const handleClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      qr_data.value = text;
    } catch (error) {
      console.error("Clipboard read failed:", error);
    }
  };

  const updateQRUrl = (e: Event) => {
    e.preventDefault();
    isLoading.value = true;
    copyMsg.value = "";
    qrError.value = "";
    const size = Math.min(globalThis.innerWidth * 0.9, 400);
    const readingUrl = globalThis.location.origin + "/readqr";
    Promise.all([
      QRCode.toDataURL(qr_data.value, { width: size }),
      QRCode.toDataURL(readingUrl, { width: size }),
    ])
      .then(([dataQR, readingQR]) => {
        qrImage.value = dataQR;
        readingQRImage.value = readingQR;
        tabIndex.value = 0;
        showModal.value = true;
        isLoading.value = false;
      })
      .catch(() => {
        qrError.value = t("qrError");
        isLoading.value = false;
      });
  };

  const closeModal = () => {
    showModal.value = false;
  };

  return (
    <div>
      <div class="mt-8 bg-white p-6 rounded-lg shadow">
        <form onSubmit={updateQRUrl} class="space-y-6">
          <div>
            <label class="block text-sm font-bold text-gray-700">
              {t("labelData")}
            </label>
            <textarea
              value={qr_data.value}
              onInput={(
                e,
              ) => (qr_data.value = (e.target as HTMLTextAreaElement).value)}
              class="mt-1 px-3 py-2 block w-full rounded-none rounded-l-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              placeholder={t("placeholderData")}
            >
            </textarea>
          </div>
          <div class="flex justify-end">
            <button
              type="button" // changed from "submit"
              onClick={handleClipboard}
              class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 p-3 text-white hover:bg-indigo-700 focus:outline-none mr-2" // 変更: 右マージン追加
            >
              <IconClipboard />
            </button>
            <button
              type="submit"
              class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 p-3 text-white hover:bg-indigo-700 focus:outline-none"
            >
              <IconQrcode />
            </button>
          </div>
        </form>
      </div>
      {showModal.value && (
        <div
          onClick={closeModal}
          class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            class="relative bg-white p-4 rounded-lg shadow-lg max-w-[90vw] max-h-[80vh]"
          >
            <button
              type="button"
              onClick={closeModal}
              class="absolute top-1 right-3 text-gray-600 hover:text-gray-800 focus:outline-none text-3xl"
            >
              <IconX />
            </button>
            <p class="mt-4">{t("readingMessage")}</p>
            <div class="flex border-b">
              <button
                type="button"
                onClick={() => (tabIndex.value = 0)}
                class={`px-4 py-2 focus:outline-none ${
                  tabIndex.value === 0 ? "border-b-2 border-indigo-600" : ""
                }`}
              >
                {t("dataQRTab")}
              </button>
              <button
                type="button"
                onClick={() => (tabIndex.value = 1)}
                class={`px-4 py-2 focus:outline-none ${
                  tabIndex.value === 1 ? "border-b-2 border-indigo-600" : ""
                }`}
              >
                {t("readingQRTab")}
              </button>
            </div>
            {tabIndex.value === 0
              ? (
                <img
                  src={qrImage.value}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              )
              : (
                <div class="flex flex-col items-center">
                  <img
                    src={readingQRImage.value}
                    alt="Reading Screen QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
