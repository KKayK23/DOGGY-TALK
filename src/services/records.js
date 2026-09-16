import { elements } from "../elements.js";

/*
 * 收藏紀錄的中繼資料（localStorage）。
 * 音訊與照片的本體存 IndexedDB（見 db.js），這裡只存清單與旗標。
 */
const STORAGE_KEY = "doggy-talk-records-v1";

export function getRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

/** 持久化紀錄清單，並同步頂列的收藏數徽章。 */
export function setRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  updateHistoryCount();
}

/** 更新收藏夾按鈕上的數字徽章。 */
export function updateHistoryCount() {
  const count = getRecords().length;
  elements.historyCount.textContent = String(count);
  elements.historyCount.classList.toggle("visible", count > 0);
}
