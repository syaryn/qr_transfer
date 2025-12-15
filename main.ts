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
  ["/robots.txt", "./static/robots.txt"],
  ["/logo.svg", "./static/logo.svg"],
  ["/favicon.ico", "./static/logo.svg"],
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
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <script
          src="https://cdn.jsdelivr.net/npm/htmx.org@1.9.12/dist/htmx.min.js"
          defer
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/@ryangjchandler/alpine-clipboard@2.3.0/dist/alpine-clipboard.min.js"
          defer
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
          defer
        ></script>
        <script>
          // Define Alpine component factories as globals
          // (Alpine will call these when evaluating x-data="qrHome()")
          const __copyToastMessage = ${raw(JSON.stringify(t(lang, "copied")))};
          
          const __copyWithFallback = async (value, textareaRef, clipboardMagic) => {
            try {
              if (clipboardMagic) {
                await clipboardMagic(value);
                return true;
              }
            } catch (err) {
              console.error('Clipboard magic failed', err);
            }
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
                return true;
              }
            } catch (err) {
              console.error('Clipboard write failed', err);
            }
            try {
              if (textareaRef) {
                textareaRef.focus();
                textareaRef.select();
                const ok = document.execCommand('copy');
                textareaRef.setSelectionRange(textareaRef.value.length, textareaRef.value.length);
                return ok;
              }
            } catch (err) {
              console.error('Clipboard select copy failed', err);
            }
            try {
              const area = document.createElement('textarea');
              area.value = value;
              area.setAttribute('readonly', '');
              area.style.position = 'absolute';
              area.style.left = '-9999px';
              document.body.appendChild(area);
              area.select();
              const ok = document.execCommand('copy');
              document.body.removeChild(area);
              return ok;
            } catch (err) {
              console.error('Clipboard fallback failed', err);
              return false;
            }
          };

          // Global function for x-data="qrHome()"
          function qrHome() {
            return {
              toast: '',
              toastTimer: null,
              async copyData() {
                const textarea = this.$refs.dataInput;
                const value = textarea?.value ?? '';
                if (!value.trim()) return;
                const ok = await __copyWithFallback(value, textarea, this.$clipboard);
                if (ok) this.showToast(__copyToastMessage);
                else this.showToast('コピーできませんでした。テキストを選択して Ctrl+C / Cmd+C を押してください。');
              },
              showToast(message) {
                this.toast = message;
                if (this.toastTimer) clearTimeout(this.toastTimer);
                this.toastTimer = setTimeout(() => (this.toast = ''), 1400);
              },
            };
          }

          // Global function for x-data="qrReader()"
          let __QrScannerCached = null;
          async function __loadQrScanner() {
            if (__QrScannerCached) return __QrScannerCached;
            const mod = await import('https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js');
            const QrScanner = mod?.default;
            if (!QrScanner) throw new Error('Failed to load qr-scanner');
            // QrScanner.WORKER_PATH is not required in newer versions
            __QrScannerCached = QrScanner;
            return QrScanner;
          }

          function qrReader() {
            return {
              scanner: null,
              result: '',
              activeCamera: 'environment',
              hasMultipleCameras: false,
              loading: true,
              errorMessage: '',
              async init() {
                const video = this.$refs.video;
                if (!video) return;
                try {
                  const QrScanner = await __loadQrScanner();
                  this.scanner = new QrScanner(
                    video,
                    (res) => {
                      this.result = res?.data ?? res;
                      this.showDialog();
                    },
                    { preferredCamera: this.activeCamera },
                  );
                } catch (err) {
                  console.error('Failed to init qr-scanner', err);
                  this.errorMessage = 'Failed to initialize scanner.';
                  return;
                }
                try {
                  await this.scanner.start();
                  this.loading = false;
                } catch (err) {
                  console.error('Failed to start camera', err);
                  this.loading = false;
                  // Check for common issues and provide actionable guidance
                  if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                    this.errorMessage = ${raw(JSON.stringify(t(lang, "camera.permissionDenied")))};
                  } else if (err?.name === 'NotSupportedError' || (location.protocol !== 'https:' && location.hostname !== 'localhost')) {
                    this.errorMessage = ${raw(JSON.stringify(t(lang, "camera.httpsRequired")))};
                  } else {
                    this.errorMessage = ${raw(JSON.stringify(t(lang, "camera.genericError")))} + ' (' + (err?.name || 'Error') + ')';
                  }
                }
                try {
                  const QrScanner = await __loadQrScanner();
                  const devices = await QrScanner.listCameras(true);
                  this.hasMultipleCameras = devices.length > 1;
                } catch (err) {
                  console.error('Failed to list cameras', err);
                }
              },
              async switchCamera(mode) {
                if (!this.scanner) return;
                try {
                  await this.scanner.setCamera(mode);
                  this.activeCamera = mode;
                } catch (err) {
                  console.error('Failed to switch camera', err);
                }
              },
              showDialog() {
                const dialog = this.$refs.dialog;
                if (!dialog) return;
                try {
                  dialog.showModal?.();
                  if (this.scanner) {
                    Promise.resolve(this.scanner.stop()).catch(() => {});
                  }
                } catch (err) {
                  console.error('Failed to open dialog', err);
                }
              },
              closeDialog() {
                const dialog = this.$refs.dialog;
                if (!dialog) return;
                dialog.close?.();
                if (this.scanner) {
                  Promise.resolve(this.scanner.start()).catch(() => {});
                }
              },
              async copyResult() {
                try {
                  await navigator.clipboard.writeText(this.result ?? '');
                } catch (err) {
                  console.error('Clipboard write failed', err);
                }
              },
            };
          }
        </script>
      </head>
      <body>
        <main class="container">${body}</main>
        <footer style="text-align:center;">${trademark}</footer>
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
      <section>
        <h2>操作方法</h2>
        <ol>
          <li>
            転送(共有)元の端末で <a href="/">QR作成画面</a> のデータ欄に共有(転送したい)
            文字列を入力して右下のQRボタンをクリックします。
          </li>
          <li>
            転送(共有)先の端末で <a href="/readqr">QR読取画面</a> にアクセスして 1 で作成した
            QR コードを読み取ります。
          </li>
          <li>クリップボードボタンを押してアプリに貼り付けてください。</li>
        </ol>
      </section>
    `;
  }
  return html`
    <section>
      <h2>How to Use</h2>
      <ol>
        <li>
          On the sender device, enter the string you want to share in the data field of the
          <a href="/">QR Creation Screen</a> and click the QR button.
        </li>
        <li>
          On the receiver device, go to the <a href="/readqr">QR Reading Screen</a> to scan the QR you created.
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
    <section class="grid" x-data="qrHome()" aria-label="${title}">
      <article>
        <header>
          <img
            src="/logo.svg"
            alt="${title}"
            width="96"
            height="96"
            style="display:block;margin:0 auto;"
          />
          <h1>${title}</h1>
          <p class="secondary">${description}</p>
        </header>
        ${instructions(lang)}
      </article>
      <article class="contrast">
        <form
          id="qr-form"
          hx-get="/fragments/qr"
          hx-target="#qr-modal"
          hx-swap="innerHTML"
          hx-indicator="#loading-indicator"
        >
          <label for="data">
            <span>${t(lang, "labelData")}</span>
            <textarea
              id="data"
              name="data"
              rows="4"
              placeholder="${t(lang, "placeholderData")}" 
              x-ref="dataInput"
              required
            >${qrDefault}</textarea>
          </label>
          <input type="hidden" id="qr-size" name="size" value="320" />
          <input type="hidden" name="format" value="png" />
          <progress
            id="loading-indicator"
            value="0"
            max="100"
            hidden
            aria-label="${t(lang, "loading")}" 
          ></progress>
          <div class="grid">
            <button type="button" class="secondary" @click="copyData()">
              ${t(lang, "copy")}
            </button>
            <button type="submit" class="primary">
              ${t(lang, "generateQR")}
            </button>
          </div>
          <small
            id="copy-toast"
            class="secondary"
            x-show="toast"
            x-text="toast"
            role="status"
            aria-live="polite"
          ></small>
        </form>
      </article>
    </section>
    <div id="qr-modal"></div>
  `;

  const script = `
    (() => {
      const modalHost = document.getElementById('qr-modal');
      const loadingIndicator = document.getElementById('loading-indicator');



      const handleConfig = (evt) => {
        if (!(evt.target instanceof Element)) return;
        const formEl = evt.target.closest('#qr-form');
        if (!formEl) return;
        const size = Math.min(Math.round(window.innerWidth * 0.85), 420);
        evt.detail.parameters.size = size;
        evt.detail.parameters.format = 'png';
      };

      const handleBefore = (evt) => {
        if (!(evt.target instanceof Element)) return;
        const formEl = evt.target.closest('#qr-form');
        if (!formEl) return;
        loadingIndicator?.removeAttribute('hidden');
      };

      const handleAfter = (evt) => {
        if (!(evt.target instanceof Element)) return;
        const formEl = evt.target.closest('#qr-form');
        if (!formEl) return;
        loadingIndicator?.setAttribute('hidden', '');
      };

      const handleSwap = (evt) => {
        if (!(evt.target instanceof Element)) return;
        if (!modalHost || !modalHost.contains(evt.target)) return;
        const dialog = modalHost.querySelector('dialog');
        if (dialog?.showModal) {
          dialog.showModal();
          dialog.addEventListener('close', () => { modalHost.innerHTML = ''; }, { once: true });
        }
      };

      document.body.addEventListener('htmx:configRequest', handleConfig);
      document.body.addEventListener('htmx:beforeRequest', handleBefore);
      document.body.addEventListener('htmx:afterRequest', handleAfter);
      document.body.addEventListener('htmx:afterSwap', handleSwap);
    })();
  `;

  return layout(lang, title, description, trademark, body, script);
}

function qrModal(lang: Lang, dataQrUrl: string, readingQrUrl: string) {
  return html`
    <dialog id="qr-dialog" x-data="{ tab: 'data' }">
      <article>
        <header>
          <button
            aria-label="${t(lang, 'close')}"
            rel="prev"
            @click="$el.closest('dialog')?.close()"
          ></button>
          <p>
            <strong>${t(lang, "readingMessage")}</strong>
          </p>
        </header>
        <nav aria-label="QR tabs" role="tablist">
          <div role="group">
            <button
              type="button"
              :aria-pressed="tab === 'data'"
              :class="tab === 'data' ? 'primary' : 'secondary'"
              @click="tab = 'data'"
            >
              ${t(lang, "dataQRTab")}
            </button>
            <button
              type="button"
              :aria-pressed="tab === 'reading'"
              :class="tab === 'reading' ? 'primary' : 'secondary'"
              @click="tab = 'reading'"
            >
              ${t(lang, "readingQRTab")}
            </button>
          </div>
        </nav>
        <div x-show="tab === 'data'" style="text-align: center;">
          <img src="${dataQrUrl}" alt="QR Code" loading="lazy" width="360" height="360" style="display: block; margin: 0 auto;" />
        </div>
        <div x-show="tab === 'reading'" style="text-align: center;">
          <img src="${readingQrUrl}" alt="Reading Screen QR Code" loading="lazy" width="360" height="360" style="display: block; margin: 0 auto;" />
        </div>
      </article>
    </dialog>
  `;
}

function readPage(lang: Lang) {
  const title = t(lang, "readqr.title");
  const description = t(lang, "readqr.description");
  const trademark = t(lang, "readqr.trademark");
  const body = html`
    <section class="grid" x-data="qrReader()" x-init="init()">
      <article>
        <header>
          <img
            src="/logo.svg"
            alt="${title}"
            width="96"
            height="96"
            style="display:block;margin:0 auto;"
          />
          <h1>${title}</h1>
          <p class="secondary">${description}</p>
        </header>
        ${instructions(lang)}
      </article>
      <article class="contrast">
        <div x-show="hasMultipleCameras">
          <p class="secondary">${t(lang, "camera.label")}</p>
          <div class="grid" style="grid-template-columns: 1fr 1fr;">
            <button
              type="button"
              :aria-pressed="activeCamera === 'environment'"
              :class="activeCamera === 'environment' ? 'primary' : 'secondary'"
              @click="switchCamera('environment')"
            >
              ${t(lang, "camera.environment")}
            </button>
            <button
              type="button"
              :aria-pressed="activeCamera === 'user'"
              :class="activeCamera === 'user' ? 'primary' : 'secondary'"
              @click="switchCamera('user')"
            >
              ${t(lang, "camera.user")}
            </button>
          </div>
        </div>
        <div x-show="errorMessage" style="color: var(--pico-del-color); margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--pico-del-color); border-radius: var(--pico-border-radius);">
          <strong x-text="errorMessage"></strong>
        </div>
        <figure>
          <video id="qr-video" x-ref="video" muted playsinline style="width: 100%; height: auto; border-radius: var(--pico-border-radius);"></video>
        </figure>
        <p x-show="loading" role="status" aria-live="polite">${t(lang, "loading")}</p>
      </article>

      <dialog x-ref="dialog">
        <article>
          <header>
            <h3>${t(lang, "scanResult")}</h3>
            <button type="button" class="secondary" aria-label="${t(lang, 'close')}" @click="closeDialog()">
              <span aria-hidden="true">✕</span>
            </button>
          </header>
          <textarea rows="4" readonly x-model="result"></textarea>
          <footer>
            <button type="button" class="secondary" @click="copyResult()">${t(lang, "copy")}</button>
            <button type="button" class="primary" @click="closeDialog()">${t(lang, "close")}</button>
          </footer>
        </article>
      </dialog>
    </section>
  `;

  return layout(lang, title, description, trademark, body);
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
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
          />
        </head>
        <body>
          <main class="container">
            <p class="secondary">404</p>
            <h1>Page not found</h1>
            <p><a href="/">Go home</a></p>
          </main>
        </body>
      </html>
    `,
    404,
  );
});

Deno.serve(app.fetch);
