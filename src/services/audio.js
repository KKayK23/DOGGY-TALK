import { state } from "../state.js";
import { elements, refreshIcons } from "../elements.js";
import { getMedia } from "./db.js";
import { showToast } from "../features/toast.js";

/*
 * 音訊播放協調：全站同時只允許一個 Audio（state.activeAudio）。
 * 便簽試聽（playNoteRecording）與收藏夾播放（playRecordAudio）都在這裡。
 */

/** Blob → data URL。檔案協定（file://）下 blob: 音訊無法播放，必須用 data URL。 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(blob);
  });
}

/** 停止並釋放目前播放中的音訊。 */
export function stopActiveAudio() {
  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio = null;
  }
}

/** 把便簽上的播放鈕恢復為未播放狀態。 */
export function resetNotePlayButton() {
  stopActiveAudio();
  elements.noteWaveButton.classList.remove("playing");
}

/** 播放目前便簽的錄音（再點一次 = 停止）。 */
export async function playNoteRecording() {
  const record = state.currentRecord;
  if (!record?.audioBlob) return;
  if (state.activeAudio) { resetNotePlayButton(); return; }
  try {
    const source = await blobToDataUrl(record.audioBlob);
    state.activeAudio = new Audio(source);
    elements.noteWaveButton.classList.add("playing");
    state.activeAudio.addEventListener("ended", () => resetNotePlayButton(), { once: true });
    state.activeAudio.addEventListener("error", () => resetNotePlayButton(), { once: true });
    await state.activeAudio.play();
  } catch {
    resetNotePlayButton();
    showToast("這段錄音暫時無法播放", null, 2400);
  }
}

/** 播放收藏夾某筆紀錄的錄音，並交換按鈕的播放/暫停圖示。 */
export async function playRecordAudio(record, button) {
  if (!record.hasAudio) return;
  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio = null;
    elements.historyList.querySelectorAll(".play").forEach((item) => {
      item.innerHTML = '<i data-lucide="play" size="16"></i>';
    });
    refreshIcons();
  }
  try {
    const blob = await getMedia(`${record.id}:audio`);
    if (!blob) throw new Error("Missing audio");
    state.activeAudio = new Audio(await blobToDataUrl(blob));
    button.innerHTML = '<i data-lucide="pause" size="16"></i>';
    refreshIcons();
    state.activeAudio.addEventListener("ended", () => {
      state.activeAudio = null;
      button.innerHTML = '<i data-lucide="play" size="16"></i>';
      refreshIcons();
    }, { once: true });
    await state.activeAudio.play();
  } catch {
    button.innerHTML = '<i data-lucide="play" size="16"></i>';
    refreshIcons();
    showToast("這段錄音暫時無法播放", null, 2400);
  }
}
