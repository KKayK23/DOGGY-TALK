/*
 * 靜態素材匯入表。
 * 圖片交給 Vite 處理（指紋檔名、壓縮、路徑解析），
 * 不再以 base64 內嵌在程式碼裡。
 */
import doggyReady from "./assets/doggy-ready.png";
import doggyPress from "./assets/doggy-press.png";
import doggyNo from "./assets/doggy-no.png";
import doggyFile from "./assets/doggy-file.png";
import decoPaw from "./assets/deco-paw.png";
import decoBone from "./assets/deco-bone.png";
import decoBall from "./assets/deco-ball.png";

/** 依情境切換的小狗圖與歡迎頁裝飾圖。 */
export const ASSETS = {
  ready: doggyReady,
  press: doggyPress,
  fail: doggyNo,
  file: doggyFile,
  paw: decoPaw,
  bone: decoBone,
  ball: decoBall,
};
