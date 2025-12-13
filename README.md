# Local QR Transfer

Local QR Transfer は Hono + htmx で構築した QR コード生成・読み取りアプリです。UI は PicoCSS (CDN) と Alpine.js (CDN) を用い、追加 CSS は最小限です。

## 機能

- QRコード生成 (ホーム)
- QRコード読み取りページ
- 国際化対応 (日本語／英語)
- カメラ切替（環境カメラ／前面カメラ）
- クリップボードコピー／貼り付け

## セットアップ

1. [Deno をインストール](https://deno.land/manual/getting_started/installation)
2. リポジトリをクローン:
   ```
   git clone https://github.com/syaryn/qr_transfer.git
   cd qr_transfer
   ```
3. （任意）Playwright など npm 依存を使う場合のみ:
   ```
   npm install
   ```
4. 開発サーバーを起動:
   ```
   deno task start
   ```

## プロジェクト構成（抜粋）

- `main.ts` — Hono エントリ。`/` (生成) `/readqr` (読取) `/api/qr` (生成 API) を提供。
- `static/` — PicoCSS 用の最小 CSS 上書きやアイコンなど（htmx / QR Scanner は CDN 利用）。
- `locales/` — 日英の文言 JSON。
- `deno.json` — タスク設定（`start` など）。

## 使用方法

1. サーバー起動後、ブラウザでアクセス:
   - `http://localhost:8000` (QR生成)
   - `http://localhost:8000/readqr` (QR読取)
2. ホームでテキストを入力し「QR」ボタンを押すとモーダルで QR が生成されます。読取タブには `/readqr` への QR も表示されます。
3. 読取ページではカメラを使ってスキャンし、結果をコピーできます。

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。
