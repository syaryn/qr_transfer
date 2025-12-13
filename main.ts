// deno-fmt-ignore-file
import "$std/dotenv/load.ts";
import { Hono } from "hono";
import { html, raw } from "hono/html";
import { serveStatic } from "hono/deno";
import QRCode from "qrcode";
import { optimize } from "svgo";

import en from "./locales/en.json" with { type: "json" };
import ja from "./locales/ja.json" with { type: "json" };

const translations = { en, ja } as const;
type Lang = keyof typeof translations;
type HtmlContent = ReturnType<typeof html>;

const app = new Hono();

const urlPrefix = Deno.env.get("url_prefix") ?? "";

const staticFiles: Array<[string, string]> = [
  ["/styles.css", "./static/styles.css"],
  ["/robots.txt", "./static/robots.txt"],
  ["/logo.svg", "./static/logo.svg"],
  ["/htmx.min.js", "./static/htmx.min.js"],
  ["/qr-scanner.min.js", "./static/qr-scanner.min.js"],
  ["/qr-scanner-worker.min.js", "./static/qr-scanner-worker.min.js"],
];

for (const [route, path] of staticFiles) {
  app.use(route, serveStatic({ path }));
}

app.use("/icons/*", serveStatic({ root: "./static" }));

function pickLang(req: Request): Lang {
  const header = req.headers.get("accept-language")?.toLowerCase() ?? "";
  return header.startsWith("ja") ? "ja" : "en";
}

function t(lang: Lang, key: string) {
  const dict = translations[lang] as Record<string, string>;
  return dict[key] ?? key;
}

function absoluteUrl(req: Request, path: string) {
  const base = new URL(req.url);
  return new URL(path, base).toString();
}

function layout(
  lang: Lang,
  title: string,
  description: string,
  trademark: string,
  body: HtmlContent,
  extraScript = "",
) {
  // deno-fmt-ignore
  return html`
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <meta name="description" content="${description}" />
        <link rel="stylesheet" href="/styles.css" />
        <script src="/htmx.min.js" defer></script>
      </head>
      <body class="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <main class="w-full max-w-3xl flex justify-center">${body}</main>
        <footer class="mt-10 text-center text-xs text-gray-600">${trademark}</footer>
        <script type="module">
        ${raw(extraScript)}
        </script>
      </body>
    </html>
  `;
}

function instructions(lang: Lang) {
  if (lang === "ja") {
    return html`
      <section class="mt-4">
        <h2 class="text-xl font-bold text-center">操作方法</h2>
        <ol class="list-decimal list-inside mt-2 text-sm text-gray-700 space-y-1">
          <li>
            転送(共有)元の端末で
            <a href="/" class="text-indigo-600">QR作成画面</a>
            のデータ欄に共有(転送したい)文字列を入力して右下のQRボタンをクリックします。
          </li>
          <li>
            転送(共有)先の端末で
            <a href="/readqr" class="text-indigo-600">QR読取画面</a>
            にアクセスして1で作成したQRコードを読み取ります。
          </li>
          <li>クリップボードボタンを押してアプリに貼り付けてください。</li>
        </ol>
      </section>
    `;
  }
  return html`
    <section class="mt-4">
      <h2 class="text-xl font-bold text-center">How to Use</h2>
      <ol class="list-decimal list-inside mt-2 text-sm text-gray-700 space-y-1">
        <li>
          On the sender device, enter the string you want to share in the data field
          of the <a href="/" class="text-indigo-600">QR Creation Screen</a>
          and click the QR button.
        </li>
        <li>
          On the receiver device, go to the
          <a href="/readqr" class="text-indigo-600">QR Reading Screen</a>
          to scan the QR you created.
        </li>
        <li>Press the clipboard button and paste it into your app.</li>
      </ol>
    </section>
  `;
}

