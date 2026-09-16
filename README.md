# DOGGY TALK｜小狗語言翻譯器

純前端趣味網頁：錄一段聲音，隨機得到一張「汪語翻譯」便簽。翻譯結果純屬娛樂，與錄音內容無關；所有資料只存在本機瀏覽器。

> 歷史沿革：本專案原本是單一 `doggy-talk.html`（約 9.1MB，素材以 base64 內嵌）。
> 現已工程化為 Vite + ES 模組架構（見下）；舊檔保留在 `doggy-talk.html` 作為行為對照基準，不再維護。
> 產品需求與流程設計見 `doggy-talk-plan.md`。

## 快速開始

```bash
npm install        # 安裝依賴（vite + lucide）
npm run dev        # 開發伺服器 → http://localhost:5173
npm run build      # 生產建置 → dist/
npm run preview    # 本機預覽建置結果
```

注意：麥克風只能在**安全環境**（`https://` 或 `localhost`）使用。
`vite.config.js` 已開啟 `server.host`，可用區網 IP 在手機上開頁面，但錄音需要 https（可用 `@vitejs/plugin-basic-ssl` 或反向代理）。

## 專案結構

```text
├── index.html               # 入口 HTML（只放結構；樣式與邏輯由 src/ 提供）
├── vite.config.js           # Vite 設定（host、素材內聯門檻）
├── src/
│   ├── main.js              # 入口：所有 DOM 事件綁定 + 啟動初始化
│   ├── state.js             # 跨模組共享的可變狀態（單一真相來源）
│   ├── elements.js          # DOM id 快取 + lucide 圖示渲染 + 波形建立
│   ├── assets.js            # 靜態素材匯入表（小狗姿態圖、裝飾圖）
│   ├── data/
│   │   └── phrases.js       # 汪語文案庫（純資料）
│   ├── utils/               # 純函數，無业务依賴
│   │   ├── format.js        # 時長/計時/日期格式化、escapeHtml、randBetween
│   │   └── gesture.js       # 手勢判定（方向鎖定、觸發條件、進度）
│   ├── services/            # 與畫面無關（或弱相關）的平台能力
│   │   ├── recorder.js      # 錄音（AudioContext→PCM→WAV）、計時、重置
│   │   ├── audio.js         # 播放協調（全站單一 Audio）、Blob→data URL
│   │   ├── db.js            # IndexedDB（音訊/照片二進位）
│   │   ├── records.js       # localStorage 收藏清單 + 頂列徽章
│   │   └── screens.js       # 狀態膠囊、主畫面五面板切換
│   ├── features/            # 使用者可見的功能單元
│   │   ├── translator.js    # 抽文案、翻譯動畫、便簽渲染
│   │   ├── note.js          # 便簽左右滑（右滑存/左滑刪）+ 3 秒復原
│   │   ├── photo.js         # 拍照面板、相機、構圖拖曳、裁切、finalizeSave
│   │   ├── history.js       # 收藏夾：渲染、卡片左滑刪除、排版切換、大圖
│   │   ├── toast.js         # Toast（含倒數條與動作按鈕）
│   │   └── decor.js         # 歡迎頁隨機裝飾（避開小狗本體）
│   ├── styles/
│   │   ├── main.css         # 樣式匯總入口（@import 順序 = cascade 順序！）
│   │   ├── base/            # 第一層：行動版基礎樣式
│   │   └── screens/         # 第二層：Figma 對齊畫面的覆寫
│   └── assets/              # PNG 素材（由 Vite 指紋化輸出）
├── Doggy talk png/          # 設計來源素材（未加工，不參與建置）
├── doggy-talk.html          # 舊版單檔實作（封存對照用）
└── doggy-talk-plan.md       # 產品計畫
```

### 分層規則（依賴方向）

```text
main.js → features → services → utils / data
                ↘ state.js / elements.js / assets.js（全員可用，自身無依賴）
```

- `utils/`、`data/` 不得 import 其他業務模組。
- `services/` 不得 import `features/`（`audio.js` 的 toast 提示除外，屬已接受的例外）。
- `features/` 之間可以單向呼叫（如 note → photo 的 openPhotoSheet），不可互相循環。
- 事件綁定**只在** `main.js`；模組只導出處理函式。

### 狀態管理

- 跨模組共享的可變狀態集中在 `state.js`（`appState`、`currentRecord`、`pendingPhoto`、`activeAudio`、`pressHeld`）。
- 模組私有的暫存（拖曳中繼、計時器、串流）留在各模組內，不進 `state.js`。
- 錄音狀態機：`idle → recording → stopping → generating → pending → saving/deleting → saved/idle`（詳見 plan 文檔 §5）。

## 樣式架構（重要）

舊版 CSS 是「兩段式」：先一套行動版基礎樣式，後面整段「Figma 對齊畫面」的覆寫。
拆檔時**完整保留 cascade 順序**：

1. `base/` 13 個檔案（tokens → reset → shell → stage → recorder → note → sheet → history → toast → ios-frame → utilities → media → welcome）
2. `screens/` 9 個檔案（同名對應：tokens → shell → … → toast → media）

`src/styles/main.css` 的 `@import` 順序就是套用順序 —— **新增或重排檔案前必讀**：
- 同名規則在 `screens/` 會覆蓋 `base/`，兩層的檔名刻意一一對應。
- `base/media.css`（響應式）必須在所有 base 規則之後、`screens/` 之前。
- 便簽紙紋是內聯 SVG data URI（很小，保留內聯避免額外請求）。

## 已知取捨與後續優化

- `welcome-wallpaper.png`（4.8MB）偏大：建議日後轉 WebP/AVIF（可省 80%+），目前為保品質維持 PNG。
- Google Fonts 仍走 CDN；要完全離線需改用本機字型檔。
- 錄音用 `ScriptProcessor`（已標記 deprecated 但相容性最好）+ 自製 WAV 編碼；因部分環境 MediaRecorder 的 WebM 無法解碼回放。
- 測試：目前以手動/腳本驗證；可再加入 Vitest（utils 純函數）與 Playwright（流程）。
- `doggy-talk.html` 封存對照用；確認新版穩定後可移除。

## 部署

`npm run build` 產出 `dist/` 純靜態檔案，丟上任何靜態主機（GitHub Pages、Netlify、Cloudflare Pages…）即可。
注意：網站必須走 HTTPS，使用者才能授權麥克風。
