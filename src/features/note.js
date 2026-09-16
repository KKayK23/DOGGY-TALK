import { state } from "../state.js";
import { elements } from "../elements.js";
import { evaluateGesture } from "../utils/gesture.js";
import { setStatus, showView } from "../services/screens.js";
import { hideToast, showToast } from "./toast.js";
import { renderCurrentNote } from "./translator.js";
import { openPhotoSheet } from "./photo.js";

/*
 * 便簽手勢：右滑 = 儲存（進拍照流程）、左滑 = 刪除（3 秒內可復原）。
 * 只在 pending 狀態接受手勢；播放鈕上的按下不啟動拖曳。
 */
let drag = null;
let undoRecord = null;
let undoTimer = null;

export function beginDrag(event) {
  if (state.appState !== "pending" || !event.isPrimary) return;
  if (event.target.closest?.(".note-wave")) return;
  drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startedAt: performance.now(),
    lock: null,
    deltaX: 0,
    deltaY: 0,
  };
  try { elements.note.setPointerCapture?.(event.pointerId); } catch { /* 忽略合成事件或不支援的環境 */ }
  elements.note.classList.remove("animated");
  elements.note.classList.add("dragging");
}

export function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId || state.appState !== "pending") return;
  drag.deltaX = event.clientX - drag.startX;
  drag.deltaY = event.clientY - drag.startY;
  const result = evaluateGesture(drag.deltaX, drag.deltaY, performance.now() - drag.startedAt, elements.swipeShell.clientWidth);
  if (!drag.lock && result.lock) drag.lock = result.lock;
  if (drag.lock !== "horizontal") return;
  event.preventDefault();
  const resistance = Math.min(elements.swipeShell.clientWidth * 0.58, Math.abs(drag.deltaX));
  const translated = Math.sign(drag.deltaX) * resistance;
  elements.note.style.transform = `translateX(${translated}px) rotate(var(--note-tilt))`;
  elements.saveAction.classList.toggle("active", drag.deltaX > 0 && result.progress >= 1);
  elements.deleteAction.classList.toggle("active", drag.deltaX < 0 && result.progress >= 1);
}

export function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId || state.appState !== "pending") return;
  const completedDrag = drag;
  drag = null;
  elements.note.classList.remove("dragging");
  elements.note.classList.add("animated");
  const result = evaluateGesture(completedDrag.deltaX, completedDrag.deltaY, performance.now() - completedDrag.startedAt, elements.swipeShell.clientWidth);
  if (completedDrag.lock === "horizontal" && result.trigger) {
    performSwipeAction(result.trigger);
  } else {
    elements.note.style.transform = "translateX(0px) rotate(var(--note-tilt))";
    elements.saveAction.classList.remove("active");
    elements.deleteAction.classList.remove("active");
  }
}

function performSwipeAction(action) {
  if (state.appState !== "pending") return;
  state.appState = action === "save" ? "saving" : "deleting";
  const target = action === "save" ? window.innerWidth : -window.innerWidth;
  elements.note.style.transform = `translateX(${target}px) rotate(var(--note-tilt))`;
  window.setTimeout(() => {
    if (action === "save") openPhotoSheet();
    else deletePendingNote();
  }, 220);
}

function deletePendingNote() {
  undoRecord = state.currentRecord;
  state.currentRecord = null;
  state.appState = "idle";
  showView("recorder");
  setStatus("ready", "準備好了");
  showToast("便簽已刪除", undoDelete, 3000, true);
  window.clearTimeout(undoTimer);
  undoTimer = window.setTimeout(() => { undoRecord = null; }, 3000);
}

function undoDelete() {
  if (!undoRecord) return;
  window.clearTimeout(undoTimer);
  state.currentRecord = undoRecord;
  undoRecord = null;
  state.appState = "pending";
  renderCurrentNote();
  showView("result");
  setStatus("ready", "翻譯完成");
  hideToast();
}
