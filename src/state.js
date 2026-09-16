/*
 * 跨模組共享的可變狀態（單一真相來源）。
 *
 * 只放「確實需要跨模組讀寫」的欄位；模組私有的暫存狀態
 * （拖曳中繼、計時器、串流等）留各自模組內，避免狀態面失控。
 * 機器狀態流轉圖請見 README〈狀態機〉。
 */
export const state = {
  /** idle | recording | stopping | generating | pending | saving | deleting | saved */
  appState: "idle",

  /** 使用者是否正按住錄音鍵。main（輸入綁定）寫入、recorder 讀取。 */
  pressHeld: false,

  /** 目前待處理的翻譯便簽；null 代表沒有進行中的結果。 */
  currentRecord: null,

  /** 拍照流程中選擇的原始照片（File/Blob），儲存後清空。 */
  pendingPhoto: null,

  /** 正在播放的 Audio。便簽試聽與收藏夾播放共用，全站同時只允許一個。 */
  activeAudio: null,
};
