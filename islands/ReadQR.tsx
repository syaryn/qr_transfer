"use client";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import QrScanner from "npm:qr-scanner";
import { IconCopy, IconCopyCheck, IconX } from "npm:@tabler/icons-preact";
import { t } from "../i18nStore.ts";

export default function ReadQR() {
  // useSignal をコンポーネント内に移動
  const cameraList = useSignal<string[]>([]);
  const selectedCameraIndex = useSignal<number>(0);
  const scannedData = useSignal("");
  const showPopup = useSignal(false);
  const copied = useSignal(false);

  const modalSize = Math.min(globalThis.innerWidth * 0.9, 400);

  const videoRef = useRef<HTMLVideoElement>(null);
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

    // カメラリストを取得し、初期カメラをセット
    QrScanner.listCameras(true).then((devices) => {
      cameraList.value = devices;
      if (devices.length > 0) {
        selectedCameraIndex.value = 0;
        qrScannerRef.current?.setCamera(devices[0]);
      }
    });

    return () => {
      qrScannerRef.current?.stop();
    };
  }, []);

  const switchCamera = (index: number) => {
    if (cameraList.value[index] && selectedCameraIndex.value !== index) {
      selectedCameraIndex.value = index;
      qrScannerRef.current?.setCamera(cameraList.value[index]);
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
      {cameraList.value.length > 0 && (
        <div class="flex flex-col items-center mb-2">
          <label class="mb-2">{t("camera.label")}</label>
          <div class="flex">
            {cameraList.value.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => switchCamera(index)}
                class={`px-3 py-1 border mx-1 ${
                  selectedCameraIndex.value === index
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
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
