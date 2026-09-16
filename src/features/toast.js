import { elements } from "../elements.js";

/** Toast 提示：可帶一個動作按鈕（如「復原」）與倒數進度條。 */
let toastTimer = null;

export function showToast(text, action, duration = 2400, countdown = false) {
  window.clearTimeout(toastTimer);
  elements.toastText.textContent = text;
  elements.toastAction.style.display = action ? "block" : "none";
  elements.toastAction.onclick = action || null;
  elements.toastProgress.className = `toast-progress${countdown ? " countdown" : ""}`;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(hideToast, duration);
}

export function hideToast() {
  elements.toast.classList.remove("visible");
}
