import { state } from "./state.js";
import { createWaveform, elements, refreshIcons } from "./elements.js";
import "./styles/main.css";
import { playNoteRecording } from "./services/audio.js";
import {
  clearRecordingTimer,
  resetRecorder,
  startRecording,
  stopRecording,
  stopTracks,
} from "./services/recorder.js";
import { spawnWelcomeDecor } from "./features/decor.js";
import {
  beginDrag,
  endDrag,
  moveDrag,
} from "./features/note.js";
import {
  beginPhotoDrag,
  captureCameraPhoto,
  closePhotoSheet,
  endPhotoDrag,
  finalizeSave,
  handlePhoto,
  layoutPhoto,
  movePhotoDrag,
  startCamera,
  stopCamera,
} from "./features/photo.js";
import {
  applyCardLayout,
  beginCardDrag,
  clearHistory,
  closeHistory,
  closePhotoReveal,
  endCardDrag,
  handleHistoryClick,
  initCardLayout,
  moveCardDrag,
  openHistory,
} from "./features/history.js";
import { updateHistoryCount } from "./services/records.js";

/*
 * 應用入口：集中綁定所有 DOM 事件，並在啟動時做一次性初始化。
 * 各領域邏輯分別住在 services/（錄音、儲存、播放）與 features/（便簽、拍照、收藏夾）。
 */

/* ── 歡迎頁 ↔ 主畫面 ── */
elements.startButton.addEventListener("click", () => {
  elements.welcomeScreen.classList.add("hidden");
  elements.appScreen.classList.remove("hidden");
  elements.recordButton.focus();
});
elements.homeButton.addEventListener("click", () => {
  resetRecorder();
  elements.appScreen.classList.add("hidden");
  elements.welcomeScreen.classList.remove("hidden");
  elements.startButton.focus();
});

/* ── 錄音鍵：按住錄音、放開結束；鍵盤以空白鍵 / Enter 操作 ── */
function endPress() {
  state.pressHeld = false;
  if (state.appState === "recording") stopRecording();
}
elements.recordButton.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.preventDefault();
  state.pressHeld = true;
  try { elements.recordButton.setPointerCapture(event.pointerId); } catch { /* 忽略不支援的環境 */ }
  if (state.appState === "idle") startRecording();
});
elements.recordButton.addEventListener("pointerup", endPress);
elements.recordButton.addEventListener("pointercancel", endPress);
elements.recordButton.addEventListener("lostpointercapture", endPress);
elements.recordButton.addEventListener("keydown", (event) => {
  if (event.repeat || (event.key !== " " && event.key !== "Enter")) return;
  if (state.appState === "idle") { event.preventDefault(); state.pressHeld = true; startRecording(); }
});
elements.recordButton.addEventListener("keyup", (event) => {
  if (event.key !== " " && event.key !== "Enter") return;
  if (state.appState === "recording") { event.preventDefault(); endPress(); }
});
elements.againButton.addEventListener("click", resetRecorder);
elements.failRetryButton.addEventListener("click", resetRecorder);
elements.resultRetryButton.addEventListener("click", resetRecorder);

/* ── 便簽：左右滑手勢與試聽 ── */
elements.noteWaveButton.addEventListener("click", playNoteRecording);
elements.note.addEventListener("pointerdown", beginDrag);
elements.note.addEventListener("pointermove", moveDrag);
elements.note.addEventListener("pointerup", endDrag);
elements.note.addEventListener("pointercancel", endDrag);

/* ── 拍照面板 ── */
elements.choosePhotoButton.addEventListener("click", () => elements.photoInput.click());
elements.photoInput.addEventListener("change", () => handlePhoto(elements.photoInput.files[0]));
elements.photoFrame.addEventListener("pointerdown", beginPhotoDrag);
elements.photoFrame.addEventListener("pointermove", movePhotoDrag);
elements.photoFrame.addEventListener("pointerup", endPhotoDrag);
elements.photoFrame.addEventListener("pointercancel", endPhotoDrag);
window.addEventListener("resize", () => {
  if (elements.photoFrame.classList.contains("visible")) layoutPhoto();
});
elements.cameraButton.addEventListener("click", startCamera);
elements.cameraInput.addEventListener("change", () => handlePhoto(elements.cameraInput.files[0]));
elements.shutterButton.addEventListener("click", captureCameraPhoto);
elements.closeCameraButton.addEventListener("click", stopCamera);
elements.confirmSaveButton.addEventListener("click", finalizeSave);
elements.cancelPhotoButton.addEventListener("click", () => closePhotoSheet(true));
elements.photoOverlay.addEventListener("click", (event) => { if (event.target === elements.photoOverlay) closePhotoSheet(true); });

/* ── 收藏夾 ── */
elements.historyButton.addEventListener("click", openHistory);
elements.closeHistoryButton.addEventListener("click", closeHistory);
// 收藏夾內只有清單（含卡片內文）可捲動，其他區域的拖曳一律擋下，避免整頁跟著滑動
elements.historyOverlay.addEventListener("touchmove", (event) => {
  if (!event.target.closest(".history-list")) event.preventDefault();
}, { passive: false });
elements.historyOverlay.addEventListener("click", (event) => {
  if (event.target === elements.historyOverlay) elements.closeHistoryButton.click();
});
elements.historyList.addEventListener("pointerdown", beginCardDrag);
elements.historyList.addEventListener("pointermove", moveCardDrag);
elements.historyList.addEventListener("pointerup", endCardDrag);
elements.historyList.addEventListener("pointercancel", endCardDrag);
elements.historyList.addEventListener("click", handleHistoryClick);
// 點浮層背景或拍立得照片關閉大圖
elements.photoReveal.addEventListener("click", closePhotoReveal);
elements.clearHistoryButton.addEventListener("click", clearHistory);
elements.layoutOneButton.addEventListener("click", () => applyCardLayout("one", true));
elements.layoutTwoButton.addEventListener("click", () => applyCardLayout("two", true));

/* ── 離開頁面時釋放資源 ── */
window.addEventListener("pagehide", () => {
  clearRecordingTimer();
  if (state.appState === "recording") stopRecording();
  stopTracks();
  if (state.activeAudio) state.activeAudio.pause();
});

/* ── 啟動初始化 ── */
spawnWelcomeDecor();
createWaveform();
refreshIcons();
updateHistoryCount();
initCardLayout();
resetRecorder();
