import { state } from "../state.js";
import { elements, refreshIcons } from "../elements.js";
import { ASSETS } from "../assets.js";
import { formatTimer } from "../utils/format.js";
import { setStatus, showView } from "./screens.js";
import { showToast } from "../features/toast.js";
import { generateResult } from "../features/translator.js";

/*
 * 錄音流程：getUserMedia → AudioContext ScriptProcessor 收集 PCM，
 * 停止後以 encodeWavBlob 封裝成 WAV。
 * （不使用 MediaRecorder：部分環境可錄但無法解碼其輸出，WAV 最穩。）
 */

const MAX_DURATION = 15000;

/* 模組私有錄音狀態；跨模組的只有 state.appState。 */
let recorder = null;
let audioStream = null;
let audioChunks = [];
let recordingStartedAt = 0;
let recordingTimer = null;

/** 回到 idle，清空進行中的結果與錄音資源。 */
export function resetRecorder() {
  state.appState = "idle";
  state.currentRecord = null;
  state.pendingPhoto = null;
  if (recorder) {
    try {
      recorder.source.disconnect();
      recorder.processor.disconnect();
      recorder.muteGain.disconnect();
      void recorder.context.close();
    } catch { /* 忽略已關閉的音訊情境 */ }
    recorder = null;
  }
  elements.timer.textContent = "00:00 / 00:15";
  elements.recordButton.classList.remove("recording");
  elements.recordDog.src = ASSETS.ready;
  elements.recordButton.setAttribute("aria-label", "按住錄音，放開結束");
  elements.recordLabel.innerHTML = "press to record<span class=\"record-hint\">最短 1 秒，最長 15 秒</span>";
  elements.waveform.classList.remove("active");
  setStatus("ready", "準備好了");
  showView("recorder");
  refreshIcons();
}

/** 停止麥克風軌道。 */
export function stopTracks() {
  if (audioStream) audioStream.getTracks().forEach((track) => track.stop());
  audioStream = null;
}

export function clearRecordingTimer() {
  window.clearInterval(recordingTimer);
  recordingTimer = null;
}

export async function startRecording() {
  if (state.appState !== "idle") return;
  if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
    showToast("目前環境無法使用麥克風，已為你開啟試玩", null, 2600);
    generateResult(null, 3200);
    return;
  }

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaStreamSource(audioStream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const muteGain = context.createGain();
    muteGain.gain.value = 0;
    audioChunks = [];
    processor.onaudioprocess = (event) => {
      audioChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(muteGain);
    muteGain.connect(context.destination);
    recorder = { context, source, processor, muteGain };
    recordingStartedAt = performance.now();
    state.appState = "recording";
    elements.recordButton.classList.add("recording");
    elements.recordDog.src = ASSETS.press;
    elements.recordButton.setAttribute("aria-label", "放開結束錄音");
    elements.recordLabel.innerHTML = "listening...<span class=\"record-hint\">放開完成錄音</span>";
    elements.waveform.classList.add("active");
    setStatus("recording", "正在聽你的小狗說話");
    recordingTimer = window.setInterval(() => {
      const elapsed = performance.now() - recordingStartedAt;
      elements.timer.textContent = formatTimer(elapsed);
      if (elapsed >= MAX_DURATION) stopRecording();
    }, 100);
    // 非按住觸發（例如部分瀏覽器的事件順序差異）時立即停止，避免卡在錄音中。
    if (!state.pressHeld) stopRecording();
  } catch (error) {
    stopTracks();
    resetRecorder();
    showToast(error?.name === "NotAllowedError" ? "需要麥克風權限才能錄音" : "暫時無法啟動麥克風", null, 2800);
  }
}

export function stopRecording() {
  if (state.appState !== "recording" || !recorder) return;
  state.appState = "stopping";
  clearRecordingTimer();
  finishRecording();
}

function finishRecording() {
  const duration = Math.min(MAX_DURATION, performance.now() - recordingStartedAt);
  const audioBlob = audioChunks.length && recorder ? encodeWavBlob(audioChunks, recorder.context.sampleRate) : null;
  if (recorder) {
    try {
      recorder.source.disconnect();
      recorder.processor.disconnect();
      recorder.muteGain.disconnect();
      void recorder.context.close();
    } catch { /* 忽略已關閉的音訊情境 */ }
    recorder = null;
  }
  stopTracks();
  elements.waveform.classList.remove("active");
  if (duration < 1000) {
    resetRecorder();
    showToast("錄音至少要 1 秒，再試一次吧", null, 2600);
    return;
  }
  generateResult(audioBlob, duration);
}

/** 把 PCM 樣本封裝成 16-bit WAV Blob。 */
function encodeWavBlob(chunks, sampleRate) {
  let length = 0;
  chunks.forEach((chunk) => { length += chunk.length; });
  const view = new DataView(new ArrayBuffer(44 + length * 2));
  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2, true);
  let offset = 44;
  chunks.forEach((chunk) => {
    for (let i = 0; i < chunk.length; i += 1, offset += 2) {
      const sample = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
  });
  return new Blob([view], { type: "audio/wav" });
}
