import { h } from "preact";

interface InstructionsProps {
  userLang: "ja" | "en";
}

export default function Instructions({ userLang }: InstructionsProps) {
  return userLang === "ja"
    ? (
      <section class="mt-4">
        <h2 class="text-xl font-bold text-center">操作方法</h2>
        <ol class="list-decimal list-inside mt-2 text-sm text-gray-600">
          <li>
            転送(共有)元の端末で&nbsp;
            <a href="/" class="text-blue-600">QR作成画面</a>
            &nbsp;のデータ欄に共有(転送したい)文字列を入力して右下のQRボタンをクリックします。
          </li>
          <li>
            転送(共有)先の端末で&nbsp;
            <a href="/readqr" class="text-blue-600">QR読取画面</a>
            &nbsp;にアクセスして1で作成したQRコードを読み取ります。
          </li>
          <li>
            クリップボードボタンを押してあとは好きなアプリに貼り付けてください。
          </li>
        </ol>
      </section>
    )
    : (
      <section class="mt-4">
        <h2 class="text-xl font-bold text-center">How to Use</h2>
        <ol class="list-decimal list-inside mt-2 text-sm text-gray-600">
          <li>
            On the sender device, enter the string you want to share in the data
            field of the&nbsp;
            <a href="/" class="text-blue-600">QR Creation Screen</a>
            &nbsp;and click the QR button at the bottom right.
          </li>
          <li>
            On the receiver device, access the&nbsp;
            <a href="/readqr" class="text-blue-600">QR Reading Screen</a>
            &nbsp;to scan the QR code you created.
          </li>
          <li>
            Press the clipboard button and paste it into your desired app.
          </li>
        </ol>
      </section>
    );
}
