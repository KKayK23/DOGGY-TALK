import { state } from "../state.js";
import { elements } from "../elements.js";
import { setStatus, showView } from "../services/screens.js";
import { showToast } from "./toast.js";
import { renderCurrentNote } from "./translator.js";
import { getRecords, setRecords } from "../services/records.js";
import { storeMedia } from "../services/db.js";

/*
 * 儲存流程的拍照面板：拍照 / 選圖（可略過）→ 拖曳構圖 → 確認儲存。
 * 照片會依面板構圖裁切壓縮後存進 IndexedDB。
 */
let cameraStream = null;
let photoOffset = { x: 0, y: 0 };
let photoDrag = null;

export function openPhotoSheet() {
  state.pendingPhoto = null;
  elements.photoInput.value = "";
  elements.cameraInput.value = "";
  stopCamera();
  elements.photoPreview.removeAttribute("src");
  elements.photoPreview.removeAttribute("style");
  photoOffset.x = 0;
  photoOffset.y = 0;
  elements.photoFrame.classList.remove("visible");
  elements.photoOverlay.classList.add("visible");
  elements.choosePhotoButton.focus();
}

export function closePhotoSheet(restoreNote = true) {
  stopCamera();
  elements.photoOverlay.classList.remove("visible");
  if (restoreNote && state.currentRecord) {
    state.appState = "pending";
    renderCurrentNote();
  }
}

export function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    elements.cameraInput.click();
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
    .then((stream) => {
      cameraStream = stream;
      elements.cameraStream.srcObject = stream;
      elements.photoSheet.classList.add("camera-active");
      elements.cameraView.classList.add("visible");
    })
    .catch(() => elements.cameraInput.click());
}

export function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  elements.cameraStream.srcObject = null;
  elements.photoSheet.classList.remove("camera-active");
  elements.cameraView.classList.remove("visible");
}

export function captureCameraPhoto() {
  const video = elements.cameraStream;
  if (!cameraStream || !video.videoWidth) return;
  const canvas = document.createElement("canvas");
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    stopCamera();
    if (blob) acceptPhoto(blob);
  }, "image/jpeg", 0.92);
}

export function handlePhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("請選擇一張圖片", null, 2200);
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast("照片請小於 8 MB", null, 2400);
    return;
  }
  acceptPhoto(file);
}

function acceptPhoto(file) {
  state.pendingPhoto = file;
  if (elements.photoPreview.src) URL.revokeObjectURL(elements.photoPreview.src);
  elements.photoPreview.onload = () => {
    photoOffset.x = 0;
    photoOffset.y = 0;
    layoutPhoto();
  };
  elements.photoPreview.src = URL.createObjectURL(file);
  elements.photoFrame.classList.add("visible");
}

/** 依面板大小鋪滿照片，並把拖曳位移限制在合理範圍。 */
export function layoutPhoto() {
  const img = elements.photoPreview;
  const frame = elements.photoFrame;
  if (!img.naturalWidth || !frame.clientWidth) return;
  const frameW = frame.clientWidth;
  const frameH = frame.clientHeight;
  const scale = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  img.style.width = `${drawW}px`;
  img.style.height = `${drawH}px`;
  const maxX = Math.max(0, (drawW - frameW) / 2);
  const maxY = Math.max(0, (drawH - frameH) / 2);
  photoOffset.x = Math.min(maxX, Math.max(-maxX, photoOffset.x));
  photoOffset.y = Math.min(maxY, Math.max(-maxY, photoOffset.y));
  img.style.transform = `translate(calc(-50% + ${photoOffset.x}px), calc(-50% + ${photoOffset.y}px))`;
}

export function beginPhotoDrag(event) {
  if (!elements.photoFrame.classList.contains("visible") || !event.isPrimary) return;
  photoDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseX: photoOffset.x, baseY: photoOffset.y };
  try { elements.photoFrame.setPointerCapture?.(event.pointerId); } catch { /* 忽略合成事件或不支援的環境 */ }
  elements.photoFrame.classList.add("dragging");
}

export function movePhotoDrag(event) {
  if (!photoDrag || event.pointerId !== photoDrag.pointerId) return;
  photoOffset.x = photoDrag.baseX + (event.clientX - photoDrag.startX);
  photoOffset.y = photoDrag.baseY + (event.clientY - photoDrag.startY);
  layoutPhoto();
}

export function endPhotoDrag(event) {
  if (!photoDrag || event.pointerId !== photoDrag.pointerId) return;
  photoDrag = null;
  elements.photoFrame.classList.remove("dragging");
}

/** 依目前構圖把照片裁成面板比例的 JPEG；失敗時退回原始檔。 */
async function buildCroppedPhoto() {
  if (!state.pendingPhoto) return null;
  const img = elements.photoPreview;
  const frame = elements.photoFrame;
  if (!img.naturalWidth || !frame.clientWidth) return state.pendingPhoto;
  try {
    const frameW = frame.clientWidth;
    const frameH = frame.clientHeight;
    const scale = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight);
    const srcW = frameW / scale;
    const srcH = frameH / scale;
    const srcX = Math.min(Math.max(img.naturalWidth / 2 - photoOffset.x / scale - srcW / 2, 0), img.naturalWidth - srcW);
    const srcY = Math.min(Math.max(img.naturalHeight / 2 - photoOffset.y / scale - srcH / 2, 0), img.naturalHeight - srcH);
    const canvas = document.createElement("canvas");
    const outW = Math.min(1600, Math.max(600, Math.round(frameW * 2)));
    canvas.width = outW;
    canvas.height = Math.round(outW * frameH / frameW);
    canvas.getContext("2d").drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return blob || state.pendingPhoto;
  } catch {
    return state.pendingPhoto;
  }
}

/** 確認儲存：媒體入 IndexedDB、中繼資料入 localStorage，完成後進 saved 畫面。 */
export async function finalizeSave() {
  if (!state.currentRecord || state.appState !== "saving") return;
  const photoToStore = await buildCroppedPhoto();
  const record = { ...state.currentRecord, hasAudio: Boolean(state.currentRecord.audioBlob), hasPhoto: Boolean(photoToStore) };
  try {
    await Promise.all([storeMedia(`${record.id}:audio`, record.audioBlob), storeMedia(`${record.id}:photo`, photoToStore)]);
  } catch {
    showToast("媒體儲存失敗，請再試一次", null, 2800);
    return;
  }
  const records = getRecords();
  records.unshift({
    id: record.id,
    messageId: record.messageId,
    category: record.category,
    text: record.text,
    duration: record.duration,
    createdAt: record.createdAt,
    savedAt: Date.now(),
    hasAudio: record.hasAudio,
    hasPhoto: record.hasPhoto,
  });
  setRecords(records);
  elements.photoOverlay.classList.remove("visible");
  state.currentRecord = null;
  state.pendingPhoto = null;
  state.appState = "saved";
  setStatus("ready", "已儲存");
  showView("saved");
}