function homePage(lang: Lang, req: Request) {
  const qrDefault = urlPrefix || "https://qrtr.syaryn.com/";
  const title = t(lang, "home.title");
  const description = t(lang, "home.description");
  const trademark = t(lang, "home.trademark");
  const body = html`
    <div class="max-w-lg w-full space-y-8">
      <div class="text-center space-y-3">
        <img src="/logo.svg" alt="${title}" class="mx-auto h-24 w-auto" />
        <h1 class="text-3xl font-bold text-gray-900">${title}</h1>
        <p class="text-sm text-gray-600">${description}</p>
        ${instructions(lang)}
      </div>
      <section class="bg-white p-6 rounded-lg shadow">
        <form
          id="qr-form"
          class="space-y-4"
          hx-get="/fragments/qr"
          hx-target="#qr-modal"
          hx-swap="innerHTML"
          hx-indicator="#loading-indicator"
        >
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-800" for="data"
            >${t(lang, "labelData")}</label>
            <textarea
              id="data"
              name="data"
              rows="4"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="${t(lang, 'placeholderData')}" required
            >${qrDefault}</textarea>
          </div>
          <input type="hidden" id="qr-size" name="size" value="320" />
          <input type="hidden" name="format" value="png" />
          <div class="flex items-center justify-end text-sm text-gray-600 gap-2">
            <div id="loading-indicator" class="hidden" aria-live="polite">
              ${t(lang, 'loading')}
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                data-action="copy-data"
                class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 p-3 text-white hover:bg-indigo-700"
                aria-label="Copy data"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08" />
                  <path d="M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08" />
                  <path d="M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25" />
                  <path d="M16.9 3.836A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586" />
                  <path d="M17.75 4.5c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664" />
                  <path d="M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
                </svg>
              </button>
              <button
                type="submit"
                class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 p-3 text-white hover:bg-indigo-700"
                aria-label="Generate QR"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5Z" />
                  <path d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                  <path d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path d="M6.75 6.75h.75v.75h-.75v-.75Z" />
                  <path d="M6.75 16.5h.75v.75h-.75v-.75Z" />
                  <path d="M16.5 6.75h.75v.75h-.75v-.75Z" />
                  <path d="M13.5 13.5h.75v.75h-.75v-.75Z" />
                  <path d="M13.5 19.5h.75v.75h-.75v-.75Z" />
                  <path d="M19.5 13.5h.75v.75h-.75v-.75Z" />
                  <path d="M19.5 19.5h.75v.75h-.75v-.75Z" />
                  <path d="M16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              </button>
            </div>
          </div>
          <div id="copy-toast" class="mt-2 text-xs text-indigo-600 hidden" aria-live="polite"></div>
        </form>
      </section>
      <div id="qr-modal"></div>
    </div>
  `;

  const script = `
    const form = document.getElementById('qr-form');
    const dataInput = document.getElementById('data');
    const modalHost = document.getElementById('qr-modal');
    const copyToast = document.getElementById('copy-toast');
    const copyToastMessage = ${lang === "ja" ? "'コピーしました'" : "'Copied'"};

    function setTab(container, tab) {
      const panels = container.querySelectorAll('[data-panel]');
      panels.forEach((panel) => {
        const isActive = panel.getAttribute('data-panel') === tab;
        panel.classList.toggle('hidden', !isActive);
      });

      const buttons = container.querySelectorAll('[data-action="switch-tab"]');
      buttons.forEach((btn) => {
        const isActive = btn.getAttribute('data-tab') === tab;
        btn.classList.toggle('border-b-2', isActive);
        btn.classList.toggle('border-indigo-600', isActive);
        btn.classList.toggle('text-gray-900', isActive);
        btn.classList.toggle('text-gray-700', !isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
    }

    function initModalTabs() {
      if (!modalHost) return;
      const modal = modalHost.querySelector('[data-modal]');
      if (!modal) return;
      const firstTab = modal.querySelector('[data-action="switch-tab"][data-tab]');
      const initialTab = firstTab?.getAttribute('data-tab') ?? 'data';
      setTab(modal, initialTab);
    }

    document.addEventListener('click', async (event) => {
      const origin = event.target;
      const target = origin instanceof Element ? origin.closest('[data-action]') : null;
      if (!target) return;
      const action = target.getAttribute('data-action');

      if (action === 'read-clipboard' && dataInput && 'value' in dataInput) {
        try {
          const text = await navigator.clipboard.readText();
          if (text.trim().length) {
            dataInput.value = text;
          }
        } catch (err) {
          console.error('Clipboard read failed', err);
        }
      }

      if (action === 'copy-data' && dataInput && 'value' in dataInput) {
        try {
          const value = String(dataInput.value ?? '');
          if (value.length) {
            await navigator.clipboard.writeText(value);
            target.setAttribute('data-state', 'copied');
            setTimeout(() => target.removeAttribute('data-state'), 1200);
            if (copyToast) {
              copyToast.textContent = copyToastMessage;
              copyToast.classList.remove('hidden');
              setTimeout(() => copyToast?.classList.add('hidden'), 1200);
            }
          }
        } catch (err) {
          console.error('Clipboard write failed', err);
        }
      }

      if (action === 'close-modal' && modalHost) {
        modalHost.innerHTML = '';
      }

      if (action === 'switch-tab') {
        const tab = target.getAttribute('data-tab');
        const container = target.closest('[data-modal]');
        if (!tab || !container) return;
        setTab(container, tab);
      }
    });

    document.body.addEventListener('htmx:configRequest', (evt) => {
      if (!(evt.target instanceof Element)) return;
      const formEl = evt.target.closest('#qr-form');
      if (!formEl) return;
      const size = Math.min(Math.round(window.innerWidth * 0.9), 400);
      evt.detail.parameters.size = size;
      evt.detail.parameters.format = 'png';
    });

    document.body.addEventListener('htmx:afterSwap', (evt) => {
      if (!(evt.target instanceof Element)) return;
      if (!modalHost || !modalHost.contains(evt.target)) return;
      initModalTabs();
    });

    initModalTabs();
  `;

  return layout(lang, title, description, trademark, body, script);
}

