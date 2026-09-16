import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // 開放區網存取，方便用手機實機測試。
    // 注意：麥克風只能在安全環境（https 或 localhost）使用；
    // 手機實機測試請用 vite 的 https 模式或改用桌面瀏覽器。
    host: true,
  },
  build: {
    // 便簽紙紋等素材維持獨立檔案，不內聯進 CSS/JS，便於瀏覽器快取。
    assetsInlineLimit: 2048,
  },
});
