# DOGGY TALK｜小狗語言翻譯器

純前端趣味網頁：錄一段聲音，隨機得到一張「汪語翻譯」便簽。翻譯結果純屬娛樂，與錄音內容無關；所有資料只存在本機瀏覽器。

> 歷史沿革：本專案原本是單一 `doggy-talk.html`（約 9.1MB，素材以 base64 內嵌），
> 曾於 2026-09 短暫工程化為 Vite + ES 模組（`index.html` + `src/`）；
> 2026-09-17 應使用者要求改回**單一檔案**模式：`doggy-talk.html` 是唯一程式本體，
> Vite 相關檔案已移除（需要時可從 git 歷史 commit `5da4d52` 找回）。
> 產品需求與流程設計見 `doggy-talk-plan.md`。

## 快速開始

不用安裝任何東西——直接用瀏覽器打開 `doggy-talk.html`（雙擊即可）。

- 錄音需要麥克風權限；桌面瀏覽器在 `file://` 下可直接授權。
- 手機實機測試必須走**安全環境**（`https://` 或 `localhost`），可用任一靜態伺服器
  （`npx serve .`、`python -m http.server`）再搭配 https 代理。
- lucide 圖示（unpkg CDN）與 Google Fonts 走網路；離線時圖示/字型不載入，功能不受影響。

## 專案結構

```text
├── doggy-talk.html     # 唯一程式本體：<style> ＋ HTML ＋ <script>（全在檔內）
├── note-paper.svg      # 便簽紙紋來源素材（檔內已內聯，僅留存檔）
├── Doggy talk png/     # 設計來源素材（未加工，執行時不使用）
├── doggy-talk-plan.md  # 產品計畫
└── README.md
```

`doggy-talk.html` 內部區塊（行號會隨改版漂移，以搜尋為準）：

- `<style>`：前半是行動版基礎樣式，`@media (min-width: 760px)` 一段是桌面覆寫；
  另有一小節「全寬度覆寫層」（Loading 逐字波浪、狀態膠囊隱藏、收藏夾補照片）。
- `<script>`：單一 IIFE，順序大致為 `messages`（汪語文案庫）→ `elements`（id 快取）→
  `ASSETS`（base64 素材表）→ 錄音 / 翻譯 / 便簽 / 照片 / 收藏夾 / toast 各功能函式 →
  事件綁定 → 初始化。

## 維護須知

- 文案庫 `messages`：新增保持 id 唯一；文風鐵則——短句、只表達行為或當下狀態，不解釋原因、不在句尾補充說明。
- 收藏夾徽章顯示「未讀」數：`(savedAt ?? createdAt) > lastReadAt`（`READ_KEY = doggy-talk-history-read-at`），打開收藏夾即歸零；新存入才會重新出現。
- 錄音狀態機：`idle → recording → stopping → generating → pending → saving/deleting → saved/idle`（詳見 plan 文檔 §5）。
- 檔案內有大量 base64 超長行，用搜尋工具定位後編輯，避免把整行丟給編輯操作。

## 已知取捨與後續優化

- `welcome-wallpaper`（4.6MB）偏大：建議日後轉 WebP/AVIF（可省 80%+），目前為保品質維持 PNG。
- Google Fonts 仍走 CDN；要完全離線需改用本機字型檔。
- 錄音用 `ScriptProcessor`（已標記 deprecated 但相容性最好）+ 自製 WAV 編碼；因部分環境 MediaRecorder 的 WebM 無法解碼回放。
- 測試：目前以手動/腳本驗證；可再加入 Playwright（流程）。

## 部署

`doggy-talk.html` 是自包含的靜態檔案，直接丟上任何靜態主機（GitHub Pages、Netlify、Cloudflare Pages…）即可。
注意：網站必須走 HTTPS，使用者才能授權麥克風。