function qrModal(lang: Lang, dataQrUrl: string, readingQrUrl: string) {
  return html`
    <div class="fixed inset-0 z-50 flex items-center justify-center" data-modal>
      <div
        class="absolute inset-0 bg-black/50"
        data-action="close-modal"
        data-backdrop
      ></div>
      <div
        class="relative bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-[90vw] sm:max-w-xl w-auto mx-4 max-h-[85vh] overflow-auto"
      >
        <button
          type="button"
          data-action="close-modal"
          class="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
          aria-label="${t(lang, 'close')}"
        >
          <img src="/icons/close.svg" alt="" class="h-4 w-4" />
        </button>
        <p class="mt-4 text-sm text-gray-700">
          ${t(lang, "readingMessage")}
        </p>
        <div class="flex border-b mt-3">
          <button
            type="button"
            data-action="switch-tab"
            data-tab="data"
            class="px-4 py-2 border-b-2 border-indigo-600"
          >
            ${t(lang, "dataQRTab")}
          </button>
          <button
            type="button"
            data-action="switch-tab"
            data-tab="reading"
            class="px-4 py-2 text-gray-700"
          >
            ${t(lang, "readingQRTab")}
          </button>
        </div>
        <div class="pt-4 flex justify-center" data-panel="data">
          <img
            src="${dataQrUrl}"
            alt="QR Code"
            class="max-h-[60vh] w-auto object-contain"
            loading="lazy"
          />
        </div>
        <div class="pt-4 flex justify-center hidden" data-panel="reading">
          <img
            src="${readingQrUrl}"
            alt="Reading Screen QR Code"
            class="max-h-[60vh] w-auto object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  `;
}

function readPage(lang: Lang) {
  const title = t(lang, "readqr.title");
  const description = t(lang, "readqr.description");
  const trademark = t(lang, "readqr.trademark");
  const body = html`
    <section class="space-y-6">
      <div class="text-center space-y-3">
        <img src="/logo.svg" alt="${title}" class="mx-auto h-20 w-auto" />
        <h1 class="text-3xl font-bold text-gray-900">${title}</h1>
        <p class="text-sm text-gray-600">${description}</p>
        ${instructions(lang)}
      </div>
      <section class="bg-white p-6 rounded-lg shadow border space-y-4">
        <div class="flex flex-col items-center gap-2" id="camera-buttons" hidden>
          <span class="text-sm font-medium text-gray-800">${t(
            lang,
            "camera.label",
          )}</span>
          <div class="flex gap-2">
            <button
              data-camera="environment"
              class="px-3 py-2 rounded-md border border-gray-300"
            >
              ${t(lang, "camera.environment")}
            </button>
            <button
              data-camera="user"
              class="px-3 py-2 rounded-md border border-gray-300"
            >
              ${t(lang, "camera.user")}
            </button>
          </div>
        </div>
        <div class="relative">
          <video
            id="qr-video"
            class="w-full rounded-lg shadow bg-black"
            muted
            playsinline
          >
          </video>
          <div
            id="video-overlay"
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div class="px-3 py-1 rounded bg-black/60 text-white text-sm">
              ${t(lang, "loading")}
            </div>
          </div>
        </div>
      </section>
      <section
        id="scan-modal"
        class="fixed inset-0 hidden items-center justify-center bg-black/50 z-50"
      >
        <div
          class="relative bg-white rounded-lg shadow max-w-lg w-[90vw] p-6 space-y-3"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            data-action="close-modal"
            class="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
              aria-label="${t(lang, 'close')}"
          >
            <img src="/icons/close.svg" alt="" class="h-4 w-4" />
          </button>
          <textarea
            id="scan-text"
            class="w-full h-28 rounded-md border border-gray-300 px-3 py-2"
            readonly
          ></textarea>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              data-action="copy-scan"
              class="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
              aria-label="Copy"
            >
                <img src="/icons/copy.svg" alt="" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </section>
  `;

  const script = `
		import QrScanner from '/qr-scanner.min.js';
		QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

		const video = document.getElementById('qr-video');
		const modal = document.getElementById('scan-modal');
		const textArea = document.getElementById('scan-text');
		const overlay = document.getElementById('video-overlay');
		const cameraButtons = document.getElementById('camera-buttons');

		let scanner = null;

		async function init() {
			if (!video) return;
			scanner = new QrScanner(video, (result) => {
				if (!textArea) return;
				textArea.value = result.data ?? result;
				if (modal) modal.classList.remove('hidden');
			}, { preferredCamera: 'environment' });
			await scanner.start();
			overlay?.classList.add('hidden');

			const devices = await QrScanner.listCameras(true);
			if (devices.length > 1 && cameraButtons) {
				cameraButtons.hidden = false;
			}
		}

		init().catch((err) => console.error(err));

		document.addEventListener('click', async (event) => {
			const origin = event.target;
			const target = origin instanceof Element ? origin.closest('[data-action]') : null;
			if (!target) return;
			const action = target.getAttribute('data-action');
			if (action === 'close-modal') {
				modal?.classList.add('hidden');
				if (scanner) await scanner.start();
			}
			if (action === 'copy-scan') {
				if (!textArea) return;
				await navigator.clipboard.writeText(textArea.value);
				target.setAttribute('data-state', 'copied');
				setTimeout(() => target.removeAttribute('data-state'), 1200);
			}
		});

		document.addEventListener('click', async (event) => {
			const origin = event.target;
			const button = origin instanceof Element ? origin.closest('[data-camera]') : null;
			if (!button || !scanner) return;
			const mode = button.getAttribute('data-camera');
			if (!mode) return;
			await scanner.setCamera(mode);
			document.querySelectorAll('[data-camera]').forEach((el) => {
				el.classList.remove('bg-indigo-600', 'text-white');
				el.classList.add('bg-white', 'text-gray-800');
			});
			button.classList.remove('bg-white', 'text-gray-800');
			button.classList.add('bg-indigo-600', 'text-white');
		});
	`;

  return layout(lang, title, description, trademark, body, script);
}

