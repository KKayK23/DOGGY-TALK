/** 純格式化工具：無副作用、無 DOM 以外的依賴。 */

/** 錄音長度顯示（便簽上）：最短顯示 0.1 秒。 */
export function formatDuration(milliseconds) {
  return `${Math.max(0.1, milliseconds / 1000).toFixed(1)} 秒`;
}

/** 錄音計時器顯示：上限 15 秒。 */
export function formatTimer(milliseconds) {
  const seconds = Math.min(15, Math.floor(milliseconds / 1000));
  return `00:${String(seconds).padStart(2, "0")} / 00:15`;
}

/** 收藏夾的時間戳顯示。 */
export function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-Hant", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

/** 把任意文字轉成可安全插入 innerHTML 的字串。 */
export function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

/** [min, max) 區間隨機數。 */
export function randBetween(min, max) { return min + Math.random() * (max - min); }
