import { elements } from "../elements.js";

/*
 * 收藏紀錄的中繼資料（localStorage）。
 * 音訊與照片的本體存 IndexedDB（見 db.js），這裡只存清單與旗標。
 */
const STORAGE_KEY = "doggy-talk-records-v1";

/* 上次打開收藏夾的時間戳；在此之後儲存的紀錄算「未讀」。 */
const READ_KEY = "doggy-talk-history-read-at";

export function getRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

/** 持久化紀錄清單，並同步頂列的收藏數徽章。 */
export function setRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  updateHistoryCount();
}

/** 使用者看過收藏夾了：把目前時間記為已讀基準，徽章歸零。 */
export function markHistoryRead() {
  localStorage.setItem(READ_KEY, String(Date.now()));
  updateHistoryCount();
}

/** 更新收藏夾按鈕上的徽章：顯示未讀（看過收藏夾後新存入）的錄音數。 */
export function updateHistoryCount() {
  const lastReadAt = Number(localStorage.getItem(READ_KEY) || 0);
  const count = getRecords().filter((record) => (record.savedAt ?? record.createdAt) > lastReadAt).length;
  elements.historyCount.textContent = String(count);
  elements.historyCount.classList.toggle("visible", count > 0);
}