app.get("/", (c) => {
  const lang = pickLang(c.req.raw);
  return c.html(homePage(lang, c.req.raw));
});

app.get("/readqr", (c) => {
  const lang = pickLang(c.req.raw);
  return c.html(readPage(lang));
});

app.get("/fragments/qr", (c) => {
  const lang = pickLang(c.req.raw);
  const url = new URL(c.req.url);
  const data = url.searchParams.get("data")?.trim() ?? "";
  const size = Math.min(
    Math.max(Number(url.searchParams.get("size") ?? 320), 120),
    1000,
  );
  const format = "png";

  if (!data) {
    return c.html(html``);
  }

  const params = new URLSearchParams({ data, size: String(size), format });
  const dataQrUrl = absoluteUrl(c.req.raw, `/api/qr?${params.toString()}`);
  const readingUrl = absoluteUrl(c.req.raw, "/readqr");
  const readingParams = new URLSearchParams({
    data: readingUrl,
    size: String(size),
    format,
  });
  const readingQrUrl = absoluteUrl(
    c.req.raw,
    `/api/qr?${readingParams.toString()}`,
  );

  return c.html(qrModal(lang, dataQrUrl, readingQrUrl));
});

app.get("/api/qr", async (c) => {
  const url = new URL(c.req.url);
  const data = url.searchParams.get("data") ?? "";
  const size = Math.min(
    Math.max(Number(url.searchParams.get("size") ?? 320), 120),
    1000,
  );
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";

  if (!data) {
    return c.text("Missing data", 400);
  }

  if (format === "svg") {
    const svg = await QRCode.toString(data, {
      type: "svg",
      width: size,
      margin: 1,
    });
    const optimized = optimize(svg, { multipass: true });
    return c.body(optimized.data, 200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
  }

  const dataUrl = await QRCode.toDataURL(data, { width: size, margin: 1 });
  const base64 = dataUrl.split(",", 2)[1];
  const binary = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  return c.body(binary.buffer, 200, {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=3600",
  });
});

app.notFound((c) => {
  return c.html(
    html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Not Found</title>
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body class="min-h-screen grid place-items-center bg-gray-50">
          <div class="text-center space-y-3">
            <p class="text-sm text-gray-500">404</p>
            <h1 class="text-2xl font-semibold text-gray-900">Page not found</h1>
            <a href="/" class="text-indigo-600 hover:text-indigo-700">Go home</a>
          </div>
        </body>
      </html>
    `,
    404,
  );
});

Deno.serve(app.fetch);
