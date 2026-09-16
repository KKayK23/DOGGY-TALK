import { elements } from "../elements.js";

/** 畫面層共用小工具：狀態列文字與主畫面面板切換。 */

/** 更新頂部狀態膠囊（kind 決定顏色：ready / recording / generating）。 */
export function setStatus(kind, text) {
  elements.status.className = `status ${kind}`;
  elements.statusText.textContent = text;
}

/** 切換主畫面五個面板（recorder / generating / result / saved / fail）。 */
export function showView(view) {
  elements.recorderPanel.classList.toggle("hidden", view !== "recorder");
  elements.generatingPanel.classList.toggle("visible", view === "generating");
  elements.resultPanel.classList.toggle("visible", view === "result");
  elements.savedPanel.classList.toggle("visible", view === "saved");
  elements.failPanel.classList.toggle("visible", view === "fail");
  elements.appScreen.classList.toggle("fail-bg", view === "fail");
  elements.privacyNote.style.visibility = view === "recorder" ? "visible" : "hidden";
  elements.timer.style.visibility = view === "recorder" ? "visible" : "hidden";
}
