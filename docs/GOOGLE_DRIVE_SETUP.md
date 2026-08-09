# Version 0.4 Google Drive PDF設定

商業探究アーカイブでは、PDFそのものはGoogle Driveに保存し、閲覧者にはWebサイト内の「研究報告書」として表示します。

## 1. Google DriveにPDFを置く

PDFを商業探究アーカイブ用Google Driveへアップロードします。

## 2. PDFの共有設定

対象PDFの共有設定を「リンクを知っている全員が閲覧者」にします。
編集権限は付けないでください。

## 3. 共有リンクをコピー

例：

https://drive.google.com/file/d/XXXXXXXXXXXXXXXXXXXX/view?usp=sharing

## 4. data/researches.json の pdf_url に貼る

例：

"pdf_url": "https://drive.google.com/file/d/XXXXXXXXXXXXXXXXXXXX/view?usp=sharing"

サイト側が自動的に閲覧用URLへ変換します。`/preview` への書き換えは不要です。

## 5. GitHubへ更新ファイルをアップロード

`data/researches.json` をGitHubへ上書きアップロードして Commit changes を押します。
反映後、その研究の詳細ページで「研究報告書を読む」が表示されます。

## 注意

- PDFの共有設定が限定公開のままだと、他の利用者には表示できません。
- Google Driveアプリのインストールは不要です。PC・スマートフォンともブラウザで閲覧できます。
- `pdf_url` が空欄の場合は「研究報告書は準備中です」と表示されます。
