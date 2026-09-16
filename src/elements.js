import {
  ArrowLeft,
  ArrowRight,
  Bone,
  Bookmark,
  Camera,
  Check,
  Folder,
  Heart,
  House,
  Image,
  LayoutGrid,
  LayoutList,
  NotebookTabs,
  Pause,
  Play,
  Sparkles,
  Trash2,
  X,
  createIcons,
} from "lucide";

/*
 * DOM 元素快取：集中列出所有用到的 id，
 * 新增畫面元素時在這裡登記，其他模組统一從 elements 取用。
 */
export const elements = Object.fromEntries(
  [
    "welcomeScreen", "startButton", "appScreen", "homeButton", "recordDog",
    "status", "statusText", "timer", "recorderPanel", "waveform", "recordButton", "recordLabel", "noteWaveButton",
    "generatingPanel", "generatingTitle", "resultPanel", "swipeShell", "note", "noteCategory", "noteTime",
    "noteText", "noteDuration", "saveAction", "deleteAction", "savedPanel", "againButton", "historyButton",
    "failPanel", "failRetryButton", "privacyNote",
    "resultRetryButton",
    "historyCount", "photoOverlay", "photoSheet", "photoInput", "cameraInput", "photoFrame", "photoPreview",
    "choosePhotoButton", "cameraButton", "cameraView", "cameraStream", "shutterButton", "closeCameraButton",
    "confirmSaveButton", "cancelPhotoButton", "historyOverlay", "closeHistoryButton", "historyList",
    "photoReveal", "photoRevealImage",
    "layoutOneButton", "layoutTwoButton",
    "clearHistoryButton", "toast", "toastText", "toastAction", "toastProgress",
  ].map((id) => [id, document.getElementById(id)])
);

/* 專案實際用到的 lucide 圖示；新增圖示時在這裡補 import。 */
const icons = {
  ArrowLeft, ArrowRight, Bone, Bookmark, Camera, Check, Folder, Heart,
  House, Image, LayoutGrid, LayoutList, NotebookTabs, Pause, Play, Sparkles, Trash2, X,
};

/** 重新掃描 data-lucide 並渲染圖示（動態插入 HTML 後要呼叫）。 */
export function refreshIcons() {
  createIcons({ icons, attrs: { "stroke-width": 2 } });
}

/** 建立錄音面板的 19 條動態波形。 */
export function createWaveform() {
  elements.waveform.innerHTML = Array.from({ length: 19 }, (_, index) => `<span style="--i:${index}"></span>`).join("");
}
