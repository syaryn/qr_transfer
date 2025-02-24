"use client";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import QrScanner from "npm:qr-scanner";
import { IconCopy, IconCopyCheck, IconX } from "npm:@tabler/icons-preact";
import { t } from "../i18nStore.ts";

export default function ReadQR() {
  // 追加: モーダルの横幅計算
  const modalSize = Math.min(globalThis.innerWidth * 0.9, 400);

  const cameraOptions = useSignal<{ environment: string; user: string } | null>(
    null,
  );
  const selectedMode = useSignal<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannedData = useSignal("");
  const showPopup = useSignal(false);
  const copied = useSignal(false);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result: string) => {
          scannedData.value = result.data;
          showPopup.value = true;
          qrScannerRef.current?.stop();
        },
        { returnDetailedScanResult: true },
      );
      qrScannerRef.current.start();
    }

    QrScanner.listCameras(true).then((devices) => {
      if (devices.length >= 2) {
        cameraOptions.value = { environment: devices[0], user: devices[1] };
        selectedMode.value = "environment";
        qrScannerRef.current?.setCamera(devices[0]);
      }
    });

    return () => {
      qrScannerRef.current?.stop();
    };
  }, []);

  const switchCamera = (mode: "environment" | "user") => {
    if (cameraOptions.value && selectedMode.value !== mode) {
      selectedMode.value = mode;
      const newCamera = cameraOptions.value[mode];
      qrScannerRef.current?.setCamera(newCamera);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(scannedData.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  };

  const closeModal = () => {
    showPopup.value = false;
    qrScannerRef.current?.start();
  };

  return (
    <div class="mt-8 bg-white p-6 rounded-lg shadow">
      {cameraOptions.value && (
        <div class="flex justify-center mb-2">
          <button
            type="button"
            class={`px-3 py-1 border ${
              selectedMode.value === "environment"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700"
            }`}
            onClick={() => switchCamera("environment")}
          >
            {t("camera.environment")}
          </button>
          <button
            type="button"
            class={`ml-2 px-3 py-1 border ${
              selectedMode.value === "user"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700"
            }`}
            onClick={() => switchCamera("user")}
          >
            {t("camera.user")}
          </button>
        </div>
      )}
      <video
        ref={videoRef}
        class="w-full max-w-md rounded-lg shadow-lg"
        muted
        playsInline
      />
      {showPopup.value && (
        <div
          onClick={closeModal}
          class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: `${modalSize}px` }} // 追加: 横幅を modalSize で指定
            class="relative bg-white p-4 rounded-lg shadow-lg max-h-[80vh]"
          >
            <button
              type="button"
              onClick={closeModal}
              title={t("close")}
              class="absolute top-1 right-3 text-gray-600 hover:text-gray-800 focus:outline-none text-3xl"
            >
              <IconX />
            </button>
            <textarea
              readOnly
              class="w-full h-24 p-2 border border-gray-300 rounded mt-5 mb-2"
              value={scannedData.value}
            />
            <div class="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                class="bg-blue-600 text-white p-2 rounded inline-flex items-center"
              >
                {copied.value
                  ? <IconCopyCheck class="text-green-500 w-5 h-5" />
                  : <IconCopy class="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
