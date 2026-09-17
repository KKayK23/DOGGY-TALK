import { state } from "../state.js";
import { elements, refreshIcons } from "../elements.js";
import { getRecords, setRecords, markHistoryRead } from "../services/records.js";
import { deleteMedia, getMedia, storeMedia } from "../services/db.js";
import { stopActiveAudio, playRecordAudio } from "../services/audio.js";
import { showToast } from "./toast.js";
import { escapeHtml, formatDate, formatDuration } from "../utils/format.js";

/*
 * 收藏夾：清單渲染、單欄/雙欄排版、卡片左滑刪除（pointer 拖曳）、
 * 拍立得大圖檢視、單筆刪除與全部清除。
 */

const CARD_LAYOUT_KEY = "doggy-talk-card-layout";

/* 卡片左滑參數：最大滑開距離與吸附門檻（px）。 */
const SWIPE = { max: 92, snap: 56 };

/* 模組私有拖曳狀態。 */
let cardDrag = null;
let cardDragHandled = false;
let revealPhotoUrl = null;

/* ── 排版切換 ─────────────────────────────────────────── */

/** one = 單欄直排，two = 雙欄並排；卡片均維持固定大小。 */
export function applyCardLayout(layout, persist) {
  const two = layout === "two";
  elements.historyList.classList.toggle("two-cols", two);
  elements.layoutOneButton.classList.toggle("active", !two);
  elements.layoutOneButton.setAttribute("aria-pressed", String(!two));
  elements.layoutTwoButton.classList.toggle("active", two);
  elements.layoutTwoButton.setAttribute("aria-pressed", String(two));
  if (persist) {
    try { localStorage.setItem(CARD_LAYOUT_KEY, layout); } catch { /* 忽略儲存失敗 */ }
  }
}

/** 啟動時還原上次的排版選擇。 */
export function initCardLayout() {
  let savedLayout = "one";
  try { savedLayout = localStorage.getItem(CARD_LAYOUT_KEY) || "one"; } catch { /* 讀不到就用預設 */ }
  applyCardLayout(savedLayout === "two" ? "two" : "one", false);
}

/* ── 清單渲染 ─────────────────────────────────────────── */

export async function renderHistory() {
  const records = getRecords();
  resetCardSwipes();
  elements.clearHistoryButton.style.visibility = records.length ? "visible" : "hidden";
  if (!records.length) {
    elements.historyList.innerHTML = `<div class="history-empty"><div><i data-lucide="notebook-tabs" size="34"></i><p>還沒有收藏的悄悄話</p></div></div>`;
    refreshIcons();
    return;
  }
  elements.historyList.innerHTML = records.map((record) => `
    <article class="history-card" data-id="${record.id}">
      <div class="card-actions">
        <button class="remove" type="button" aria-label="刪除記錄" title="刪除記錄"><i data-lucide="trash-2" size="20"></i></button>
      </div>
      <div class="history-slide">
        <div class="history-copy">
          <div class="history-top">
            <button class="meta-like like${record.liked ? " liked" : ""}" type="button" aria-pressed="${record.liked ? "true" : "false"}" aria-label="加入最愛" title="加入最愛"><i data-lucide="heart" size="16"></i></button>
            <small>${record.category}</small>
          </div>
          <p>${escapeHtml(record.text)}</p>
          <div class="history-meta">
            <button class="meta-play play" type="button" aria-label="播放錄音" title="播放錄音" ${record.hasAudio ? "" : "disabled"}><i data-lucide="play" size="16"></i></button>
            <span>${formatDuration(record.duration)}</span><span>${formatDate(record.createdAt)}</span>
          </div>
        </div>
        ${record.hasPhoto ? `
        <button class="photo-thumb" type="button" aria-haspopup="true" aria-label="展開照片"><span class="thumb-empty"></span></button>` : `
        <button class="photo-thumb add-photo" type="button" aria-label="幫這則記錄加上照片" title="加照片"><i data-lucide="image-plus" aria-hidden="true"></i></button>`}
      </div>
    </article>`).join("");
  refreshIcons();
}

/* ── 卡片左滑刪除：pointer 拖曳 .history-slide，露出底層刪除按鈕 ── */

function swipedCards() {
  return elements.historyList.querySelectorAll(".history-card.swiped");
}

