"use client";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import QrScanner from "npm:qr-scanner";
import {
  IconBulb,
  IconBulbFilled,
  IconCopy,
  IconCopyCheck,
  IconX,
} from "npm:@tabler/icons-preact";
import { t } from "../i18nStore.ts";

// 型定義を更新
interface CameraDevice {
  id: string;
  label: string;
}

export default function ReadQR() {
  // 新しくカメラ切替用シグナルを定義
  const cameraFacingMode = useSignal<"environment" | "user">("environment");
  const scannedData = useSignal("");
  const showPopup = useSignal(false);
  const copied = useSignal(false);

  const modalSize = Math.min(globalThis.innerWidth * 0.9, 400);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // カメラ切替: destroyを使わずsetCameraによりモードを切り替え
  const changeCamera = async (mode: "environment" | "user") => {
    if (!qrScannerRef.current) return;
    await qrScannerRef.current.setCamera(mode);
  };

  useEffect(() => {
    if (videoRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result: any) => {
          // カメラをstopせず、継続して映像を表示
          scannedData.value = result.data;
          showPopup.value = true;
        },
        {
          preferredCamera: cameraFacingMode.value,
          returnDetailedScanResult: true,
        },
      );
      qrScannerRef.current.start();
    }

    return () => {
      qrScannerRef.current?.stop();
    };
  }, []);

  // モード切替用関数に変更
  const switchCamera = async (mode: "environment" | "user") => {
    if (cameraFacingMode.value !== mode) {
      cameraFacingMode.value = mode;
      await changeCamera(mode);
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
    // 必要に応じて再開
    qrScannerRef.current?.start();
  };

  return (
    <div class="mt-8 bg-white p-6 rounded-lg shadow">
      {/* カメラ切替用ボタン */}
      <div class="flex flex-col items-center mb-2">
        <label class="mb-2">{t("camera.label")}</label>
        <div class="flex">
          <button
            type="button"
            onClick={() => switchCamera("environment")}
            class={`px-3 py-1 border mx-1 ${
              cameraFacingMode.value === "environment"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            {t("environment")}
          </button>
          <button
            type="button"
            onClick={() => switchCamera("user")}
            class={`px-3 py-1 border mx-1 ${
              cameraFacingMode.value === "user"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            {t("user")}
          </button>
        </div>
      </div>
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
            style={{ width: `${modalSize}px` }}
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
