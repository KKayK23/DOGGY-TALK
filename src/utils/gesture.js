/**
 * 便簽左右滑手勢判定。
 * 純函數：輸入位移、經過時間與容器寬度，輸出鎖定方向、觸發動作與進度。
 */
export function evaluateGesture(deltaX, deltaY, elapsed, width) {
  const distance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);
  if (Math.max(distance, verticalDistance) < 8) return { lock: null, trigger: null, progress: 0 };
  if (distance < verticalDistance * 1.2) return { lock: "vertical", trigger: null, progress: 0 };
  const speed = distance / Math.max(elapsed, 1);
  const reachedDistance = distance >= width * 0.28;
  const reachedFlick = distance >= 56 && speed >= 0.5;
  return {
    lock: "horizontal",
    trigger: reachedDistance || reachedFlick ? (deltaX < 0 ? "delete" : "save") : null,
    progress: Math.min(1, distance / (width * 0.28)),
  };
}
