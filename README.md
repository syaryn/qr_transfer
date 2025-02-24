# Local QR Transfer

Local QR TransferはFreshフレームワークとPreact
Signalsを利用したQRコード生成・読み取りアプリです。

## 特徴

- QRコード生成 (ホームページ)
- QRコード読み取りページ
- 国際化対応 (日本語／英語)
- カメラ切替機能（環境カメラ／前面カメラ）
- クリップボードからデータ取得機能

## インストール

1. [Deno をインストール](https://deno.land/manual/getting_started/installation)
2. リポジトリをクローン:
   ```
   git clone https://github.com/syaryn/qr_transfer.git
   cd qr_transfer
   ```
3. プロジェクトを起動:
   ```
   deno task start
   ```

## プロジェクト構成

- `/routes`
  - `index.tsx` - QRコード生成ページ
  - `readqr.tsx` - QRコード読み取りページ
  - `_app.tsx` - 共通レイアウト
- `/islands`
  - `DataQR.tsx` - QRコード生成コンポーネント
  - `ReadQR.tsx` - QRコード読み取りコンポーネント
- `/components` - 補助コンポーネント (例: Instructions)
- その他 i18n 設定やデータストアなど

## 使用方法

1. サーバー起動後、ブラウザで以下にアクセス:
   - `http://localhost:8000` (QRコード生成)
   - `http://localhost:8000/readqr` (QRコード読み取り)
2. ボタン操作により、QRコードの生成、読み取り、カメラの切替が可能です。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
