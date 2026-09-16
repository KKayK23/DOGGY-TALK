import { state } from "../state.js";
import { elements } from "../elements.js";
import { phrases } from "../data/phrases.js";
import { formatDate, formatDuration } from "../utils/format.js";
import { setStatus, showView } from "../services/screens.js";
import { resetNotePlayButton } from "../services/audio.js";

/*
 * 「翻譯」流程：從文案庫隨機抽一句（避開最近抽過的），
 * 播放固定時長的翻譯動畫後產生便簽。結果與錄音內容純屬娛樂關聯。
 */

const RECENT_KEY = "doggy-talk-recent-v1";

/** 隨機挑一句文案，並把該 id 記入最近使用（保留 5 筆）。 */
function pickMessage() {
  const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  let candidates = phrases.filter((phrase) => !recent.includes(phrase.id));
  if (!candidates.length) candidates = phrases;
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  localStorage.setItem(RECENT_KEY, JSON.stringify([selected.id, ...recent.filter((id) => id !== selected.id)].slice(0, 5)));
  return selected;
}

/** 顯示翻譯動畫；約 18% 機率失敗進入 fail 畫面，其餘產生便簽。 */
export function generateResult(audioBlob, duration) {
  if (["generating", "pending", "saving"].includes(state.appState)) return;
  state.appState = "generating";
  setStatus("generating", "正在翻譯汪語");
  showView("generating");
  const loadingLines = ["正在翻譯汪語", "整理今天的悄悄話", "快要聽懂了"];
  elements.generatingTitle.textContent = loadingLines[Math.floor(Math.random() * loadingLines.length)];
  window.setTimeout(() => {
    if (Math.random() < 0.18) {
      state.appState = "idle";
      setStatus("ready", "翻譯失敗");
      showView("fail");
      return;
    }
    const message = pickMessage();
    state.currentRecord = {
      id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      messageId: message.id,
      category: message.category,
      text: message.text,
      duration,
      createdAt: Date.now(),
      audioBlob,
    };
    state.appState = "pending";
    renderCurrentNote();
    setStatus("ready", "翻譯完成");
    showView("result");
  }, 1450);
}

/** 把 state.currentRecord 渲染到便簽上。 */
export function renderCurrentNote() {
  const record = state.currentRecord;
  if (!record) return;
  elements.noteCategory.textContent = record.category;
  elements.noteText.textContent = record.text;
  elements.noteTime.textContent = formatDate(record.createdAt);
  elements.noteDuration.textContent = formatDuration(record.duration);
  resetNotePlayButton();
  elements.noteWaveButton.style.visibility = record.audioBlob ? "visible" : "hidden";
  elements.note.classList.remove("animated", "dragging");
  elements.note.style.transform = "translateX(0px) rotate(var(--note-tilt))";
  elements.saveAction.classList.remove("active");
  elements.deleteAction.classList.remove("active");
}