/** 帶動畫地把卡片便簽層停在某個位移（0 = 收回）。 */
function animateCardSlide(card, offset) {
  const slide = card.querySelector(".history-slide");
  if (!slide) return;
  slide.classList.remove("dragging");
  slide.classList.add("animated");
  slide.style.transform = offset ? `translateX(${offset}px)` : "";
  card.classList.toggle("swiped", Boolean(offset));
  card.classList.remove("swiping");
  window.setTimeout(() => slide.classList.remove("animated"), 280);
}

function closeSwipedCard(card) {
  if (cardDrag && cardDrag.card === card) return;
  animateCardSlide(card, 0);
}

function closeAllSwipedCards(exceptCard) {
  swipedCards().forEach((card) => {
    if (card !== exceptCard) closeSwipedCard(card);
  });
}

export function beginCardDrag(event) {
  cardDragHandled = false;
  if (!event.isPrimary || cardDrag || (event.pointerType === "mouse" && event.button !== 0)) return;
  const slide = event.target.closest(".history-slide");
  if (!slide) return;
  // 刪除層露出時，點擊便簽收回卡片，不啟動拖曳
  if (slide.closest(".history-card").classList.contains("swiped")) return;
  closeAllSwipedCards(slide.closest(".history-card"));
  cardDrag = {
    pointerId: event.pointerId,
    slide,
    card: slide.closest(".history-card"),
    startX: event.clientX,
    startY: event.clientY,
    lock: null,
    offset: 0,
  };
}

export function moveCardDrag(event) {
  if (!cardDrag || event.pointerId !== cardDrag.pointerId) return;
  const dx = event.clientX - cardDrag.startX;
  const dy = event.clientY - cardDrag.startY;
  if (cardDrag.lock === null) {
    if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
    cardDrag.lock = Math.abs(dx) > Math.abs(dy) * 1.15 ? "horizontal" : "vertical";
    if (cardDrag.lock === "horizontal") {
      cardDragHandled = true;
      cardDrag.card.classList.add("swiping");
      cardDrag.slide.classList.add("dragging");
      cardDrag.slide.classList.remove("animated");
    }
  }
  if (cardDrag.lock !== "horizontal") return;
  cardDrag.offset = Math.max(-SWIPE.max, Math.min(SWIPE.max * 0.18, dx));
  cardDrag.slide.style.transform = `translateX(${cardDrag.offset}px)`;
  if (cardDrag.slide.setPointerCapture) {
    try { cardDrag.slide.setPointerCapture(event.pointerId); } catch { /* 忽略不支援的環境 */ }
  }
}

export function endCardDrag(event) {
  if (!cardDrag || event.pointerId !== cardDrag.pointerId) return;
  const { card, slide, lock, offset } = cardDrag;
  cardDrag = null;
  if (lock !== "horizontal") return;
  const settle = offset <= -SWIPE.snap ? -SWIPE.max : 0;
  animateCardSlide(card, settle);
}

function resetCardSwipes() {
  cardDrag = null;
  cardDragHandled = false;
  swipedCards().forEach((card) => animateCardSlide(card, 0));
}

/* ── 拍立得大圖檢視 ───────────────────────────────────── */

export function closePhotoReveal() {
  elements.photoReveal.classList.remove("open");
  elements.photoRevealImage.removeAttribute("src");
  if (revealPhotoUrl) {
    URL.revokeObjectURL(revealPhotoUrl);
    revealPhotoUrl = null;
  }
}

async function toggleCardPhoto(card) {
  const record = getRecords().find((item) => item.id === card.dataset.id);
  if (!record?.hasPhoto) return;
  if (elements.photoReveal.classList.contains("open")) {
    closePhotoReveal();
    return;
  }
  closeAllSwipedCards();
  elements.photoRevealImage.removeAttribute("src");
  elements.photoReveal.classList.add("open");
  try {
    const blob = await getMedia(`${record.id}:photo`);
    if (blob) {
      revealPhotoUrl = URL.createObjectURL(blob);
      elements.photoRevealImage.src = revealPhotoUrl;
      // 縮圖同步顯示同一張照片（把佔位 span 換成 img）
      const thumb = card.querySelector(".photo-thumb");
      if (thumb && !thumb.querySelector("img")) {
        thumb.innerHTML = `<img alt="這則記錄的小狗照片縮圖" src="${revealPhotoUrl}">`;
      }
    }
  } catch { /* 展開時若照片遺失就保持空白 */ }
}

/* ── 最愛切換：標記／取消喜歡這張便簽，狀態跟著紀錄清單一起持久化 ── */

