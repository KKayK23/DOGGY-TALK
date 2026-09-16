import { ASSETS } from "../assets.js";
import { randBetween } from "../utils/format.js";

/*
 * 歡迎頁隨機小裝飾：隨機數量／大小／種類，
 * 先分析背景圖的透明像素，自動避開小狗本體與底部文字按鈕區。
 */
const DECO_TYPES = {
  paw: { src: ASSETS.paw, min: 22, max: 46, weight: 5 },
  bone: { src: ASSETS.bone, min: 40, max: 62, weight: 2.5 },
  ball: { src: ASSETS.ball, min: 26, max: 38, weight: 2.5 },
};
const DECO_ANIMS = {
  "deco-float": [3.6, 5.6],
  "deco-rock": [3, 4.6],
  "deco-bounce": [2, 3],
  "deco-spin": [8, 12],
  "deco-sway": [2.8, 4.2],
  "deco-wag": [1.4, 2.2],
  "deco-pulse": [2.4, 3.6],
};

export async function spawnWelcomeDecor() {
  const layer = document.querySelector(".welcome-decor");
  const art = document.querySelector(".welcome-art");
  if (!layer || !art) return;
  try { await art.decode(); } catch { return; }
  const W = layer.clientWidth || window.innerWidth, H = layer.clientHeight || window.innerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const sRatio = art.naturalWidth / art.naturalHeight, dRatio = W / H;
  let sw, sh, sx, sy;
  if (sRatio > dRatio) { sh = art.naturalHeight; sw = sh * dRatio; sx = (art.naturalWidth - sw) / 2; sy = 0; }
  else { sw = art.naturalWidth; sh = sw / dRatio; sx = 0; sy = (art.naturalHeight - sh) / 2; }
  ctx.drawImage(art, sx, sy, sw, sh, 0, 0, W, H);

  const overlapPct = (x, y, w, h) => {
    const data = ctx.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), Math.round(w), Math.round(h)).data;
    let occ = 0, n = 0;
    for (let i = 3; i < data.length; i += 12) { if (data[i] > 40) occ++; n++; }
    return n ? occ / n : 1;
  };

  // 收集空白格（排除底部文字與按鈕區）
  const cols = 8, rows = 16, cw = W / cols, ch = H / rows;
  const empty = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((r + 0.5) * ch > H - 215) continue;
    const data = ctx.getImageData(Math.round(c * cw), Math.round(r * ch), Math.ceil(cw), Math.ceil(ch)).data;
    let occ = 0, n = 0;
    for (let i = 3; i < data.length; i += 12) { if (data[i] > 40) occ++; n++; }
    if (occ / n <= 0.1) empty.push({ x: (c + 0.5) * cw, y: (r + 0.5) * ch });
  }
  if (!empty.length) return;

  const count = 4 + Math.floor(Math.random() * 4); // 隨機 4~7 個
  const typeKeys = Object.keys(DECO_TYPES);
  const totalWeight = typeKeys.reduce((s, k) => s + DECO_TYPES[k].weight, 0);
  const animKeys = Object.keys(DECO_ANIMS);
  const used = [];
  let guard = 0;

  while (used.length < count && guard++ < 80) {
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const x = Math.min(Math.max(cell.x + randBetween(-cw * 0.22, cw * 0.22), 30), W - 30);
    const y = Math.min(Math.max(cell.y + randBetween(-ch * 0.22, ch * 0.22), 30), H - 240);
    if (used.some((p) => Math.hypot(p.x - x, p.y - y) < 105)) continue;
    let pick = Math.random() * totalWeight, type = typeKeys[0];
    for (const k of typeKeys) { pick -= DECO_TYPES[k].weight; if (pick <= 0) { type = k; break; } }
    const spec = DECO_TYPES[type];
    const w = randBetween(spec.min, spec.max);
    if (overlapPct(x - w / 2, y - w / 2, w, w) > 0.08) continue; // 壓到小狗就換位置
    used.push({ x, y });
    let anim = animKeys[Math.floor(Math.random() * animKeys.length)];
    if (anim === "deco-spin" && type !== "ball") anim = "deco-sway"; // 旋轉只給圓形的球
    const [dMin, dMax] = DECO_ANIMS[anim];
    const slot = document.createElement("span");
    slot.className = "deco-slot";
    slot.style.left = `${x - w / 2}px`;
    slot.style.top = `${y - w / 2}px`;
    slot.style.width = `${w}px`;
    slot.style.transform = `rotate(${randBetween(-24, 24).toFixed(1)}deg)${type === "paw" && Math.random() < 0.5 ? " scaleX(-1)" : ""}`;
    const img = document.createElement("img");
    img.className = `deco ${anim}`;
    img.src = spec.src;
    img.alt = "";
    img.style.setProperty("--dur", `${randBetween(dMin, dMax).toFixed(2)}s`);
    img.style.setProperty("--delay", `${(-Math.random() * 4).toFixed(2)}s`);
    img.style.opacity = randBetween(0.45, 0.9).toFixed(2);
    slot.appendChild(img);
    layer.appendChild(slot);
  }
}