function toggleRecordLike(record, button) {
  const records = getRecords();
  const target = records.find((item) => item.id === record.id);
  if (!target) return;
  target.liked = !target.liked;
  setRecords(records);
  button.classList.toggle("liked", Boolean(target.liked));
  button.setAttribute("aria-pressed", String(Boolean(target.liked)));
  showToast(target.liked ? "已加入最愛" : "已取消最愛", null, 1400);
}

/* ── 刪除 / 清除 ──────────────────────────────────────── */

async function removeHistoryRecord(recordId) {
  stopActiveAudio();
  const records = getRecords();
  setRecords(records.filter((record) => record.id !== recordId));
  await Promise.allSettled([deleteMedia(`${recordId}:audio`), deleteMedia(`${recordId}:photo`)]);
  await renderHistory();
  showToast("記錄已刪除", null, 2000);
}

export async function clearHistory() {
  stopActiveAudio();
  const records = getRecords();
  setRecords([]);
  await Promise.allSettled(records.flatMap((record) => [deleteMedia(`${record.id}:audio`), deleteMedia(`${record.id}:photo`)]));
  await renderHistory();
  showToast("歷史記錄已清除", null, 2200);
}

/* ── 開關收藏夾 ───────────────────────────────────────── */

export async function openHistory() {
  window.scrollTo(0, 0);
  markHistoryRead();
  document.body.classList.add("scroll-locked");
  elements.historyOverlay.classList.add("visible");
  await renderHistory();
  elements.closeHistoryButton.focus();
}

export function closeHistory() {
  stopActiveAudio();
  closePhotoReveal();
  elements.historyOverlay.classList.remove("visible");
  document.body.classList.remove("scroll-locked");
}

/* ── 收藏夾內的點擊分派 ───────────────────────────────── */

export async function handleHistoryClick(event) {
  const card = event.target.closest(".history-card");
  const button = event.target.closest("button");
  if (!card) return;
  const record = getRecords().find((item) => item.id === card.dataset.id);
  if (!record) return;
  if (button?.classList.contains("play")) { await playRecordAudio(record, button); return; }
  if (button?.classList.contains("remove")) { await removeHistoryRecord(record.id); return; }
  // 剛完成水平拖曳的 pointerup 會派生 click，先吃掉它，避免剛滑開的卡片被立刻收回
  if (cardDragHandled) { cardDragHandled = false; return; }
  // 卡片滑開（刪除層露出）時，點擊內文只負責收回卡片
  if (card.classList.contains("swiped")) { closeSwipedCard(card); return; }
  if (button?.classList.contains("like")) { toggleRecordLike(record, button); return; }
  if (button?.classList.contains("add-photo")) { openHistoryPhotoPicker(record.id); return; }
  if (button?.classList.contains("photo-thumb")) { await toggleCardPhoto(card); return; }
  if (record.hasPhoto) await toggleCardPhoto(card);
}

/* ── 補上傳照片：沒有照片的卡片可從收藏夾直接選圖加入 ── */

let pendingUploadId = null;

function openHistoryPhotoPicker(recordId) {
  closeAllSwipedCards();
  pendingUploadId = recordId;
  elements.historyPhotoInput.value = "";
  elements.historyPhotoInput.click();
}

/** 把圖片等比縮到最長邊 1600px 並壓成 JPEG（與儲存流程的照片規格一致）。 */
async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    // 已經是小張 JPEG 就直接用原檔，避免多一次轉檔失真
    if (scale >= 1 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return blob || file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 收藏夾上傳 input 的 change 入口：驗證、壓縮、存進 IndexedDB 後重繪卡片。 */
export async function handleHistoryPhotoUpload(file) {
  const recordId = pendingUploadId;
  pendingUploadId = null;
  if (!recordId || !file) return;
  if (!file.type.startsWith("image/")) {
    showToast("請選擇一張圖片", null, 2200);
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast("照片請小於 8 MB", null, 2400);
    return;
  }
  const records = getRecords();
  const record = records.find((item) => item.id === recordId);
  if (!record) return;
  let photoBlob = file;
  try {
    photoBlob = await compressImage(file);
  } catch {
    photoBlob = file; // 解碼失敗（如 HEIC）就保留原檔，交給支援的環境顯示
  }
  try {
    await storeMedia(`${recordId}:photo`, photoBlob);
  } catch {
    showToast("照片儲存失敗，請再試一次", null, 2800);
    return;
  }
  record.hasPhoto = true;
  setRecords(records);
  closePhotoReveal();
  await renderHistory();
  showToast("照片已加入這則記錄", null, 2000);
}
