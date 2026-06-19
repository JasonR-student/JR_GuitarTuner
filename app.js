const GUITARS = {
  acoustic: {
    label: "民谣吉他",
    body: "#d78d42",
    edge: "#8b4f22",
    sound: "#2f1d13",
    accent: "#ffe7ba",
    strings: [
      { name: "6弦 E2", note: "E2", freq: 82.41 },
      { name: "5弦 A2", note: "A2", freq: 110.0 },
      { name: "4弦 D3", note: "D3", freq: 146.83 },
      { name: "3弦 G3", note: "G3", freq: 196.0 },
      { name: "2弦 B3", note: "B3", freq: 246.94 },
      { name: "1弦 E4", note: "E4", freq: 329.63 }
    ]
  },
  electric: {
    label: "电吉他",
    body: "#47a7ff",
    edge: "#0d458e",
    sound: "#f7f7f7",
    accent: "#111111",
    strings: [
      { name: "6弦 E2", note: "E2", freq: 82.41 },
      { name: "5弦 A2", note: "A2", freq: 110.0 },
      { name: "4弦 D3", note: "D3", freq: 146.83 },
      { name: "3弦 G3", note: "G3", freq: 196.0 },
      { name: "2弦 B3", note: "B3", freq: 246.94 },
      { name: "1弦 E4", note: "E4", freq: 329.63 }
    ]
  },
  classical: {
    label: "古典吉他",
    body: "#f0c777",
    edge: "#9b6629",
    sound: "#3f2414",
    accent: "#fff2ce",
    strings: [
      { name: "6弦 E2", note: "E2", freq: 82.41 },
      { name: "5弦 A2", note: "A2", freq: 110.0 },
      { name: "4弦 D3", note: "D3", freq: 146.83 },
      { name: "3弦 G3", note: "G3", freq: 196.0 },
      { name: "2弦 B3", note: "B3", freq: 246.94 },
      { name: "1弦 E4", note: "E4", freq: 329.63 }
    ]
  },
  seven: {
    label: "七弦吉他",
    body: "#6a55c7",
    edge: "#271b63",
    sound: "#111111",
    accent: "#d8ceff",
    strings: [
      { name: "7弦 B1", note: "B1", freq: 61.74 },
      { name: "6弦 E2", note: "E2", freq: 82.41 },
      { name: "5弦 A2", note: "A2", freq: 110.0 },
      { name: "4弦 D3", note: "D3", freq: 146.83 },
      { name: "3弦 G3", note: "G3", freq: 196.0 },
      { name: "2弦 B3", note: "B3", freq: 246.94 },
      { name: "1弦 E4", note: "E4", freq: 329.63 }
    ]
  },
  bass: {
    label: "贝斯吉他",
    body: "#13b38a",
    edge: "#075c48",
    sound: "#f6fffb",
    accent: "#111111",
    strings: [
      { name: "4弦 E1", note: "E1", freq: 41.2 },
      { name: "3弦 A1", note: "A1", freq: 55.0 },
      { name: "2弦 D2", note: "D2", freq: 73.42 },
      { name: "1弦 G2", note: "G2", freq: 98.0 }
    ]
  }
};

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const ACCEPTABLE_CENTS = 5;

const guitarType = document.querySelector("#guitarType");
const timbreType = document.querySelector("#timbreType");
const audioInput = document.querySelector("#audioInput");
const analyzeButton = document.querySelector("#analyzeButton");
const scoreInput = document.querySelector("#scoreInput");
const exportScoreButton = document.querySelector("#exportScoreButton");
const playFromScoreButton = document.querySelector("#playFromScoreButton");
const stopScoreButton = document.querySelector("#stopScoreButton");
const fileList = document.querySelector("#fileList");
const progressBar = document.querySelector("#progressBar");
const statusText = document.querySelector("#statusText");
const canvas = document.querySelector("#guitarCanvas");
const resultRibbon = document.querySelector("#resultRibbon");
const resultDialog = document.querySelector("#resultDialog");
const resultText = document.querySelector("#resultText");
const closeDialog = document.querySelector("#closeDialog");
const stringButtons = document.querySelector("#stringButtons");
const staffCanvas = document.querySelector("#staffCanvas");
const staffName = document.querySelector("#staffName");
const staffMeta = document.querySelector("#staffMeta");
const scoreSlider = document.querySelector("#scoreSlider");
const zoomOut = document.querySelector("#zoomOut");
const resetView = document.querySelector("#resetView");
const zoomIn = document.querySelector("#zoomIn");
const ctx = canvas.getContext("2d");
const staffCtx = staffCanvas.getContext("2d");

let selectedFiles = [];
let latestResults = [];
let animationStart = performance.now();
let devicePixelRatioCache = 1;
let guitarView = { x: 0, y: 0, zoom: 1 };
let activePointers = new Map();
let dragSnapshot = null;
let selectedStringKey = "";
let audioToneContext = null;
let activeToneNodes = [];
let scoreEvents = [];
let scoreDuration = 0;
let selectedScoreIndex = -1;
let scoreViewStart = 0;
let scoreViewDuration = 24;
let scorePlayback = null;

const NOISE_MODEL = {
  name: "嘈杂增强 YIN + 谐波校验",
  highPassHz: 32,
  lowPassHz: 1800,
  frameNoisePercentile: 0.22,
  gateRatio: 1.65
};

const POLYPHONIC_MODEL = {
  maxVoices: 6,
  minRelativeScore: 0.38,
  minFundamentalRatio: 0.055,
  minConfidence: 0.48,
  harmonicWeights: [1, 0.62, 0.38, 0.22, 0.12],
  bridgeGapSeconds: 0.12,
  mergeGapSeconds: 0.18,
  minEventSeconds: 0.11
};

const TIMBRE_GROUPS = {
  acoustic: ["acoustic_clean", "acoustic_soft", "acoustic_strum", "acoustic_harmonic", "acoustic_percussive"],
  classical: ["acoustic_clean", "acoustic_soft", "acoustic_harmonic", "acoustic_percussive"],
  electric: ["electric_clean", "electric_overdrive", "electric_distortion", "electric_mute", "electric_space"],
  seven: ["electric_clean", "electric_overdrive", "electric_distortion", "electric_mute", "electric_space"],
  bass: ["bass_clean", "bass_mute", "bass_warm"]
};

const TIMBRE_PROFILES = {
  acoustic_clean: {
    label: "木吉他原声 · 标准清音",
    duration: 1.9,
    attack: 0.012,
    gain: 0.38,
    filterType: "lowpass",
    filterFreq: 2600,
    filterQ: 0.7,
    noiseGain: 0.032,
    noiseLength: 0.035,
    waves: [
      { type: "triangle", gain: 0.52, mult: 1 },
      { type: "sine", gain: 0.22, mult: 2 },
      { type: "triangle", gain: 0.09, mult: 3 },
      { type: "sine", gain: 0.04, mult: 5 }
    ]
  },
  acoustic_soft: {
    label: "木吉他原声 · 分解柔和",
    duration: 2.4,
    attack: 0.024,
    gain: 0.3,
    filterType: "lowpass",
    filterFreq: 1700,
    filterQ: 0.55,
    noiseGain: 0.012,
    noiseLength: 0.026,
    waves: [
      { type: "sine", gain: 0.45, mult: 1 },
      { type: "triangle", gain: 0.2, mult: 2 },
      { type: "sine", gain: 0.08, mult: 3 }
    ]
  },
  acoustic_strum: {
    label: "木吉他原声 · 扫弦明亮",
    duration: 1.55,
    attack: 0.006,
    gain: 0.46,
    filterType: "highpass",
    filterFreq: 95,
    filterQ: 0.62,
    noiseGain: 0.07,
    noiseLength: 0.055,
    microSpread: 0.012,
    waves: [
      { type: "triangle", gain: 0.44, mult: 1 },
      { type: "sawtooth", gain: 0.12, mult: 1 },
      { type: "triangle", gain: 0.16, mult: 2 },
      { type: "sine", gain: 0.08, mult: 4 }
    ]
  },
  acoustic_harmonic: {
    label: "木吉他原声 · 泛音",
    duration: 2.25,
    attack: 0.006,
    gain: 0.25,
    filterType: "bandpass",
    filterFreq: 3200,
    filterQ: 3.2,
    noiseGain: 0.008,
    noiseLength: 0.018,
    harmonicMultiplier: 2,
    waves: [
      { type: "sine", gain: 0.52, mult: 2 },
      { type: "sine", gain: 0.18, mult: 3 },
      { type: "triangle", gain: 0.08, mult: 4 }
    ]
  },
  acoustic_percussive: {
    label: "木吉他原声 · 打板打击",
    duration: 0.42,
    attack: 0.003,
    gain: 0.34,
    filterType: "lowpass",
    filterFreq: 620,
    filterQ: 1.4,
    noiseGain: 0.22,
    noiseLength: 0.09,
    mute: 0.18,
    waves: [
      { type: "sine", gain: 0.28, mult: 0.5 },
      { type: "triangle", gain: 0.2, mult: 1 }
    ]
  },
  electric_clean: {
    label: "电吉他 · 清音",
    duration: 1.65,
    attack: 0.006,
    gain: 0.32,
    filterType: "bandpass",
    filterFreq: 1800,
    filterQ: 1.3,
    noiseGain: 0.012,
    waves: [
      { type: "triangle", gain: 0.34, mult: 1 },
      { type: "sine", gain: 0.16, mult: 2 },
      { type: "sawtooth", gain: 0.08, mult: 1 }
    ]
  },
  electric_overdrive: {
    label: "电吉他 · 过载",
    duration: 1.45,
    attack: 0.004,
    gain: 0.34,
    filterType: "bandpass",
    filterFreq: 1350,
    filterQ: 1.65,
    distortion: 90,
    noiseGain: 0.018,
    waves: [
      { type: "sawtooth", gain: 0.28, mult: 1 },
      { type: "square", gain: 0.1, mult: 1 },
      { type: "triangle", gain: 0.12, mult: 2 }
    ]
  },
  electric_distortion: {
    label: "电吉他 · 失真/重金属",
    duration: 1.3,
    attack: 0.003,
    gain: 0.38,
    filterType: "bandpass",
    filterFreq: 980,
    filterQ: 2.2,
    distortion: 260,
    noiseGain: 0.03,
    waves: [
      { type: "sawtooth", gain: 0.34, mult: 1 },
      { type: "square", gain: 0.16, mult: 1 },
      { type: "sawtooth", gain: 0.08, mult: 2 }
    ]
  },
  electric_mute: {
    label: "电吉他 · 闷音",
    duration: 0.34,
    attack: 0.002,
    gain: 0.36,
    filterType: "lowpass",
    filterFreq: 840,
    filterQ: 1.9,
    distortion: 70,
    mute: 0.12,
    noiseGain: 0.045,
    noiseLength: 0.028,
    waves: [
      { type: "sawtooth", gain: 0.2, mult: 1 },
      { type: "square", gain: 0.12, mult: 1 }
    ]
  },
  electric_space: {
    label: "电吉他 · 延迟/混响",
    duration: 2.5,
    attack: 0.008,
    gain: 0.28,
    filterType: "bandpass",
    filterFreq: 1600,
    filterQ: 1.2,
    delayTime: 0.28,
    delayFeedback: 0.38,
    delayMix: 0.34,
    noiseGain: 0.01,
    waves: [
      { type: "triangle", gain: 0.32, mult: 1 },
      { type: "sine", gain: 0.14, mult: 2 },
      { type: "sawtooth", gain: 0.06, mult: 1 }
    ]
  },
  bass_clean: {
    label: "贝斯 · 清音",
    duration: 2.1,
    attack: 0.008,
    gain: 0.42,
    filterType: "lowpass",
    filterFreq: 760,
    filterQ: 0.8,
    noiseGain: 0.012,
    waves: [
      { type: "sine", gain: 0.48, mult: 1 },
      { type: "triangle", gain: 0.22, mult: 2 },
      { type: "sine", gain: 0.1, mult: 0.5 }
    ]
  },
  bass_mute: {
    label: "贝斯 · 闷音",
    duration: 0.55,
    attack: 0.004,
    gain: 0.4,
    filterType: "lowpass",
    filterFreq: 520,
    filterQ: 1.3,
    mute: 0.2,
    noiseGain: 0.024,
    waves: [
      { type: "triangle", gain: 0.38, mult: 1 },
      { type: "sine", gain: 0.16, mult: 2 }
    ]
  },
  bass_warm: {
    label: "贝斯 · 温暖圆润",
    duration: 2.4,
    attack: 0.016,
    gain: 0.38,
    filterType: "lowpass",
    filterFreq: 620,
    filterQ: 0.62,
    noiseGain: 0.006,
    waves: [
      { type: "sine", gain: 0.56, mult: 1 },
      { type: "triangle", gain: 0.16, mult: 2 }
    ]
  }
};

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function updateTimbreOptions() {
  const current = timbreType.value;
  const keys = TIMBRE_GROUPS[guitarType.value] || TIMBRE_GROUPS.acoustic;
  timbreType.innerHTML = "";
  keys.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = TIMBRE_PROFILES[key].label;
    timbreType.appendChild(option);
  });
  timbreType.value = keys.includes(current) ? current : keys[0];
}

function getCurrentTimbreProfile(type = guitarType.value) {
  const keys = TIMBRE_GROUPS[type] || TIMBRE_GROUPS.acoustic;
  const key = keys.includes(timbreType.value) ? timbreType.value : keys[0];
  return TIMBRE_PROFILES[key] || TIMBRE_PROFILES.acoustic_clean;
}

function setProgress(percent) {
  progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function updateFileList() {
  fileList.innerHTML = "";
  if (!selectedFiles.length) {
    fileList.innerHTML = '<div class="file-pill"><div class="file-name">未选择音频</div><div class="file-meta">0 段录音</div></div>';
    analyzeButton.disabled = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-pill";
    item.innerHTML = `
      <div class="file-name">${index + 1}. ${escapeHtml(file.name)}</div>
      <div class="file-meta">${formatBytes(file.size)}</div>
    `;
    fragment.appendChild(item);
  });
  fileList.appendChild(fragment);
  analyzeButton.disabled = false;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    devicePixelRatioCache = dpr;
  }
}

function resizeStaffCanvas() {
  const rect = staffCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (staffCanvas.width !== width || staffCanvas.height !== height) {
    staffCanvas.width = width;
    staffCanvas.height = height;
  }
}

function drawRoundedPath(points, radius) {
  if (points.length < 2) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const vectorIn = normalize({ x: previous.x - point.x, y: previous.y - point.y });
    const vectorOut = normalize({ x: next.x - point.x, y: next.y - point.y });
    const start = { x: point.x + vectorIn.x * radius, y: point.y + vectorIn.y * radius };
    const end = { x: point.x + vectorOut.x * radius, y: point.y + vectorOut.y * radius };
    if (index === 0) ctx.moveTo(start.x, start.y);
    else ctx.lineTo(start.x, start.y);
    ctx.quadraticCurveTo(point.x, point.y, end.x, end.y);
  });
  ctx.closePath();
}

function normalize(point) {
  const length = Math.hypot(point.x, point.y) || 1;
  return { x: point.x / length, y: point.y / length };
}

function drawGuitar(now) {
  resizeCanvas();
  const dpr = devicePixelRatioCache;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const guitar = GUITARS[guitarType.value];
  const pulse = Math.sin((now - animationStart) / 650);

  drawStageBackdrop(width, height, now);
  const baseScale = getBaseGuitarScale(width, height);
  ctx.save();
  ctx.translate(width / 2 + guitarView.x, height / 2 + guitarView.y);
  ctx.scale(baseScale * guitarView.zoom, baseScale * guitarView.zoom);
  ctx.translate(0, 86);
  drawInstrumentShadow();
  ctx.rotate(-Math.PI / 2);
  const stringLayout = drawInstrument(guitar, guitarType.value, pulse, now);
  drawResultHintsLocal(stringLayout, guitar);
  ctx.restore();
  positionStringButtons(width, height, guitar, guitarType.value);

  requestAnimationFrame(drawGuitar);
}

function drawStageBackdrop(width, height, now) {
  const glow = ctx.createRadialGradient(width * 0.56, height * 0.42, 20, width * 0.56, height * 0.42, Math.max(width, height) * 0.72);
  glow.addColorStop(0, "rgba(255,255,255,0.72)");
  glow.addColorStop(0.45, "rgba(122,206,255,0.24)");
  glow.addColorStop(1, "rgba(223,244,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#0e5bd8";
  ctx.lineWidth = 1;
  const offset = ((now / 38) % 34) - 34;
  for (let x = offset; x < width; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height * 0.48, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function getBaseGuitarScale(width, height) {
  return Math.min(width / 560, height / 980) * 0.92;
}

function getInstrumentModel(type) {
  const isBass = type === "bass";
  return {
    neckLeft: -24,
    nutX: isBass ? 426 : 386,
    headEndX: isBass ? 560 : 510,
    bridgeX: type === "acoustic" || type === "classical" ? -248 : -218,
    bridgeY: type === "acoustic" || type === "classical" ? 58 : 34,
    bridgeSpacing: type === "bass" ? 14 : type === "seven" ? 8 : 8.6,
    nutSpacing: type === "bass" ? 8 : type === "seven" ? 5.2 : 5.8
  };
}

function drawInstrumentShadow() {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#0d3d64";
  ctx.beginPath();
  ctx.ellipse(0, 224, 190, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawInstrument(guitar, type, pulse, now) {
  if (type === "acoustic" || type === "classical") {
    drawAcousticBody(guitar, type, now);
    drawCommonNeck(guitar, type);
    drawAcousticHardware(guitar, type);
  } else {
    drawSolidBody(guitar, type, now);
    drawCommonNeck(guitar, type);
    drawElectricHardware(guitar, type);
  }
  return drawInstrumentStrings(guitar, type, pulse);
}

function drawAcousticBody(guitar, type, now) {
  const isClassical = type === "classical";
  ctx.save();
  ctx.shadowColor = "rgba(17,17,17,0.25)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  if (isClassical) {
    ctx.moveTo(-38, -94);
    ctx.bezierCurveTo(-72, -176, -160, -212, -235, -174);
    ctx.bezierCurveTo(-316, -132, -324, -48, -274, -8);
    ctx.bezierCurveTo(-348, 36, -340, 156, -238, 198);
    ctx.bezierCurveTo(-144, 237, -44, 170, -38, 76);
    ctx.bezierCurveTo(-34, 28, -30, -38, -38, -94);
  } else {
    ctx.moveTo(-34, -104);
    ctx.bezierCurveTo(-70, -198, -176, -230, -262, -176);
    ctx.bezierCurveTo(-350, -122, -360, -42, -292, 0);
    ctx.bezierCurveTo(-382, 52, -358, 176, -238, 212);
    ctx.bezierCurveTo(-122, 246, -32, 164, -28, 70);
    ctx.bezierCurveTo(-26, 22, -24, -48, -34, -104);
  }
  ctx.closePath();
  const bodyGradient = ctx.createLinearGradient(-340, -210, -34, 220);
  bodyGradient.addColorStop(0, "#ffe6ad");
  bodyGradient.addColorStop(0.38, guitar.body);
  bodyGradient.addColorStop(0.76, "#c9782e");
  bodyGradient.addColorStop(1, guitar.edge);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = guitar.edge;
  ctx.stroke();
  ctx.clip();
  drawWoodGrain(-318, -178, 270, 360, now);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = "rgba(255,255,255,0.58)";
  ctx.beginPath();
  if (isClassical) {
    ctx.ellipse(-174, 2, 132, 190, 0.02, 0, Math.PI * 2);
  } else {
    ctx.ellipse(-180, 8, 146, 205, 0.04, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}

function drawWoodGrain(x, y, width, height, now) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#6f3c17";
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 12; i++) {
    const yy = y + 24 + i * (height / 12);
    const wave = Math.sin(now / 900 + i) * 7;
    ctx.beginPath();
    ctx.moveTo(x + 12, yy);
    ctx.bezierCurveTo(x + width * 0.3, yy - 18 + wave, x + width * 0.66, yy + 16 - wave, x + width - 4, yy - 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAcousticHardware(guitar, type) {
  const isClassical = type === "classical";
  const holeX = -152;
  const holeY = -8;
  const holeR = isClassical ? 42 : 44;

  ctx.save();
  ctx.beginPath();
  ctx.arc(holeX, holeY, holeR + 11, 0, Math.PI * 2);
  ctx.strokeStyle = isClassical ? "#7d421f" : guitar.accent;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(holeX, holeY, holeR + 3, 0, Math.PI * 2);
  ctx.strokeStyle = isClassical ? "#f6d289" : "rgba(255,255,255,0.72)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(holeX, holeY, holeR, 0, Math.PI * 2);
  ctx.fillStyle = "#21140d";
  ctx.fill();
  ctx.restore();

  if (!isClassical) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-100, 26);
    ctx.bezierCurveTo(-72, 44, -78, 103, -136, 124);
    ctx.bezierCurveTo(-118, 76, -142, 50, -188, 46);
    ctx.bezierCurveTo(-156, 36, -128, 26, -100, 26);
    ctx.closePath();
    ctx.fillStyle = "rgba(65,35,22,0.68)";
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = "#2a2019";
  roundRect(-308, 48, 142, 28, 8, true);
  ctx.fillStyle = "#efe3cb";
  roundRect(-296, 44, 118, 7, 3, true);
  ctx.fillStyle = "#f2e7d2";
  const model = getInstrumentModel(type);
  for (let i = 0; i < GUITARS[type].strings.length; i++) {
    const ratio = GUITARS[type].strings.length === 1 ? 0.5 : i / (GUITARS[type].strings.length - 1);
    const y = model.bridgeY + (ratio - 0.5) * (GUITARS[type].strings.length - 1) * model.bridgeSpacing;
    ctx.beginPath();
    ctx.arc(-188, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSolidBody(guitar, type, now) {
  ctx.save();
  ctx.shadowColor = "rgba(17,17,17,0.27)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  if (type === "bass") {
    ctx.moveTo(-42, -70);
    ctx.bezierCurveTo(-86, -164, -184, -196, -260, -150);
    ctx.bezierCurveTo(-342, -102, -356, -8, -296, 34);
    ctx.bezierCurveTo(-366, 96, -320, 196, -206, 196);
    ctx.bezierCurveTo(-106, 196, -38, 132, -34, 58);
    ctx.bezierCurveTo(-72, 34, -88, 2, -50, -28);
    ctx.bezierCurveTo(-28, -44, -26, -58, -42, -70);
  } else if (type === "seven") {
    ctx.moveTo(-34, -68);
    ctx.lineTo(-72, -168);
    ctx.bezierCurveTo(-130, -124, -186, -190, -274, -148);
    ctx.bezierCurveTo(-360, -106, -340, -24, -278, 2);
    ctx.bezierCurveTo(-358, 52, -336, 168, -210, 188);
    ctx.bezierCurveTo(-104, 204, -42, 116, -36, 54);
    ctx.lineTo(-8, 116);
    ctx.bezierCurveTo(24, 70, 12, -8, -34, -68);
  } else {
    ctx.moveTo(-36, -64);
    ctx.bezierCurveTo(-74, -152, -160, -186, -244, -152);
    ctx.bezierCurveTo(-338, -114, -356, -30, -296, 8);
    ctx.bezierCurveTo(-372, 56, -326, 176, -204, 188);
    ctx.bezierCurveTo(-112, 196, -40, 132, -34, 58);
    ctx.bezierCurveTo(-80, 48, -98, 12, -54, -24);
    ctx.bezierCurveTo(-24, -36, -16, -48, -36, -64);
  }
  ctx.closePath();
  const gradient = ctx.createLinearGradient(-342, -196, -24, 206);
  gradient.addColorStop(0, guitar.accent);
  gradient.addColorStop(0.42, guitar.body);
  gradient.addColorStop(1, guitar.edge);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = guitar.edge;
  ctx.stroke();
  ctx.clip();
  drawMetallicBodyLines(type, now);
  ctx.restore();
}

function drawMetallicBodyLines(type, now) {
  ctx.save();
  ctx.globalAlpha = type === "seven" ? 0.18 : 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const x = -318 + i * 38;
    ctx.beginPath();
    ctx.moveTo(x, -160);
    ctx.bezierCurveTo(x + 60, -70 + Math.sin(now / 600 + i) * 8, x - 20, 80, x + 70, 184);
    ctx.stroke();
  }
  ctx.restore();
}

function drawElectricHardware(guitar, type) {
  ctx.save();
  if (type === "electric") {
    drawPickguard([
      { x: -238, y: -76 },
      { x: -76, y: -64 },
      { x: -44, y: -10 },
      { x: -100, y: 82 },
      { x: -228, y: 120 },
      { x: -282, y: 28 }
    ]);
    drawPickup(-190, -36, 92, 22);
    drawPickup(-178, 10, 92, 22);
    drawPickup(-236, 52, 88, 18);
    drawKnob(-88, 92);
    drawKnob(-52, 58);
  } else if (type === "seven") {
    drawPickup(-210, -36, 116, 30);
    drawPickup(-202, 34, 116, 30);
    ctx.fillStyle = "#1d1624";
    roundRect(-286, 24, 120, 26, 7, true);
    drawKnob(-70, 92);
  } else {
    drawPickguard([
      { x: -252, y: -88 },
      { x: -78, y: -64 },
      { x: -52, y: 26 },
      { x: -130, y: 118 },
      { x: -270, y: 112 },
      { x: -300, y: -8 }
    ]);
    drawPickup(-218, -16, 88, 24);
    drawPickup(-154, 30, 88, 24);
    drawKnob(-64, 78);
    drawKnob(-32, 44);
  }

  ctx.fillStyle = "#2a2019";
  roundRect(-282, 22, 118, 25, 7, true);
  ctx.fillStyle = "#d6d1c8";
  for (let i = 0; i < 6; i++) {
    roundRect(-270 + i * 17, 17, 9, 36, 3, true);
  }
  ctx.restore();
}

function drawPickguard(points) {
  ctx.save();
  drawRoundedPath(points, 16);
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(17,17,17,0.16)";
  ctx.stroke();
  ctx.restore();
}

function drawPickup(x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "#111111";
  roundRect(x, y, width, height, 6, true);
  ctx.fillStyle = "#d8d8d8";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(x + 12 + i * ((width - 24) / 5), y + height / 2, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawKnob(x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(17,17,17,0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCommonNeck(guitar, type) {
  const model = getInstrumentModel(type);
  const nutX = model.nutX;
  const leftTop = type === "bass" ? -48 : -43;
  const rightTop = type === "bass" ? -30 : -28;

  ctx.save();
  const neckGradient = ctx.createLinearGradient(model.neckLeft, -46, nutX, 46);
  neckGradient.addColorStop(0, "#6c421f");
  neckGradient.addColorStop(0.45, "#4a2d18");
  neckGradient.addColorStop(1, "#28170e");
  ctx.fillStyle = neckGradient;
  ctx.beginPath();
  ctx.moveTo(model.neckLeft, leftTop);
  ctx.lineTo(nutX, rightTop);
  ctx.lineTo(nutX, -rightTop);
  ctx.lineTo(model.neckLeft, -leftTop);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(17,17,17,0.36)";
  ctx.lineWidth = 3;
  ctx.stroke();

  drawFrets(model.neckLeft, nutX, leftTop, rightTop);
  drawHeadstock(guitar, type, model);

  ctx.fillStyle = "#f5ead8";
  roundRect(nutX - 4, rightTop - 5, 8, Math.abs(rightTop) * 2 + 10, 3, true);
  ctx.restore();
}

function drawFrets(neckLeft, nutX, leftTop, rightTop) {
  ctx.save();
  ctx.strokeStyle = "rgba(235,230,214,0.78)";
  ctx.lineWidth = 2;
  for (let fret = 1; fret <= 14; fret++) {
    const ratio = 1 - 1 / Math.pow(2, fret / 12);
    const x = nutX - (nutX - neckLeft) * ratio;
    const yTop = interpolate(rightTop, leftTop, ratio);
    const yBottom = -yTop;
    ctx.beginPath();
    ctx.moveTo(x, yTop + 2);
    ctx.lineTo(x, yBottom - 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.54)";
  [3, 5, 7, 9, 12].forEach((fret) => {
    const ratio = 1 - 1 / Math.pow(2, (fret - 0.5) / 12);
    const x = nutX - (nutX - neckLeft) * ratio;
    if (fret === 12) {
      ctx.beginPath();
      ctx.arc(x, -12, 3.8, 0, Math.PI * 2);
      ctx.arc(x, 12, 3.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, 0, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function interpolate(a, b, amount) {
  return a + (b - a) * amount;
}

function drawHeadstock(guitar, type, model) {
  const nutX = model.nutX;
  ctx.save();
  if (type === "classical") {
    const headGradient = ctx.createLinearGradient(nutX, -78, model.headEndX, 78);
    headGradient.addColorStop(0, "#75481f");
    headGradient.addColorStop(1, "#3c230f");
    ctx.fillStyle = headGradient;
    drawRoundedPath(
      [
        { x: nutX + 8, y: -68 },
        { x: model.headEndX - 10, y: -62 },
        { x: model.headEndX + 4, y: 0 },
        { x: model.headEndX - 10, y: 62 },
        { x: nutX + 8, y: 68 }
      ],
      12
    );
    ctx.fill();
    ctx.strokeStyle = guitar.edge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#20130b";
    roundRect(nutX + 42, -46, 22, 92, 9, true);
    roundRect(nutX + 84, -46, 22, 92, 9, true);
    drawTuners(nutX + 24, model.headEndX - 6, 3, true);
  } else if (type === "electric" || type === "seven") {
    const headGradient = ctx.createLinearGradient(nutX, -54, model.headEndX, 68);
    headGradient.addColorStop(0, "#7a4a24");
    headGradient.addColorStop(1, guitar.edge);
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.moveTo(nutX + 4, -30);
    ctx.bezierCurveTo(nutX + 42, -56, model.headEndX - 22, -64, model.headEndX, -28);
    ctx.bezierCurveTo(model.headEndX + 18, 14, model.headEndX - 44, 66, nutX + 10, 54);
    ctx.lineTo(nutX + 4, 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = guitar.edge;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawInlineTuners(nutX + 38, type === "seven" ? 7 : 6);
  } else {
    const headGradient = ctx.createLinearGradient(nutX, -60, model.headEndX, 60);
    headGradient.addColorStop(0, "#74461f");
    headGradient.addColorStop(1, guitar.edge);
    ctx.fillStyle = headGradient;
    drawRoundedPath(
      [
        { x: nutX + 6, y: -58 },
        { x: model.headEndX - 28, y: -70 },
        { x: model.headEndX + 4, y: 0 },
        { x: model.headEndX - 28, y: 70 },
        { x: nutX + 6, y: 58 }
      ],
      14
    );
    ctx.fill();
    ctx.strokeStyle = guitar.edge;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawTuners(nutX + 26, model.headEndX - 8, 3, false);
  }
  ctx.restore();
}

function drawTuners(startX, endX, perSide, classical) {
  ctx.save();
  ctx.fillStyle = "#d9d9d9";
  ctx.strokeStyle = "rgba(17,17,17,0.32)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < perSide; i++) {
    const x = startX + i * ((endX - startX) / Math.max(1, perSide - 1));
    [-1, 1].forEach((side) => {
      const y = side * (classical ? 54 : 46);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      roundRect(x - 12, y + side * 9 - 4, 24, 8, 4, true);
    });
  }
  ctx.restore();
}

function drawInlineTuners(startX, count) {
  ctx.save();
  ctx.fillStyle = "#d9d9d9";
  ctx.strokeStyle = "rgba(17,17,17,0.32)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < count; i++) {
    const x = startX + i * 16;
    const y = -42 + i * 11;
    ctx.beginPath();
    ctx.arc(x, y, 5.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    roundRect(x - 4, y - 24, 8, 20, 4, true);
  }
  ctx.restore();
}

function drawInstrumentStrings(guitar, type, pulse) {
  const model = getInstrumentModel(type);
  const count = guitar.strings.length;
  const resultsByString = new Map();
  latestResults.forEach((result) => {
    if (result.target) resultsByString.set(result.target.note, result);
  });

  const layout = [];
  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0.5 : i / (count - 1);
    const bridgeY = model.bridgeY + (ratio - 0.5) * (count - 1) * model.bridgeSpacing;
    const nutY = (ratio - 0.5) * (count - 1) * model.nutSpacing;
    const headY = nutY + (i - (count - 1) / 2) * (type === "electric" || type === "seven" ? 9 : 5);
    const string = guitar.strings[i];
    const result = resultsByString.get(string.note);
    const isActive = Boolean(result);
    const isSelected = selectedStringKey === `${type}:${string.note}`;
    const wobble = isActive ? Math.sin((performance.now() - animationStart) / 86 + i) * (2.2 + Math.abs(pulse) * 3.2) : 0;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(model.bridgeX, bridgeY);
    ctx.bezierCurveTo(-80, bridgeY + wobble, 150, nutY - wobble, model.nutX, nutY);
    ctx.lineTo(model.headEndX - 8, headY);
    ctx.lineWidth = (type === "bass" ? 2.8 : 1.35) + (count - i) * (type === "bass" ? 0.38 : 0.22);
    ctx.strokeStyle = isActive ? "#ff2fb2" : isSelected ? "#2f8dff" : i < 3 && type !== "bass" ? "rgba(214,176,104,0.9)" : "rgba(42,42,42,0.74)";
    ctx.shadowColor = isActive ? "rgba(255,47,178,0.78)" : isSelected ? "rgba(47,141,255,0.82)" : "transparent";
    ctx.shadowBlur = isActive || isSelected ? 13 : 0;
    ctx.stroke();
    ctx.restore();

    layout.push({ string, result, index: i, count, nutX: model.nutX, nutY, headX: model.headEndX, headY });
  }

  return layout;
}

function drawResultHintsLocal(layout, guitar) {
  ctx.save();
  ctx.font = "17px SimHei, Microsoft YaHei, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  layout.forEach((item) => {
    if (!item.result) return;
    const direction = item.result.direction;
    const text = direction === "tighten" ? "拧紧" : direction === "loosen" ? "放松" : "已准";
    const arrow = direction === "tighten" ? "↗" : direction === "loosen" ? "↘" : "✓";
    const x = item.nutX + 28;
    const y = -88 + item.index * 28;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = "#ffffff";
    roundRect(-44, -13, 88, 26, 13, true);
    ctx.strokeStyle = direction === "ok" ? guitar.edge : "#ff2fb2";
    ctx.lineWidth = 1.8;
    roundRect(-44, -13, 88, 26, 13, false);
    ctx.fillStyle = "#111111";
    ctx.fillText(`${arrow} ${text}`, -32, 0);
    ctx.restore();
  });
  ctx.restore();
}

function drawBody(x, y, width, height, guitar) {
  ctx.save();
  ctx.shadowColor = "rgba(17,17,17,0.22)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 18;

  if (guitarType.value === "electric" || guitarType.value === "bass" || guitarType.value === "seven") {
    const points = [
      { x: x + width * 0.12, y: y + height * 0.18 },
      { x: x + width * 0.44, y: y + height * 0.04 },
      { x: x + width * 0.67, y: y + height * 0.2 },
      { x: x + width * 0.94, y: y + height * 0.08 },
      { x: x + width * 0.82, y: y + height * 0.47 },
      { x: x + width * 0.96, y: y + height * 0.78 },
      { x: x + width * 0.58, y: y + height * 0.92 },
      { x: x + width * 0.27, y: y + height * 0.82 },
      { x: x + width * 0.05, y: y + height * 0.54 }
    ];
    drawRoundedPath(points, Math.max(18, width * 0.06));
  } else {
    ctx.beginPath();
    ctx.ellipse(x + width * 0.43, y + height * 0.32, width * 0.26, height * 0.25, -0.08, 0, Math.PI * 2);
    ctx.ellipse(x + width * 0.44, y + height * 0.7, width * 0.35, height * 0.29, 0.08, 0, Math.PI * 2);
  }

  const bodyGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  bodyGradient.addColorStop(0, guitar.accent);
  bodyGradient.addColorStop(0.46, guitar.body);
  bodyGradient.addColorStop(1, guitar.edge);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = guitar.edge;
  ctx.stroke();
  ctx.restore();

  if (guitarType.value === "acoustic" || guitarType.value === "classical") {
    ctx.beginPath();
    ctx.arc(x + width * 0.48, y + height * 0.48, width * 0.095, 0, Math.PI * 2);
    ctx.fillStyle = guitar.sound;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = guitar.accent;
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    roundRect(x + width * 0.45, y + height * 0.43, width * 0.34, height * 0.07, 12, true);
    roundRect(x + width * 0.44, y + height * 0.55, width * 0.32, height * 0.07, 12, true);
    ctx.fillStyle = guitar.sound;
    roundRect(x + width * 0.72, y + height * 0.28, width * 0.06, height * 0.12, 8, true);
  }

  ctx.fillStyle = "#2a2019";
  roundRect(x + width * 0.22, y + height * 0.58, width * 0.42, height * 0.045, 8, true);
}

function drawNeck(x, y, width, height, headW, headH, guitar) {
  ctx.save();
  const neckGradient = ctx.createLinearGradient(x, y, x + width, y);
  neckGradient.addColorStop(0, "#79502c");
  neckGradient.addColorStop(1, "#362113");
  ctx.fillStyle = neckGradient;
  roundRect(x, y, width, height, 10, true);

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  const fretCount = 8;
  for (let i = 1; i <= fretCount; i++) {
    const fx = x + (width / (fretCount + 1)) * i;
    ctx.beginPath();
    ctx.moveTo(fx, y + 4);
    ctx.lineTo(fx, y + height - 4);
    ctx.stroke();
  }

  ctx.fillStyle = guitar.edge;
  const headX = x + width - 4;
  const headY = y + height / 2 - headH / 2;
  drawRoundedPath(
    [
      { x: headX, y: headY + headH * 0.18 },
      { x: headX + headW * 0.72, y: headY },
      { x: headX + headW, y: headY + headH * 0.5 },
      { x: headX + headW * 0.72, y: headY + headH },
      { x: headX, y: headY + headH * 0.82 }
    ],
    Math.max(10, headW * 0.11)
  );
  ctx.fill();

  ctx.fillStyle = "#d9d9d9";
  for (let i = 0; i < 4; i++) {
    const py = headY + headH * (0.22 + i * 0.18);
    roundRect(headX + headW * 0.72, py, headW * 0.25, 8, 5, true);
  }
  ctx.restore();
}

function drawStrings(bodyX, bodyY, bodyW, bodyH, neckX, neckY, neckW, neckH, guitar, pulse) {
  const count = guitar.strings.length;
  const startX = bodyX + bodyW * 0.21;
  const endX = neckX + neckW + bodyW * 0.22;
  const bridgeY = bodyY + bodyH * 0.602;
  const topY = neckY + neckH * 0.18;
  const bottomY = neckY + neckH * 0.82;
  const resultsByString = new Map();
  latestResults.forEach((result) => {
    if (result.target) resultsByString.set(result.target.note, result);
  });

  const layout = [];
  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0.5 : i / (count - 1);
    const y1 = bridgeY + (ratio - 0.5) * bodyH * 0.18;
    const y2 = topY + ratio * (bottomY - topY);
    const string = guitar.strings[i];
    const result = resultsByString.get(string.note);
    const isActive = Boolean(result);
    const wobble = isActive ? Math.sin((performance.now() - animationStart) / 95 + i) * (1.4 + Math.abs(pulse) * 1.8) : 0;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX, y1);
    ctx.bezierCurveTo(
      bodyX + bodyW * 0.54,
      y1 + wobble,
      neckX + neckW * 0.42,
      y2 - wobble,
      endX,
      y2
    );
    ctx.lineWidth = 1.4 + (count - i) * 0.34;
    ctx.strokeStyle = isActive ? "#ff2fb2" : "rgba(17,17,17,0.64)";
    ctx.shadowColor = isActive ? "rgba(255,47,178,0.7)" : "transparent";
    ctx.shadowBlur = isActive ? 12 : 0;
    ctx.stroke();
    ctx.restore();

    layout.push({ string, result, startX, endX, y1, y2, index: i });
  }

  return layout;
}

function drawResultHints(layout, guitar) {
  ctx.save();
  ctx.font = "15px SimHei, Microsoft YaHei, Arial, sans-serif";
  ctx.textBaseline = "middle";
  layout.forEach((item) => {
    if (!item.result) return;
    const x = item.endX - 42;
    const y = item.y2 - 28;
    const direction = item.result.direction;
    const text = direction === "tighten" ? "拧紧" : direction === "loosen" ? "放松" : "已准";
    const arrow = direction === "tighten" ? "↗" : direction === "loosen" ? "↘" : "✓";

    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = "#ffffff";
    roundRect(x - 18, y - 16, 76, 32, 15, true);
    ctx.strokeStyle = direction === "ok" ? guitar.edge : "#ff2fb2";
    ctx.lineWidth = 1.5;
    roundRect(x - 18, y - 16, 76, 32, 15, false);
    ctx.fillStyle = "#111111";
    ctx.fillText(`${arrow} ${text}`, x - 8, y);
    ctx.restore();
  });
  ctx.restore();
}

function roundRect(x, y, width, height, radius, fill) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

async function analyzeFiles() {
  if (!selectedFiles.length) return;
  latestResults = [];
  scoreEvents = [];
  scoreDuration = 0;
  selectedScoreIndex = -1;
  scoreViewStart = 0;
  stopScorePlayback();
  updateScoreButtons();
  resultRibbon.innerHTML = "";
  setProgress(0);
  statusText.textContent = "正在解码";
  analyzeButton.disabled = true;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const guitar = GUITARS[guitarType.value];
    const results = [];
    const allEvents = [];
    let timelineOffset = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileBaseProgress = (i / selectedFiles.length) * 86;
      const fileProgressSpan = 86 / selectedFiles.length;
      setProgress(fileBaseProgress);
      statusText.textContent = `分析 ${i + 1}/${selectedFiles.length}`;
      const buffer = await decodeAudioFile(audioContext, file);
      const mono = mixToMono(buffer);
      const melody = await analyzeMelodyTrack(mono, buffer.sampleRate, guitar, (localProgress) => {
        setProgress(fileBaseProgress + localProgress * fileProgressSpan);
      });
      const shiftedEvents = melody.events.map((event) => ({
        ...event,
        id: `${i}-${event.id}`,
        file: file.name,
        start: event.start + timelineOffset
      }));
      allEvents.push(...shiftedEvents);
      timelineOffset += melody.duration + (selectedFiles.length > 1 ? 0.8 : 0);

      const matched = buildSongResult(file, melody, guitar);
      results.push(matched);
      latestResults = results.slice();
      renderRibbon(results);
      setProgress(fileBaseProgress + fileProgressSpan * 0.96);
      await waitFrame();
    }

    await audioContext.close();
    latestResults = results;
    scoreEvents = allEvents;
    scoreDuration = scoreEvents.reduce((max, event) => Math.max(max, event.start + event.duration), 0);
    selectedScoreIndex = scoreEvents.length ? 0 : -1;
    scoreViewStart = 0;
    drawStaffForString(getSelectedString(), guitarType.value);
    updateScoreButtons();
    setProgress(100);
    statusText.textContent = "分析完成";
    renderRibbon(results);
    const advice = buildStringTuningAdvice(scoreEvents, guitar);
    if (advice.some((item) => item.count > 0)) renderTuningAdviceRibbon(advice);
    showResultDialog(results, guitar);
  } catch (error) {
    console.error(error);
    statusText.textContent = "分析失败";
    resultText.textContent = `无法分析当前音频。\n\n${error.message || error}`;
    resultDialog.showModal();
  } finally {
    analyzeButton.disabled = selectedFiles.length === 0;
    window.setTimeout(() => setProgress(0), 1400);
  }
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function decodeAudioFile(audioContext, file) {
  const data = await file.arrayBuffer();
  if (/\.wav$/i.test(file.name) || /wav/i.test(file.type || "")) {
    try {
      return decodeWavBuffer(data);
    } catch (error) {
      console.warn("WAV parser fallback:", error);
    }
  }
  try {
    return await audioContext.decodeAudioData(data.slice(0));
  } catch {
    throw new Error(`${file.name} 不是浏览器可解码的音频格式`);
  }
}

function decodeWavBuffer(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("不是标准 RIFF/WAVE 文件");
  }

  let offset = 12;
  let format = null;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (id === "fmt ") {
      format = {
        audioFormat: view.getUint16(chunkStart, true),
        channels: view.getUint16(chunkStart + 2, true),
        sampleRate: view.getUint32(chunkStart + 4, true),
        byteRate: view.getUint32(chunkStart + 8, true),
        blockAlign: view.getUint16(chunkStart + 12, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true)
      };
    } else if (id === "data") {
      dataOffset = chunkStart;
      dataSize = size;
      break;
    }
    offset = chunkStart + size + (size % 2);
  }

  if (!format || dataOffset < 0) throw new Error("WAV 缺少 fmt 或 data 块");
  if (![1, 3].includes(format.audioFormat)) throw new Error("仅支持 PCM 或 Float WAV");
  if (!format.channels || !format.sampleRate || !format.blockAlign) throw new Error("WAV 格式信息无效");

  const frameCount = Math.floor(dataSize / format.blockAlign);
  const mono = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    const frameOffset = dataOffset + frame * format.blockAlign;
    let sum = 0;
    for (let channel = 0; channel < format.channels; channel++) {
      const sampleOffset = frameOffset + channel * (format.bitsPerSample / 8);
      sum += readWavSample(view, sampleOffset, format);
    }
    mono[frame] = sum / format.channels;
  }

  return {
    sampleRate: format.sampleRate,
    length: frameCount,
    numberOfChannels: 1,
    duration: frameCount / format.sampleRate,
    getChannelData() {
      return mono;
    }
  };
}

function readAscii(view, offset, length) {
  let value = "";
  for (let i = 0; i < length; i++) value += String.fromCharCode(view.getUint8(offset + i));
  return value;
}

function readWavSample(view, offset, format) {
  if (format.audioFormat === 3 && format.bitsPerSample === 32) return clamp(view.getFloat32(offset, true), -1, 1);
  if (format.bitsPerSample === 8) return (view.getUint8(offset) - 128) / 128;
  if (format.bitsPerSample === 16) return view.getInt16(offset, true) / 32768;
  if (format.bitsPerSample === 24) {
    const b0 = view.getUint8(offset);
    const b1 = view.getUint8(offset + 1);
    const b2 = view.getUint8(offset + 2);
    let value = b0 | (b1 << 8) | (b2 << 16);
    if (value & 0x800000) value |= 0xff000000;
    return value / 8388608;
  }
  if (format.bitsPerSample === 32) return view.getInt32(offset, true) / 2147483648;
  throw new Error(`不支持 ${format.bitsPerSample} bit WAV`);
}

function mixToMono(buffer) {
  const length = buffer.length;
  const channelCount = buffer.numberOfChannels;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < channelCount; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channelCount;
  }
  return mono;
}

async function analyzeMelodyTrack(samples, sampleRate, guitar, onProgress = () => {}) {
  const originalDuration = samples.length / sampleRate;
  onProgress(0.04);
  const enhanced = enhanceGuitarSignal(samples, sampleRate);
  onProgress(0.12);
  const detectSampleRate = Math.min(11025, sampleRate);
  const detectionSamples = sampleRate > detectSampleRate ? resampleLinear(enhanced, sampleRate, detectSampleRate) : enhanced;
  const noiseProfile = estimateNoiseProfile(detectionSamples, detectSampleRate);
  const duration = detectionSamples.length / detectSampleRate;
  const frameSize = 2048;
  const hop = duration > 600 ? 3072 : duration > 180 ? 2048 : 1024;
  const minFreq = Math.max(32, Math.min(...guitar.strings.map((string) => string.freq)) * 0.72);
  const maxFreq = guitarType.value === "bass" ? 460 : 1046.5;
  const noteBank = getPlayableNoteBank(guitar, minFreq, maxFreq);
  const rmsThreshold = Math.max(0.006, Math.min(noiseProfile.floorRms * 1.25, noiseProfile.medianRms * 0.34));
  const frames = [];
  const totalFrames = Math.max(1, Math.floor((detectionSamples.length - frameSize) / hop));

  for (let offset = 0, index = 0; offset + frameSize <= detectionSamples.length; offset += hop, index++) {
    const frame = detectionSamples.subarray(offset, offset + frameSize);
    const rms = getRms(frame);
    let pitch = null;
    let pitches = [];
    if (rms >= rmsThreshold) {
      const detected = detectPitch(frame, detectSampleRate, minFreq, maxFreq);
      if (detected.confidence >= 0.56 && Number.isFinite(detected.frequency)) {
        const midi = frequencyToMidi(detected.frequency);
        const playable = mapMidiToGuitar(midi, guitar);
        if (playable && playable.fret <= 24) {
          pitch = {
            midi: Math.round(midi),
            frequency: midiToFrequency(Math.round(midi)),
            rawFrequency: detected.frequency,
            confidence: detected.confidence,
            playable
          };
        }
      }
      const spectralPitches = detectPolyphonicPitches(frame, detectSampleRate, noteBank);
      pitches = mergeDetectedPitches(pitch, spectralPitches, guitar);
      pitch = pitches[0] || pitch;
    }
    frames.push({
      time: offset / detectSampleRate,
      rms,
      pitch,
      pitches
    });

    if (index % 24 === 0) {
      onProgress(0.12 + (index / totalFrames) * 0.72);
      await waitFrame();
    }
  }

  const events = buildScoreEventsFromFrames(frames, hop / detectSampleRate, guitar);
  onProgress(0.94);
  await waitFrame();
  return {
    duration: originalDuration,
    events,
    frameCount: frames.length,
    model: NOISE_MODEL.name,
    noiseFloor: noiseProfile.floorRms
  };
}

function buildScoreEventsFromFrames(frames, stepDuration, guitar) {
  if (!frames.length) return [];
  const smoothed = frames.map((frame) => ({
    ...frame,
    pitches: normalizeFramePitches(frame.pitches?.length ? frame.pitches : frame.pitch ? [frame.pitch] : [], guitar)
  }));

  for (let i = 1; i < smoothed.length - 1; i++) {
    const previous = new Map(smoothed[i - 1].pitches.map((item) => [item.midi, item]));
    const current = new Map(smoothed[i].pitches.map((item) => [item.midi, item]));
    const next = new Map(smoothed[i + 1].pitches.map((item) => [item.midi, item]));
    previous.forEach((prevPitch, midi) => {
      const nextPitch = next.get(midi);
      if (!nextPitch || current.has(midi)) return;
      smoothed[i].pitches.push({
        ...prevPitch,
        rawFrequency: median([prevPitch.rawFrequency || prevPitch.frequency, nextPitch.rawFrequency || nextPitch.frequency]),
        confidence: Math.min(prevPitch.confidence, nextPitch.confidence) * 0.9,
        voiceCount: Math.max(prevPitch.voiceCount || 1, nextPitch.voiceCount || 1),
        bridged: true
      });
    });
    smoothed[i].pitches = normalizeFramePitches(smoothed[i].pitches, guitar);
  }

  const rawEvents = [];
  const active = new Map();
  for (const frame of smoothed) {
    const present = new Map(frame.pitches.map((item) => [item.midi, item]));

    Array.from(active.entries()).forEach(([midi, event]) => {
      if (!present.has(midi)) {
        event.end = frame.time;
        rawEvents.push(event);
        active.delete(midi);
      }
    });

    present.forEach((framePitch, midi) => {
      let event = active.get(midi);
      if (!event) {
        event = {
          midi,
          start: frame.time,
          end: frame.time + stepDuration,
          frequencies: [],
          confidences: [],
          positions: [],
          voiceCounts: [],
          polyphonicFrames: 0,
          bridgedFrames: 0
        };
        active.set(midi, event);
      }
      event.end = frame.time + stepDuration;
      event.frequencies.push(framePitch.rawFrequency || framePitch.frequency || midiToFrequency(midi));
      event.confidences.push(framePitch.confidence || 0.5);
      if (framePitch.playable) event.positions.push(framePitch.playable);
      event.voiceCounts.push(framePitch.voiceCount || frame.pitches.length || 1);
      if (framePitch.polyphonic || frame.pitches.length > 1) event.polyphonicFrames++;
      if (framePitch.bridged) event.bridgedFrames++;
    });
  }
  active.forEach((event) => rawEvents.push(event));

  const merged = [];
  const lastByMidi = new Map();
  rawEvents
    .sort((a, b) => a.start - b.start || a.midi - b.midi)
    .forEach((event) => {
    const last = lastByMidi.get(event.midi);
    if (last && last.midi === event.midi && event.start - last.end <= POLYPHONIC_MODEL.mergeGapSeconds) {
      last.end = event.end;
      last.frequencies.push(...event.frequencies);
      last.confidences.push(...event.confidences);
      last.positions.push(...event.positions);
      last.voiceCounts.push(...event.voiceCounts);
      last.polyphonicFrames += event.polyphonicFrames;
      last.bridgedFrames += event.bridgedFrames;
    } else {
      merged.push(event);
      lastByMidi.set(event.midi, event);
    }
  });

  return merged
    .filter((event) => event.end - event.start >= POLYPHONIC_MODEL.minEventSeconds)
    .map((event, index) => {
      const midi = event.midi;
      const playable = pickEventPosition(event, guitar);
      const string = playable ? guitar.strings[playable.stringIndex] : guitar.strings[0];
      const targetFreq = midiToFrequency(midi);
      const measuredFreq = median(event.frequencies.filter(Number.isFinite)) || targetFreq;
      const cents = centsBetween(measuredFreq, targetFreq);
      const voiceCount = Math.max(1, ...event.voiceCounts.filter(Number.isFinite));
      const polyphonic = voiceCount > 1 || event.polyphonicFrames > event.confidences.length * 0.35;
      return {
        id: String(index),
        start: roundTime(event.start),
        duration: roundTime(Math.max(0.16, event.end - event.start)),
        midi,
        note: midiToNoteName(midi),
        freq: measuredFreq,
        measuredFreq,
        targetFreq,
        cents,
        stringIndex: playable ? playable.stringIndex : 0,
        stringName: string.name,
        stringNote: string.note,
        fret: playable ? playable.fret : 0,
        confidence: average(event.confidences),
        voiceCount,
        polyphonic,
        source: polyphonic ? "polyphonic-spectrum" : "monophonic-yin"
      };
    });
}

function normalizeFramePitches(pitches, guitar) {
  const byMidi = new Map();
  pitches.forEach((pitch) => {
    if (!pitch || !Number.isFinite(pitch.midi)) return;
    const midi = Math.round(pitch.midi);
    const playable = pitch.playable || mapMidiToGuitar(midi, guitar);
    if (!playable) return;
    const normalized = {
      ...pitch,
      midi,
      frequency: pitch.frequency || midiToFrequency(midi),
      rawFrequency: Number.isFinite(pitch.rawFrequency) ? pitch.rawFrequency : pitch.frequency || midiToFrequency(midi),
      confidence: clamp(pitch.confidence || 0, 0, 1),
      playable
    };
    const existing = byMidi.get(midi);
    if (!existing || normalized.confidence > existing.confidence) byMidi.set(midi, normalized);
  });
  return Array.from(byMidi.values()).sort((a, b) => b.confidence - a.confidence);
}

function pickEventPosition(event, guitar) {
  if (!event.positions.length) return mapMidiToGuitar(event.midi, guitar);
  const counts = new Map();
  event.positions.forEach((position) => {
    if (!position) return;
    const key = `${position.stringIndex}:${position.fret}`;
    const current = counts.get(key) || { ...position, count: 0 };
    current.count++;
    counts.set(key, current);
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.fret - b.fret || a.stringIndex - b.stringIndex)[0]
    || mapMidiToGuitar(event.midi, guitar);
}

function buildSongResult(file, melody, guitar) {
  if (!melody.events.length) {
    return {
      file: file.name,
      target: null,
      direction: "unknown",
      analysis: { error: "未识别到稳定旋律音符", model: melody.model },
      message: "未识别到稳定旋律音符"
    };
  }

  const byString = new Map();
  melody.events.forEach((event) => {
    byString.set(event.stringNote, (byString.get(event.stringNote) || 0) + 1);
  });
  let prominentString = guitar.strings[0];
  let count = 0;
  guitar.strings.forEach((string) => {
    const value = byString.get(string.note) || 0;
    if (value > count) {
      count = value;
      prominentString = string;
    }
  });

  return {
    file: file.name,
    target: prominentString,
    direction: "song",
    analysis: {
      frequency: melody.events[0].freq,
      low: Math.min(...melody.events.map((event) => event.freq)),
      high: Math.max(...melody.events.map((event) => event.freq)),
      stringAdvice: buildStringTuningAdvice(melody.events, guitar),
      confidence: average(melody.events.map((event) => event.confidence)),
      note: melody.events[0].note,
      model: melody.model,
      eventCount: melody.events.length,
      polyphonicEventCount: melody.events.filter((event) => event.polyphonic).length,
      maxVoices: Math.max(...melody.events.map((event) => event.voiceCount || 1)),
      duration: melody.duration
    },
    message: `识别 ${melody.events.length} 个音符，${formatTime(melody.duration)}`
  };
}

function buildStringTuningAdvice(events, guitar) {
  return guitar.strings.map((string, stringIndex) => {
    const related = events
      .map((event) => getOpenStringTuningSample(event, string, stringIndex))
      .filter(Boolean);
    if (!related.length) {
      return {
        string,
        count: 0,
        cents: 0,
        direction: "unknown",
        message: "没有足够录音样本"
      };
    }
    const weights = related.map((sample) => sample.weight);
    const cents = weightedMedian(
      related.map((sample) => sample.cents),
      weights
    );
    const direction = getTuningDirection(cents);
    return {
      string,
      count: related.length,
      cents,
      direction,
      message: describeTuning(direction, cents)
    };
  });
}

function getOpenStringTuningSample(event, string, stringIndex) {
  const measured = Number(event.measuredFreq || event.freq);
  if (!Number.isFinite(measured) || measured <= 0) return null;
  const octave = Math.round(Math.log2(measured / string.freq));
  if (octave < -1 || octave > 4) return null;
  const octaveTarget = string.freq * Math.pow(2, octave);
  const cents = centsBetween(measured, octaveTarget);
  const sameMappedString = event.stringIndex === stringIndex;
  if (Math.abs(cents) > 45) return null;
  const isOpenOrHarmonic = event.fret === 0 || Math.abs(cents) <= 35;
  if (!sameMappedString && !isOpenOrHarmonic) return null;
  const confidence = Math.max(0.2, event.confidence || 0.5);
  const duration = Math.max(0.12, event.duration || 0.2);
  const octaveWeight = octave === 0 ? 1 : octave > 0 ? 0.82 / octave : 0.42;
  const mappedWeight = sameMappedString ? 1 : 0.62;
  return {
    cents,
    weight: confidence * duration * octaveWeight * mappedWeight
  };
}

function getTuningDirection(cents) {
  if (!Number.isFinite(cents)) return "unknown";
  if (cents < -ACCEPTABLE_CENTS) return "tighten";
  if (cents > ACCEPTABLE_CENTS) return "loosen";
  return "ok";
}

function describeTuning(direction, cents) {
  const abs = Math.abs(cents || 0).toFixed(1);
  if (direction === "tighten") return `偏低 ${abs} cents，需要拧紧`;
  if (direction === "loosen") return `偏高 ${abs} cents，需要放松`;
  if (direction === "ok") return `误差 ${abs} cents，已在可接受范围`;
  return "没有足够录音样本";
}

function getScoreEventTuningAdvice(event) {
  if (!event) return "未选中音符";
  const direction = getTuningDirection(event.cents);
  const base = describeTuning(direction, event.cents);
  return `${event.note} · ${event.stringName} ${event.fret}品：本音 ${event.measuredFreq.toFixed(2)}Hz，目标 ${event.targetFreq.toFixed(2)}Hz，${base}`;
}

function getPlayableNoteBank(guitar, minFreq, maxFreq) {
  const byMidi = new Map();
  guitar.strings.forEach((string, stringIndex) => {
    const openMidi = noteNameToMidi(string.note);
    for (let fret = 0; fret <= 24; fret++) {
      const midi = openMidi + fret;
      const frequency = midiToFrequency(midi);
      if (frequency < minFreq || frequency > maxFreq) continue;
      if (!byMidi.has(midi)) {
        byMidi.set(midi, {
          midi,
          frequency,
          note: midiToNoteName(midi),
          positions: []
        });
      }
      byMidi.get(midi).positions.push({
        stringIndex,
        fret,
        score: fret + stringIndex * 0.08
      });
    }
  });
  return Array.from(byMidi.values())
    .map((item) => ({
      ...item,
      positions: item.positions.sort((a, b) => a.score - b.score)
    }))
    .sort((a, b) => a.midi - b.midi);
}

function detectPolyphonicPitches(frame, sampleRate, noteBank) {
  if (!noteBank.length) return [];
  const spectrum = getPowerSpectrum(frame, sampleRate);
  if (!spectrum.maxPower) return [];

  const scored = noteBank.map((note, index) => {
    const harmonic = getHarmonicEnergy(spectrum, note.frequency);
    return {
      ...note,
      bankIndex: index,
      score: harmonic.score,
      rawFrequency: harmonic.rawFrequency,
      fundamentalRatio: harmonic.fundamentalRatio
    };
  });
  const maxScore = Math.max(...scored.map((item) => item.score));
  if (!Number.isFinite(maxScore) || maxScore <= 0) return [];

  const candidates = scored
    .map((item, index) => {
      const neighbor = Math.max(scored[index - 1]?.score || 0, scored[index + 1]?.score || 0);
      const relative = item.score / maxScore;
      const contrast = item.score / Math.max(neighbor, maxScore * 0.08);
      const notValley = item.score >= neighbor * 1.04;
      const confidence = clamp(
        relative * 0.68 + clamp(contrast / 1.8, 0, 1) * 0.2 + clamp(item.fundamentalRatio * 2.8, 0, 1) * 0.12,
        0,
        1
      );
      return {
        ...item,
        relative,
        contrast,
        confidence,
        notValley
      };
    })
    .filter((item) => (
      item.notValley
      && item.relative >= POLYPHONIC_MODEL.minRelativeScore
      && item.fundamentalRatio >= POLYPHONIC_MODEL.minFundamentalRatio
      && item.confidence >= POLYPHONIC_MODEL.minConfidence
    ))
    .sort((a, b) => b.confidence - a.confidence || b.score - a.score);

  return selectPolyphonicVoices(candidates);
}

function selectPolyphonicVoices(candidates) {
  const selected = [];
  const usedStrings = new Set();
  for (const candidate of candidates) {
    if (selected.length >= POLYPHONIC_MODEL.maxVoices) break;
    if (selected.some((item) => item.midi === candidate.midi)) continue;
    if (isLikelyHarmonicDuplicate(candidate, selected)) continue;
    const playable = chooseCandidatePosition(candidate, usedStrings);
    if (!playable) continue;
    selected.push({
      midi: candidate.midi,
      frequency: candidate.frequency,
      rawFrequency: candidate.rawFrequency,
      confidence: candidate.confidence,
      playable,
      positions: candidate.positions,
      polyphonic: true,
      source: "polyphonic-spectrum",
      relative: candidate.relative,
      fundamentalRatio: candidate.fundamentalRatio
    });
    usedStrings.add(playable.stringIndex);
  }
  selected.forEach((item) => {
    item.voiceCount = selected.length;
    item.polyphonic = selected.length > 1;
  });
  return selected.sort((a, b) => a.playable.stringIndex - b.playable.stringIndex || a.midi - b.midi);
}

function mergeDetectedPitches(primaryPitch, spectralPitches, guitar) {
  const candidates = spectralPitches.map((item) => ({ ...item }));
  if (primaryPitch) {
    const primaryMidi = Math.round(primaryPitch.midi);
    const matching = candidates.find((item) => Math.abs(item.midi - primaryMidi) <= 0);
    if (matching) {
      matching.confidence = Math.max(matching.confidence, primaryPitch.confidence);
      matching.rawFrequency = primaryPitch.rawFrequency || matching.rawFrequency;
      matching.source = "yin+polyphonic-spectrum";
      matching.priority = 1;
    } else {
      candidates.push({
        ...primaryPitch,
        midi: primaryMidi,
        positions: getPlayablePositionsForMidi(primaryMidi, guitar),
        confidence: primaryPitch.confidence * 0.96,
        source: "monophonic-yin",
        priority: 1
      });
    }
  }

  const selected = [];
  const usedStrings = new Set();
  candidates
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || b.confidence - a.confidence)
    .forEach((candidate) => {
      if (selected.length >= Math.min(POLYPHONIC_MODEL.maxVoices, guitar.strings.length)) return;
      if (primaryPitch && !candidate.priority && candidate.confidence < Math.max(POLYPHONIC_MODEL.minConfidence, primaryPitch.confidence * 0.68)) return;
      if (selected.some((item) => item.midi === candidate.midi)) return;
      if (isLikelyHarmonicDuplicate(candidate, selected)) return;
      const playable = chooseCandidatePosition(candidate, usedStrings);
      if (!playable) return;
      selected.push({
        ...candidate,
        midi: Math.round(candidate.midi),
        frequency: candidate.frequency || midiToFrequency(Math.round(candidate.midi)),
        rawFrequency: candidate.rawFrequency || candidate.frequency || midiToFrequency(Math.round(candidate.midi)),
        playable
      });
      usedStrings.add(playable.stringIndex);
    });

  if (!selected.length && primaryPitch) selected.push(primaryPitch);
  selected.forEach((item) => {
    item.voiceCount = selected.length;
    item.polyphonic = selected.length > 1 || item.polyphonic;
  });
  return selected.sort((a, b) => a.playable.stringIndex - b.playable.stringIndex || a.midi - b.midi);
}

function chooseCandidatePosition(candidate, usedStrings) {
  const positions = (candidate.positions || []).slice().sort((a, b) => a.score - b.score);
  return positions.find((position) => !usedStrings.has(position.stringIndex)) || null;
}

function getPlayablePositionsForMidi(midi, guitar) {
  const positions = [];
  guitar.strings.forEach((string, stringIndex) => {
    const openMidi = noteNameToMidi(string.note);
    const fret = Math.round(midi - openMidi);
    if (fret < 0 || fret > 24) return;
    positions.push({
      stringIndex,
      fret,
      score: fret + stringIndex * 0.08
    });
  });
  return positions.sort((a, b) => a.score - b.score);
}

function isLikelyHarmonicDuplicate(candidate, selected) {
  return selected.some((item) => {
    const interval = Math.abs(candidate.midi - item.midi);
    const harmonicIntervals = [12, 19, 24, 28, 31, 36];
    if (!harmonicIntervals.some((value) => Math.abs(value - interval) <= 1)) return false;
    const higher = candidate.midi > item.midi ? candidate : item;
    const lower = candidate.midi > item.midi ? item : candidate;
    const higherLooksLikePartial =
      (higher.fundamentalRatio || 0) < 0.22
      || (higher.confidence || 0) < (lower.confidence || 0) * 0.82
      || (higher.relative || 0) < (lower.relative || 1) * 0.74;
    return higherLooksLikePartial;
  });
}

function getPowerSpectrum(frame, sampleRate) {
  const length = nextPowerOfTwo(frame.length);
  const real = new Float32Array(length);
  const imag = new Float32Array(length);
  const last = Math.max(1, frame.length - 1);
  for (let i = 0; i < frame.length; i++) {
    const windowValue = 0.5 - 0.5 * Math.cos((Math.PI * 2 * i) / last);
    real[i] = frame[i] * windowValue;
  }
  fftInPlace(real, imag);
  const power = new Float32Array(length / 2 + 1);
  let maxPower = 0;
  for (let i = 1; i < power.length; i++) {
    const value = real[i] * real[i] + imag[i] * imag[i];
    power[i] = value;
    if (value > maxPower) maxPower = value;
  }
  return {
    power,
    binHz: sampleRate / length,
    maxPower
  };
}

function getHarmonicEnergy(spectrum, frequency) {
  const estimates = [];
  const estimateWeights = [];
  let score = 0;
  let fundamentalAmp = 0;
  const nyquist = spectrum.binHz * (spectrum.power.length - 1);
  POLYPHONIC_MODEL.harmonicWeights.forEach((weight, index) => {
    const harmonic = index + 1;
    const harmonicFreq = frequency * harmonic;
    if (harmonicFreq >= nyquist * 0.96) return;
    const peak = getSpectralPeak(spectrum, harmonicFreq);
    const amplitude = Math.sqrt(Math.max(0, peak.power));
    score += amplitude * weight;
    if (harmonic === 1) fundamentalAmp = amplitude;
    const estimated = peak.frequency / harmonic;
    if (Math.abs(centsBetween(estimated, frequency)) <= 90) {
      estimates.push(estimated);
      estimateWeights.push(amplitude * weight);
    }
  });
  const rawFrequency = estimates.length ? weightedAverage(estimates, estimateWeights) : frequency;
  return {
    score,
    rawFrequency,
    fundamentalRatio: score > 0 ? fundamentalAmp / score : 0
  };
}

function getSpectralPeak(spectrum, frequency) {
  const target = frequency / spectrum.binHz;
  const radius = Math.max(1, Math.min(4, Math.ceil(target * 0.018)));
  const start = Math.max(1, Math.floor(target - radius));
  const end = Math.min(spectrum.power.length - 2, Math.ceil(target + radius));
  let best = start;
  let bestPower = 0;
  for (let bin = start; bin <= end; bin++) {
    const power = spectrum.power[bin] || 0;
    if (power > bestPower) {
      bestPower = power;
      best = bin;
    }
  }
  const left = Math.log((spectrum.power[best - 1] || 0) + 1e-12);
  const center = Math.log((spectrum.power[best] || 0) + 1e-12);
  const right = Math.log((spectrum.power[best + 1] || 0) + 1e-12);
  const denominator = left - 2 * center + right;
  const delta = Math.abs(denominator) > 1e-9 ? clamp(0.5 * (left - right) / denominator, -0.75, 0.75) : 0;
  return {
    frequency: (best + delta) * spectrum.binHz,
    power: bestPower
  };
}

function weightedAverage(values, weights) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!total) return average(values);
  return values.reduce((sum, value, index) => sum + value * weights[index], 0) / total;
}

function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function fftInPlace(real, imag) {
  const length = real.length;
  for (let i = 1, j = 0; i < length; i++) {
    let bit = length >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const realValue = real[i];
      const imagValue = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = realValue;
      imag[j] = imagValue;
    }
  }

  for (let size = 2; size <= length; size <<= 1) {
    const half = size >> 1;
    const angle = -Math.PI * 2 / size;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let start = 0; start < length; start += size) {
      let currentReal = 1;
      let currentImag = 0;
      for (let offset = 0; offset < half; offset++) {
        const even = start + offset;
        const odd = even + half;
        const oddReal = real[odd] * currentReal - imag[odd] * currentImag;
        const oddImag = real[odd] * currentImag + imag[odd] * currentReal;
        real[odd] = real[even] - oddReal;
        imag[odd] = imag[even] - oddImag;
        real[even] += oddReal;
        imag[even] += oddImag;
        const nextReal = currentReal * stepReal - currentImag * stepImag;
        currentImag = currentReal * stepImag + currentImag * stepReal;
        currentReal = nextReal;
      }
    }
  }
}

function resampleLinear(samples, sourceRate, targetRate) {
  if (sourceRate === targetRate) return samples;
  const targetLength = Math.max(1, Math.round(samples.length * targetRate / sourceRate));
  const output = new Float32Array(targetLength);
  const ratio = (samples.length - 1) / Math.max(1, targetLength - 1);
  for (let i = 0; i < targetLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const amount = position - index;
    const a = samples[index] || 0;
    const b = samples[Math.min(samples.length - 1, index + 1)] || a;
    output[i] = a + (b - a) * amount;
  }
  return output;
}

function mapMidiToGuitar(midi, guitar) {
  let best = null;
  guitar.strings.forEach((string, stringIndex) => {
    const stringMidi = noteNameToMidi(string.note);
    const fret = Math.round(midi - stringMidi);
    if (fret < 0 || fret > 24) return;
    const score = fret + stringIndex * 0.08;
    if (!best || score < best.score) best = { stringIndex, fret, score };
  });
  return best;
}

function frequencyToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToNoteName(midi) {
  const rounded = Math.round(midi);
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${note}${octave}`;
}

function noteNameToMidi(note) {
  const parsed = parseNoteName(note);
  if (!parsed) return 60;
  const semitone = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  }[parsed.letter] + (parsed.accidental ? 1 : 0);
  return (parsed.octave + 1) * 12 + semitone;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundTime(value) {
  return Math.round(value * 1000) / 1000;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.max(0, seconds - minutes * 60);
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

function analyzePitchTrack(samples, sampleRate) {
  const enhanced = enhanceGuitarSignal(samples, sampleRate);
  const noiseProfile = estimateNoiseProfile(enhanced, sampleRate);
  const trimmed = trimSilence(enhanced, noiseProfile);
  if (trimmed.length < sampleRate * 0.12) {
    return { confidence: 0, error: "有效声音太短" };
  }

  const frameSize = trimmed.length >= 8192 ? 8192 : 4096;
  const hop = Math.floor(frameSize / 2);
  const minFreq = 35;
  const maxFreq = 520;
  const tracks = [];
  const rmsThreshold = Math.max(0.009, noiseProfile.floorRms * NOISE_MODEL.gateRatio, noiseProfile.medianRms * 0.36);

  for (let offset = 0; offset + frameSize <= trimmed.length; offset += hop) {
    const frame = trimmed.subarray(offset, offset + frameSize);
    const rms = getRms(frame);
    if (rms < rmsThreshold) continue;
    const pitch = detectPitch(frame, sampleRate, minFreq, maxFreq);
    if (pitch.confidence > 0.5 && Number.isFinite(pitch.frequency)) {
      tracks.push({ frequency: pitch.frequency, confidence: pitch.confidence, rms, clarity: pitch.clarity });
    }
  }

  if (!tracks.length) {
    return { confidence: 0, error: "未检测到稳定基频" };
  }

  const pitches = tracks.map((track) => track.frequency);
  const medianFreq = median(pitches);
  const filtered = tracks.filter((track) => Math.abs(centsBetween(track.frequency, medianFreq)) <= 45);
  const stableTracks = filtered.length ? filtered : tracks;
  const stable = stableTracks.map((track) => track.frequency);
  const frequency = weightedMedian(
    stable,
    stableTracks.map((track) => track.rms * track.confidence * (track.clarity || 1))
  );
  const averagePitchConfidence =
    stableTracks.reduce((sum, track) => sum + track.confidence, 0) / stableTracks.length;
  const low = Math.min(...stable);
  const high = Math.max(...stable);
  const spread = Math.abs(centsBetween(high, low));
  const coverage = Math.min(1, stableTracks.length / 3);
  const confidence = Math.max(
    0.05,
    Math.min(0.99, averagePitchConfidence * (1 - Math.min(0.75, spread / 220)) * (0.65 + coverage * 0.35))
  );

  return {
    frequency,
    low,
    high,
    spread,
    confidence,
    model: NOISE_MODEL.name,
    noiseFloor: noiseProfile.floorRms,
    note: frequencyToNoteName(frequency)
  };
}

function enhanceGuitarSignal(samples, sampleRate) {
  const highPassed = onePoleHighPass(samples, sampleRate, NOISE_MODEL.highPassHz);
  const lowPassed = onePoleLowPass(highPassed, sampleRate, NOISE_MODEL.lowPassHz);
  const gated = applyAdaptiveNoiseGate(lowPassed, sampleRate);
  return normalizeSignal(gated);
}

function estimateNoiseProfile(samples, sampleRate) {
  const windowSize = Math.max(512, Math.floor(sampleRate * 0.024));
  const rmsValues = [];
  for (let i = 0; i + windowSize < samples.length; i += windowSize) {
    rmsValues.push(getRms(samples.subarray(i, i + windowSize)));
  }
  if (!rmsValues.length) return { floorRms: 0.006, medianRms: 0.012, peakRms: 0.012 };
  rmsValues.sort((a, b) => a - b);
  const floorIndex = Math.floor((rmsValues.length - 1) * NOISE_MODEL.frameNoisePercentile);
  return {
    floorRms: Math.max(0.004, rmsValues[floorIndex]),
    medianRms: rmsValues[Math.floor(rmsValues.length / 2)],
    peakRms: rmsValues[rmsValues.length - 1]
  };
}

function applyAdaptiveNoiseGate(samples, sampleRate) {
  const profile = estimateNoiseProfile(samples, sampleRate);
  const windowSize = Math.max(512, Math.floor(sampleRate * 0.018));
  const output = new Float32Array(samples.length);
  let smoothedGain = 1;
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    const rms = getRms(samples.subarray(start, end));
    const ratio = rms / Math.max(0.0001, profile.floorRms * NOISE_MODEL.gateRatio);
    const targetGain = clamp((ratio - 0.55) / 1.2, 0.18, 1);
    smoothedGain = smoothedGain * 0.72 + targetGain * 0.28;
    for (let i = start; i < end; i++) {
      output[i] = samples[i] * smoothedGain;
    }
  }
  return output;
}

function onePoleHighPass(samples, sampleRate, cutoffHz) {
  const output = new Float32Array(samples.length);
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = rc / (rc + dt);
  let previousOutput = 0;
  let previousInput = samples[0] || 0;
  for (let i = 0; i < samples.length; i++) {
    const current = alpha * (previousOutput + samples[i] - previousInput);
    output[i] = current;
    previousOutput = current;
    previousInput = samples[i];
  }
  return output;
}

function onePoleLowPass(samples, sampleRate, cutoffHz) {
  const output = new Float32Array(samples.length);
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  let current = samples[0] || 0;
  for (let i = 0; i < samples.length; i++) {
    current += alpha * (samples[i] - current);
    output[i] = current;
  }
  return output;
}

function normalizeSignal(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak < 0.001) return samples;
  const gain = Math.min(3.2, 0.92 / peak);
  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) output[i] = samples[i] * gain;
  return output;
}

function trimSilence(samples, noiseProfile = null) {
  const windowSize = 1024;
  let maxRms = 0;
  for (let i = 0; i + windowSize < samples.length; i += windowSize) {
    maxRms = Math.max(maxRms, getRms(samples.subarray(i, i + windowSize)));
  }
  const threshold = Math.max(0.006, maxRms * 0.1, noiseProfile ? noiseProfile.floorRms * 1.45 : 0);
  let start = 0;
  let end = samples.length - 1;
  for (let i = 0; i + windowSize < samples.length; i += windowSize) {
    if (getRms(samples.subarray(i, i + windowSize)) > threshold) {
      start = Math.max(0, i - windowSize);
      break;
    }
  }
  for (let i = samples.length - windowSize; i > 0; i -= windowSize) {
    if (getRms(samples.subarray(i, i + windowSize)) > threshold) {
      end = Math.min(samples.length, i + windowSize * 2);
      break;
    }
  }
  return samples.subarray(start, end);
}

function detectPitch(frame, sampleRate, minFreq, maxFreq) {
  const prepared = removeDc(frame);
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.ceil(sampleRate / minFreq);
  const limit = Math.max(64, prepared.length - maxLag);
  const difference = new Float32Array(maxLag + 1);
  const cumulativeMean = new Float32Array(maxLag + 1);
  let runningTotal = 0;

  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < limit; i++) {
      const delta = prepared[i] - prepared[i + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
    runningTotal += sum;
    cumulativeMean[lag] = sum * lag / (runningTotal || 1);
  }

  let bestLag = -1;
  const threshold = 0.12;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (cumulativeMean[lag] < threshold) {
      while (lag + 1 <= maxLag && cumulativeMean[lag + 1] < cumulativeMean[lag]) lag++;
      bestLag = lag;
      break;
    }
  }

  if (bestLag < 0) {
    let bestScore = Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (cumulativeMean[lag] < bestScore) {
        bestScore = cumulativeMean[lag];
        bestLag = lag;
      }
    }
  }

  if (bestLag < 0) return { frequency: 0, confidence: 0 };
  bestLag = correctSubharmonicLag(prepared, cumulativeMean, bestLag, minLag);
  const refinedLag = refineLag(cumulativeMean, bestLag, sampleRate, minFreq, maxFreq);
  const harmonicSupport = getHarmonicSupport(prepared, refinedLag);
  const yinConfidence = Math.max(0, Math.min(1, 1 - cumulativeMean[bestLag]));
  return {
    frequency: sampleRate / refinedLag,
    confidence: Math.max(0, Math.min(1, yinConfidence * 0.78 + harmonicSupport * 0.22)),
    clarity: harmonicSupport
  };
}

function correctSubharmonicLag(frame, scoreTable, lag, minLag) {
  let corrected = lag;
  const originalScore = scoreTable[lag] || 1;
  const originalCorrelation = normalizedLagCorrelation(frame, lag);
  [2, 3, 4].forEach((divisor) => {
    const candidate = Math.round(lag / divisor);
    if (candidate < minLag || candidate <= 1) return;
    const candidateScore = scoreTable[candidate] || 1;
    const candidateCorrelation = normalizedLagCorrelation(frame, candidate);
    const scoreIsPlausible = candidateScore < 0.2 && candidateScore <= originalScore * 1.7;
    const correlationIsPlausible = candidateCorrelation >= originalCorrelation * 0.72;
    if (scoreIsPlausible || correlationIsPlausible) corrected = candidate;
  });
  return corrected;
}

function getHarmonicSupport(frame, lag) {
  const fundamental = normalizedLagCorrelation(frame, Math.round(lag));
  const octave = normalizedLagCorrelation(frame, Math.round(lag / 2));
  const subOctave = normalizedLagCorrelation(frame, Math.round(lag * 2));
  const stability = normalizedLagCorrelation(frame, Math.round(lag * 1.5));
  return clamp(fundamental * 0.62 + octave * 0.2 + subOctave * 0.12 + stability * 0.06, 0, 1);
}

function normalizedLagCorrelation(frame, lag) {
  if (lag <= 1 || lag >= frame.length - 2) return 0;
  let sum = 0;
  let sumA = 0;
  let sumB = 0;
  const limit = frame.length - lag;
  for (let i = 0; i < limit; i++) {
    const a = frame[i];
    const b = frame[i + lag];
    sum += a * b;
    sumA += a * a;
    sumB += b * b;
  }
  return Math.max(0, sum / Math.sqrt(sumA * sumB || 1));
}

function removeDc(frame) {
  let mean = 0;
  for (let i = 0; i < frame.length; i++) mean += frame[i];
  mean /= frame.length;
  const prepared = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) prepared[i] = frame[i] - mean;
  return prepared;
}

function refineLag(scoreTable, lag, sampleRate, minFreq, maxFreq) {
  const points = [lag - 1, lag, lag + 1].map((candidate) => ({
    lag: candidate,
    score: candidate > 0 && candidate < scoreTable.length ? scoreTable[candidate] : scoreTable[lag]
  }));
  const [left, center, right] = points;
  const denominator = left.score - 2 * center.score + right.score;
  let refined = lag;
  if (Math.abs(denominator) > 1e-9) {
    refined = center.lag + 0.5 * (left.score - right.score) / denominator;
  }
  const minLag = sampleRate / maxFreq;
  const maxLag = sampleRate / minFreq;
  return Math.max(minLag, Math.min(maxLag, refined));
}

function getRms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function weightedMedian(values, weights) {
  if (!values.length) return 0;
  const pairs = values.map((value, index) => ({
    value,
    weight: weights[index] || 1
  }));
  pairs.sort((a, b) => a.value - b.value);
  const total = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  let running = 0;
  for (const pair of pairs) {
    running += pair.weight;
    if (running >= total / 2) return pair.value;
  }
  return pairs[pairs.length - 1].value;
}

function centsBetween(freq, target) {
  return 1200 * Math.log2(freq / target);
}

function frequencyToNoteName(freq) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function buildResult(file, analysis, guitar) {
  if (analysis.error) {
    return {
      file: file.name,
      target: null,
      direction: "unknown",
      analysis,
      message: analysis.error
    };
  }

  let bestTarget = guitar.strings[0];
  let bestCents = Infinity;
  guitar.strings.forEach((string) => {
    const cents = centsBetween(analysis.frequency, string.freq);
    if (Math.abs(cents) < Math.abs(bestCents)) {
      bestCents = cents;
      bestTarget = string;
    }
  });

  let direction = "ok";
  if (bestCents < -ACCEPTABLE_CENTS) direction = "tighten";
  if (bestCents > ACCEPTABLE_CENTS) direction = "loosen";

  return {
    file: file.name,
    target: bestTarget,
    cents: bestCents,
    direction,
    analysis,
    message: tuningMessage(direction, bestCents)
  };
}

function tuningMessage(direction, cents) {
  const abs = Math.abs(cents).toFixed(1);
  if (direction === "tighten") return `偏低 ${abs} cents，需要拧紧`;
  if (direction === "loosen") return `偏高 ${abs} cents，需要放松`;
  return `误差 ${abs} cents，已在可接受范围`;
}

function renderRibbon(results) {
  resultRibbon.innerHTML = "";
  const fragment = document.createDocumentFragment();
  results.forEach((result, index) => {
    const item = document.createElement("div");
    item.className = "result-chip";
    item.style.animationDelay = `${index * 45}ms`;
    if (!result.target) {
      item.innerHTML = `<strong>${escapeHtml(result.file)}</strong><span>${escapeHtml(result.message)}</span>`;
    } else {
      item.innerHTML = `
        <strong>${escapeHtml(result.target.name)}</strong>
        <span>${escapeHtml(result.message)}</span>
      `;
    }
    fragment.appendChild(item);
  });
  resultRibbon.appendChild(fragment);
}

function renderTuningAdviceRibbon(advice) {
  resultRibbon.innerHTML = "";
  const fragment = document.createDocumentFragment();
  advice.forEach((item, index) => {
    const chip = document.createElement("div");
    chip.className = "result-chip";
    chip.style.animationDelay = `${index * 45}ms`;
    chip.innerHTML = `
      <strong>${escapeHtml(item.string.name)}</strong>
      <span>${escapeHtml(item.message)}${item.count ? ` · ${item.count} 个样本` : ""}</span>
    `;
    fragment.appendChild(chip);
  });
  resultRibbon.appendChild(fragment);
}

function showResultDialog(results, guitar) {
  const lines = [];
  lines.push(`${guitar.label}：${guitar.strings.map((item) => item.note).join(" / ")}`);
  lines.push("");
  lines.push(`识别模型：${NOISE_MODEL.name}`);
  lines.push("");
  if (scoreEvents.length) {
    lines.push(`线谱结果：${scoreEvents.length} 个音符，总时长 ${formatTime(scoreDuration)}`);
    const polyphonicCount = scoreEvents.filter((event) => event.polyphonic).length;
    if (polyphonicCount) lines.push(`多弦/和弦识别：${polyphonicCount} 个叠加音符，最高 ${Math.max(...scoreEvents.map((event) => event.voiceCount || 1))} 根弦同时发声`);
    lines.push("");
  }

  const valid = results.filter((result) => result.target);
  if (valid.length) {
    const lows = valid.map((result) => result.analysis.low);
    const highs = valid.map((result) => result.analysis.high);
    lines.push(`检测音域：${Math.min(...lows).toFixed(2)}Hz - ${Math.max(...highs).toFixed(2)}Hz`);
    lines.push("");
  }

  if (!results.length) {
    lines.push("没有可分析的录音。");
  }

  results.forEach((result, index) => {
    lines.push(`${index + 1}. ${result.file}`);
    if (!result.target) {
      lines.push(`   ${result.message}`);
      return;
    }
    if (result.direction === "song") {
      lines.push(`   ${result.message}`);
      lines.push(`   音域：${result.analysis.low.toFixed(2)}Hz - ${result.analysis.high.toFixed(2)}Hz`);
      if (result.analysis.polyphonicEventCount) {
        lines.push(`   多弦/和弦：${result.analysis.polyphonicEventCount} 个叠加音符，最高 ${result.analysis.maxVoices} 根弦`);
      }
      lines.push(`   平均稳定度：${Math.round(result.analysis.confidence * 100)}%`);
      lines.push("   每根弦调音建议：");
      result.analysis.stringAdvice.forEach((item) => {
        lines.push(`   - ${item.string.name}：${item.message}（样本 ${item.count} 个）`);
      });
      return;
    }
    lines.push(`   检测：${result.analysis.frequency.toFixed(2)}Hz（约 ${result.analysis.note}）`);
    lines.push(`   匹配：${result.target.name}，目标 ${result.target.freq.toFixed(2)}Hz`);
    lines.push(`   建议：${result.message}`);
    lines.push(`   稳定度：${Math.round(result.analysis.confidence * 100)}%`);
  });

  const missing = guitar.strings.filter((string) => !valid.some((result) => result.target.note === string.note));
  if (missing.length) {
    lines.push("");
    lines.push(`未覆盖弦：${missing.map((string) => string.name).join("、")}`);
  }

  resultText.textContent = lines.join("\n");
  resultDialog.showModal();
}

function renderStringButtons() {
  const type = guitarType.value;
  const guitar = GUITARS[type];
  stringButtons.innerHTML = "";
  guitar.strings.forEach((string, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "string-tone-button";
    button.textContent = string.note;
    button.dataset.note = string.note;
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `${string.name} 音色`);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectStringTone(type, index);
    });
    stringButtons.appendChild(button);
  });
  syncStringButtonState();
}

function syncStringButtonState() {
  const type = guitarType.value;
  stringButtons.querySelectorAll(".string-tone-button").forEach((button) => {
    button.classList.toggle("is-selected", selectedStringKey === `${type}:${button.dataset.note}`);
  });
}

function positionStringButtons(width, height, guitar, type) {
  if (stringButtons.children.length !== guitar.strings.length) renderStringButtons();
  const count = guitar.strings.length;
  const buttons = Array.from(stringButtons.children);
  buttons.forEach((button, index) => {
    const point = getStringButtonPoint(width, height, type, index, count);
    button.style.left = `${point.x}px`;
    button.style.top = `${point.y}px`;
  });
}

function getStringButtonPoint(width, height, type, index, count) {
  const model = getInstrumentModel(type);
  const ratio = count === 1 ? 0.5 : index / (count - 1);
  const bridgeY = model.bridgeY + (ratio - 0.5) * (count - 1) * model.bridgeSpacing;
  const nutY = (ratio - 0.5) * (count - 1) * model.nutSpacing;
  const step = type === "bass" ? 78 : type === "seven" ? 56 : 64;
  const localX = model.bridgeX + 22 + index * step;
  const amount = clamp((localX - model.bridgeX) / (model.nutX - model.bridgeX), 0, 1);
  const localY = bridgeY + (nutY - bridgeY) * amount;
  return instrumentLocalToViewport(localX, localY, width, height);
}

function instrumentLocalToViewport(localX, localY, width, height) {
  const scale = getBaseGuitarScale(width, height) * guitarView.zoom;
  return {
    x: width / 2 + guitarView.x + localY * scale,
    y: height / 2 + guitarView.y + (86 - localX) * scale
  };
}

function selectStringTone(type, index) {
  const guitar = GUITARS[type];
  const string = guitar.strings[index];
  if (!string) return;
  selectedStringKey = `${type}:${string.note}`;
  animationStart = performance.now();
  syncStringButtonState();
  drawStaffForString(string, type);
  playStringTone(string, type);
}

function getSelectedString() {
  const type = guitarType.value;
  const note = selectedStringKey.startsWith(`${type}:`) ? selectedStringKey.slice(type.length + 1) : "";
  return GUITARS[type].strings.find((string) => string.note === note) || null;
}

function getToneContext() {
  if (!audioToneContext) {
    audioToneContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioToneContext;
}

function stopActiveToneNodes() {
  activeToneNodes.forEach((node) => {
    try {
      if (typeof node.stop === "function") node.stop();
    } catch {
      // The node may already have finished its envelope.
    }
    try {
      if (typeof node.disconnect === "function") node.disconnect();
    } catch {
      // Finished nodes are safe to ignore.
    }
  });
  activeToneNodes = [];
}

function playStringTone(string, type) {
  const audioContext = getToneContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  stopActiveToneNodes();
  const profile = getCurrentTimbreProfile(type);
  scheduleSynthTone(string.freq, audioContext.currentTime + 0.02, profile.duration, type, true);
}

function scheduleSynthTone(frequency, when, requestedDuration, type, trackTimeout = false) {
  const audioContext = getToneContext();
  const profile = getCurrentTimbreProfile(type);
  const duration = Math.max(0.08, Math.min(requestedDuration || profile.duration, profile.mute || profile.duration));
  const output = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const compressor = audioContext.createDynamicsCompressor();

  output.gain.setValueAtTime(0.0001, when);
  output.gain.exponentialRampToValueAtTime(profile.gain || 0.34, when + profile.attack);
  output.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  filter.type = profile.filterType;
  filter.frequency.setValueAtTime(profile.filterFreq, when);
  filter.Q.setValueAtTime(profile.filterQ || 0.8, when);
  compressor.threshold.setValueAtTime(profile.distortion ? -24 : -18, when);
  compressor.ratio.setValueAtTime(profile.distortion ? 5 : 3, when);
  compressor.attack.setValueAtTime(0.004, when);
  compressor.release.setValueAtTime(0.18, when);

  let chainTail = filter;
  if (profile.distortion) {
    const shaper = audioContext.createWaveShaper();
    shaper.curve = createDistortionCurve(profile.distortion);
    shaper.oversample = "4x";
    filter.connect(shaper);
    chainTail = shaper;
    activeToneNodes.push(shaper);
  }

  chainTail.connect(compressor);
  compressor.connect(output);
  output.connect(audioContext.destination);
  activeToneNodes.push(filter, compressor, output);

  if (profile.delayTime) {
    const delay = audioContext.createDelay(1.2);
    const feedback = audioContext.createGain();
    const wet = audioContext.createGain();
    delay.delayTime.setValueAtTime(profile.delayTime, when);
    feedback.gain.setValueAtTime(profile.delayFeedback || 0.28, when);
    wet.gain.setValueAtTime(profile.delayMix || 0.28, when);
    compressor.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(output);
    activeToneNodes.push(delay, feedback, wet);
  }

  profile.waves.forEach((wave, waveIndex) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave.type;
    oscillator.frequency.setValueAtTime(frequency * wave.mult, when);
    oscillator.detune.setValueAtTime(waveIndex === 0 ? 0 : (waveIndex - 1) * 3, when);
    gain.gain.setValueAtTime(wave.gain, when);
    oscillator.connect(gain);
    gain.connect(filter);
    oscillator.start(when + (profile.microSpread ? waveIndex * profile.microSpread : 0));
    oscillator.stop(when + duration + 0.05);
    activeToneNodes.push(oscillator, gain);
  });

  addPluckNoise(audioContext, filter, when, profile, type);
  if (trackTimeout) window.setTimeout(stopFinishedToneNodes, (duration + 0.55) * 1000);
}

function createDistortionCurve(amount) {
  const samples = 2048;
  const curve = new Float32Array(samples);
  const drive = amount || 50;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + drive) * x * 20 * (Math.PI / 180)) / (Math.PI + drive * Math.abs(x));
  }
  return curve;
}

function addPluckNoise(audioContext, destination, now, profile, type) {
  const length = Math.floor(audioContext.sampleRate * (profile.noiseLength || 0.035));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(type === "bass" ? 90 : 160, now);
  gain.gain.setValueAtTime(profile.noiseGain || 0.02, now);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(now);
  source.stop(now + 0.04);
  activeToneNodes.push(source, gain, filter);
}

function stopFinishedToneNodes() {
  activeToneNodes = activeToneNodes.filter((node) => {
    return !(typeof AudioScheduledSourceNode !== "undefined" && node instanceof AudioScheduledSourceNode);
  });
}

function drawStaffForString(string = null, type = guitarType.value) {
  resizeStaffCanvas();
  const dpr = window.devicePixelRatio || 1;
  const width = staffCanvas.width / dpr;
  const height = staffCanvas.height / dpr;
  staffCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  staffCtx.clearRect(0, 0, width, height);

  if (scoreEvents.length) {
    drawScoreTimeline(width, height, type);
    return;
  }

  const lineGap = Math.min(12, Math.max(9, height / 10));
  const topY = height * 0.2;
  const bottomY = topY + lineGap * 4;
  const leftX = 82;
  const rightX = width - 26;

  staffCtx.strokeStyle = "rgba(17,17,17,0.72)";
  staffCtx.lineWidth = 1.2;
  for (let line = 0; line < 5; line++) {
    const y = topY + line * lineGap;
    staffCtx.beginPath();
    staffCtx.moveTo(leftX, y);
    staffCtx.lineTo(rightX, y);
    staffCtx.stroke();
  }

  staffCtx.fillStyle = "#111111";
  staffCtx.font = `${type === "bass" ? 44 : 48}px Georgia, serif`;
  staffCtx.textAlign = "center";
  staffCtx.textBaseline = "middle";
  staffCtx.fillText(type === "bass" ? "𝄢" : "𝄞", 44, topY + lineGap * 2);

  if (!string) {
    staffName.textContent = "选择弦音";
    staffMeta.textContent = "-- Hz";
    staffCtx.fillStyle = "rgba(17,17,17,0.42)";
    staffCtx.font = "15px SimHei, Microsoft YaHei, Arial, sans-serif";
    staffCtx.textAlign = "center";
    staffCtx.fillText("—", width * 0.56, topY + lineGap * 2);
    return;
  }

  staffName.textContent = `${GUITARS[type].label} · ${string.name}`;
  staffMeta.textContent = `${string.freq.toFixed(2)} Hz`;
  drawStaffNote(string, type, leftX, rightX, bottomY, lineGap);
}

function drawScoreTimeline(width, height, type = guitarType.value) {
  const lineGap = Math.min(12, Math.max(9, height / 10));
  const topY = height * 0.15;
  const bottomY = topY + lineGap * 4;
  const leftX = 76;
  const rightX = width - 22;
  const endTime = Math.min(scoreDuration, scoreViewStart + scoreViewDuration);
  const visibleEvents = getVisibleScoreEvents();
  updateScoreSlider();

  staffName.textContent = selectedScoreIndex >= 0
    ? `线谱 · ${scoreEvents[selectedScoreIndex].note} · ${scoreEvents[selectedScoreIndex].stringName} ${scoreEvents[selectedScoreIndex].fret}品`
    : `线谱 · ${scoreEvents.length} 个音符`;
  staffMeta.textContent = `${formatTime(scoreViewStart)} - ${formatTime(endTime)} / ${formatTime(scoreDuration)}`;

  staffCtx.strokeStyle = "rgba(17,17,17,0.72)";
  staffCtx.lineWidth = 1.2;
  for (let line = 0; line < 5; line++) {
    const y = topY + line * lineGap;
    staffCtx.beginPath();
    staffCtx.moveTo(leftX, y);
    staffCtx.lineTo(rightX, y);
    staffCtx.stroke();
  }

  staffCtx.fillStyle = "#111111";
  staffCtx.font = `${type === "bass" ? 42 : 46}px Georgia, serif`;
  staffCtx.textAlign = "center";
  staffCtx.textBaseline = "middle";
  staffCtx.fillText(type === "bass" ? "𝄢" : "𝄞", 38, topY + lineGap * 2);

  staffCtx.strokeStyle = "rgba(47,141,255,0.35)";
  staffCtx.lineWidth = 1;
  staffCtx.beginPath();
  staffCtx.moveTo(leftX, height - 14);
  staffCtx.lineTo(rightX, height - 14);
  staffCtx.stroke();

  const labelEvery = Math.max(2, Math.ceil(scoreViewDuration / 6));
  staffCtx.fillStyle = "rgba(17,17,17,0.48)";
  staffCtx.font = "11px SimHei, Microsoft YaHei, Arial, sans-serif";
  staffCtx.textAlign = "center";
  for (let t = Math.ceil(scoreViewStart); t <= endTime; t += labelEvery) {
    const x = scoreTimeToX(t, leftX, rightX);
    staffCtx.beginPath();
    staffCtx.moveTo(x, height - 19);
    staffCtx.lineTo(x, height - 9);
    staffCtx.stroke();
    staffCtx.fillText(formatTime(t), x, height - 1);
  }

  const showLabels = visibleEvents.length <= 34;
  drawChordConnectors(visibleEvents, type, leftX, rightX, bottomY, lineGap);
  visibleEvents.forEach(({ event, index }) => {
    drawScoreEvent(event, index, type, leftX, rightX, bottomY, lineGap, showLabels);
  });

  if (!visibleEvents.length) {
    staffCtx.fillStyle = "rgba(17,17,17,0.42)";
    staffCtx.font = "14px SimHei, Microsoft YaHei, Arial, sans-serif";
    staffCtx.fillText("当前时间段没有音符，可在五线谱上滚动查看", width * 0.55, topY + lineGap * 2);
  }
}

function drawChordConnectors(visibleEvents, type, leftX, rightX, bottomY, lineGap) {
  const groups = new Map();
  visibleEvents.forEach(({ event }) => {
    if (!event.polyphonic && (event.voiceCount || 1) <= 1) return;
    const key = Math.round(event.start / 0.06);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });

  staffCtx.save();
  groups.forEach((events) => {
    if (events.length < 2) return;
    const x = scoreTimeToX(events[0].start, leftX, rightX);
    const ys = events.map((event) => midiToStaffY(event.midi, type, bottomY, lineGap));
    const top = Math.min(...ys) - 10;
    const bottom = Math.max(...ys) + 10;
    staffCtx.strokeStyle = "rgba(214, 31, 168, 0.5)";
    staffCtx.lineWidth = 1.4;
    staffCtx.beginPath();
    staffCtx.moveTo(x - 15, top);
    staffCtx.lineTo(x - 15, bottom);
    staffCtx.stroke();
    staffCtx.fillStyle = "rgba(214, 31, 168, 0.16)";
    roundStaffRect(x - 18, top, 6, Math.max(8, bottom - top), 3, true);
  });
  staffCtx.restore();
}

function drawScoreEvent(event, index, type, leftX, rightX, bottomY, lineGap, showLabel) {
  const noteX = scoreTimeToX(event.start, leftX, rightX);
  const noteY = midiToStaffY(event.midi, type, bottomY, lineGap);
  const selected = index === selectedScoreIndex;
  const noteColor = event.polyphonic ? "#d61fa8" : "#111111";
  const eventEndX = scoreTimeToX(event.start + event.duration, leftX, rightX);
  const barWidth = Math.max(10, eventEndX - noteX);

  staffCtx.save();
  staffCtx.strokeStyle = selected ? "#2f8dff" : event.polyphonic ? "rgba(214,31,168,0.82)" : "rgba(17,17,17,0.78)";
  staffCtx.lineWidth = selected ? 2.2 : 1.2;
  drawLedgerLinesForY(noteX, noteY, bottomY, lineGap);

  staffCtx.globalAlpha = selected ? 0.22 : 0.12;
  staffCtx.fillStyle = selected ? "#2f8dff" : noteColor;
  roundStaffRect(noteX - 3, bottomY + lineGap * 1.3, barWidth, 6, 3, true);
  staffCtx.globalAlpha = 1;

  staffCtx.translate(noteX, noteY);
  staffCtx.rotate(-0.22);
  staffCtx.fillStyle = selected ? "#2f8dff" : noteColor;
  staffCtx.beginPath();
  staffCtx.ellipse(0, 0, selected ? 12 : 10, selected ? 7.5 : 6.5, 0, 0, Math.PI * 2);
  staffCtx.fill();
  staffCtx.restore();

  staffCtx.save();
  staffCtx.strokeStyle = selected ? "#2f8dff" : noteColor;
  staffCtx.lineWidth = selected ? 2.4 : 2;
  const stemUp = noteY > bottomY - lineGap * 2;
  const stemX = noteX + (stemUp ? 9 : -9);
  staffCtx.beginPath();
  staffCtx.moveTo(stemX, noteY);
  staffCtx.lineTo(stemX, noteY + (stemUp ? -38 : 38));
  staffCtx.stroke();
  staffCtx.restore();

  if (showLabel) {
    staffCtx.fillStyle = selected ? "#0e5bd8" : "rgba(17,17,17,0.62)";
    staffCtx.font = "11px SimHei, Microsoft YaHei, Arial, sans-serif";
    staffCtx.textAlign = "center";
    staffCtx.textBaseline = "top";
    staffCtx.fillText(`${event.note} · ${event.stringName.split(" ")[0]}${event.fret}品`, noteX, bottomY + lineGap * 1.7);
  }
}

function drawLedgerLinesForY(noteX, noteY, bottomY, lineGap) {
  const topLine = bottomY - lineGap * 4;
  staffCtx.beginPath();
  if (noteY > bottomY + lineGap / 2) {
    for (let y = bottomY + lineGap; y <= noteY + 1; y += lineGap) {
      staffCtx.moveTo(noteX - 17, y);
      staffCtx.lineTo(noteX + 17, y);
    }
  }
  if (noteY < topLine - lineGap / 2) {
    for (let y = topLine - lineGap; y >= noteY - 1; y -= lineGap) {
      staffCtx.moveTo(noteX - 17, y);
      staffCtx.lineTo(noteX + 17, y);
    }
  }
  staffCtx.stroke();
}

function midiToStaffY(midi, type, bottomY, lineGap) {
  const note = midiToNoteName(midi);
  const parsed = parseNoteName(note);
  if (!parsed) return bottomY;
  const displayOctave = parsed.octave + 1;
  const bottomLine = type === "bass" ? { letter: "G", octave: 2 } : { letter: "E", octave: 4 };
  const step = diatonicIndex(parsed.letter, displayOctave) - diatonicIndex(bottomLine.letter, bottomLine.octave);
  return bottomY - step * (lineGap / 2);
}

function scoreTimeToX(time, leftX, rightX) {
  const amount = (time - scoreViewStart) / Math.max(0.001, scoreViewDuration);
  return leftX + clamp(amount, 0, 1) * (rightX - leftX);
}

function getVisibleScoreEvents() {
  const end = scoreViewStart + scoreViewDuration;
  return scoreEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.start + event.duration >= scoreViewStart && event.start <= end);
}

function roundStaffRect(x, y, width, height, radius, fill) {
  const r = Math.min(radius, width / 2, height / 2);
  staffCtx.beginPath();
  staffCtx.moveTo(x + r, y);
  staffCtx.arcTo(x + width, y, x + width, y + height, r);
  staffCtx.arcTo(x + width, y + height, x, y + height, r);
  staffCtx.arcTo(x, y + height, x, y, r);
  staffCtx.arcTo(x, y, x + width, y, r);
  staffCtx.closePath();
  if (fill) staffCtx.fill();
  else staffCtx.stroke();
}

function selectScoreEvent(index, playSingle = true) {
  if (index < 0 || index >= scoreEvents.length) return;
  selectedScoreIndex = index;
  const event = scoreEvents[index];
  selectedStringKey = `${guitarType.value}:${event.stringNote}`;
  syncStringButtonState();
  ensureScoreEventVisible(event);
  updateScoreButtons();
  drawStaffForString(getSelectedString(), guitarType.value);
  showSingleScoreAdvice(event);
  if (playSingle) playScoreEvent(index);
}

function showSingleScoreAdvice(event) {
  const advice = getScoreEventTuningAdvice(event);
  statusText.textContent = advice;
  resultRibbon.innerHTML = "";
  const item = document.createElement("div");
  item.className = "result-chip";
  item.innerHTML = `<strong>${escapeHtml(event.note)} · ${escapeHtml(event.stringName)}</strong><span>${escapeHtml(advice)}</span>`;
  resultRibbon.appendChild(item);
}

function ensureScoreEventVisible(event) {
  if (!event) return;
  const pad = Math.min(2.5, scoreViewDuration * 0.16);
  if (event.start < scoreViewStart + pad) {
    scoreViewStart = clamp(event.start - pad, 0, Math.max(0, scoreDuration - scoreViewDuration));
  } else if (event.start > scoreViewStart + scoreViewDuration - pad) {
    scoreViewStart = clamp(event.start - scoreViewDuration + pad, 0, Math.max(0, scoreDuration - scoreViewDuration));
  }
}

function getScoreEventAtCanvasPoint(clientX, clientY) {
  if (!scoreEvents.length) return -1;
  const rect = staffCanvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const width = rect.width;
  const height = rect.height;
  const lineGap = Math.min(12, Math.max(9, height / 10));
  const bottomY = height * 0.24 + lineGap * 4;
  const leftX = 76;
  const rightX = width - 22;
  let bestIndex = -1;
  let bestDistance = Infinity;

  getVisibleScoreEvents().forEach(({ event, index }) => {
    const noteX = scoreTimeToX(event.start, leftX, rightX);
    const noteY = midiToStaffY(event.midi, guitarType.value, bottomY, lineGap);
    const distance = Math.hypot(noteX - x, (noteY - y) * 1.4);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestDistance <= 34 ? bestIndex : -1;
}

function playScoreEvent(index) {
  if (index < 0 || index >= scoreEvents.length) return;
  stopScorePlayback();
  stopActiveToneNodes();
  const audioContext = getToneContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  scheduleScoreTone(scoreEvents[index], audioContext.currentTime + 0.035, guitarType.value);
}

function playScoreFromSelected() {
  if (!scoreEvents.length) return;
  const index = selectedScoreIndex >= 0 ? selectedScoreIndex : 0;
  startScorePlayback(index);
}

function startScorePlayback(index) {
  if (!scoreEvents.length) return;
  stopScorePlayback();
  stopActiveToneNodes();
  const audioContext = getToneContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  const startEvent = scoreEvents[index] || scoreEvents[0];
  selectedScoreIndex = index;
  scorePlayback = {
    timer: null,
    nextIndex: index,
    type: guitarType.value,
    scoreStart: startEvent.start,
    audioStart: audioContext.currentTime + 0.08
  };
  updateScoreButtons();
  tickScorePlayback();
  scorePlayback.timer = window.setInterval(tickScorePlayback, 80);
}

function tickScorePlayback() {
  if (!scorePlayback) return;
  const audioContext = getToneContext();
  const elapsed = audioContext.currentTime - scorePlayback.audioStart;
  const currentScoreTime = scorePlayback.scoreStart + Math.max(0, elapsed);
  const scheduleAhead = 0.85;

  while (
    scorePlayback.nextIndex < scoreEvents.length &&
    scoreEvents[scorePlayback.nextIndex].start - scorePlayback.scoreStart <= elapsed + scheduleAhead
  ) {
    const event = scoreEvents[scorePlayback.nextIndex];
    const when = scorePlayback.audioStart + (event.start - scorePlayback.scoreStart);
    scheduleScoreTone(event, Math.max(audioContext.currentTime + 0.01, when), scorePlayback.type);
    scorePlayback.nextIndex++;
  }

  const activeIndex = findScoreIndexAtTime(currentScoreTime);
  if (activeIndex >= 0 && activeIndex !== selectedScoreIndex) {
    selectedScoreIndex = activeIndex;
    const active = scoreEvents[activeIndex];
    selectedStringKey = `${guitarType.value}:${active.stringNote}`;
    ensureScoreEventVisible(active);
    syncStringButtonState();
    drawStaffForString(getSelectedString(), guitarType.value);
  }

  if (scorePlayback.nextIndex >= scoreEvents.length && currentScoreTime > scoreDuration + 0.5) {
    stopScorePlayback(false);
  }
}

function findScoreIndexAtTime(time) {
  for (let i = selectedScoreIndex >= 0 ? selectedScoreIndex : 0; i < scoreEvents.length; i++) {
    const event = scoreEvents[i];
    if (time >= event.start && time <= event.start + event.duration) return i;
    if (event.start > time) return Math.max(0, i - 1);
  }
  return scoreEvents.length ? scoreEvents.length - 1 : -1;
}

function stopScorePlayback(stopNodes = true) {
  if (scorePlayback?.timer) window.clearInterval(scorePlayback.timer);
  scorePlayback = null;
  if (stopNodes) stopActiveToneNodes();
  updateScoreButtons();
}

function scheduleScoreTone(event, when, type) {
  scheduleSynthTone(event.freq, when, clamp(event.duration || 0.35, 0.12, 3.8), type, false);
}

function updateScoreButtons() {
  const hasScore = scoreEvents.length > 0;
  exportScoreButton.disabled = !hasScore;
  playFromScoreButton.disabled = !hasScore;
  stopScoreButton.disabled = !scorePlayback;
  updateScoreSlider();
}

function updateScoreSlider() {
  const maxStart = Math.max(0, scoreDuration - scoreViewDuration);
  scoreSlider.disabled = !scoreEvents.length || maxStart <= 0;
  scoreSlider.max = String(maxStart);
  scoreSlider.value = String(clamp(scoreViewStart, 0, maxStart));
}

function exportScore() {
  if (!scoreEvents.length) return;
  const payload = {
    version: 1,
    app: "Guitar Tuner Song Score",
    createdAt: new Date().toISOString(),
    guitarType: guitarType.value,
    model: NOISE_MODEL.name,
    duration: scoreDuration,
    events: scoreEvents
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `guitar-score-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importScoreFile(file) {
  if (!file) return;
  const data = JSON.parse(await file.text());
  if (!Array.isArray(data.events)) throw new Error("线谱文件缺少 events 数组");
  if (data.guitarType && GUITARS[data.guitarType]) {
    guitarType.value = data.guitarType;
    renderStringButtons();
  }
  stopScorePlayback();
  scoreEvents = data.events
    .map((event, index) => normalizeImportedScoreEvent(event, index))
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
  scoreDuration = Number(data.duration) || scoreEvents.reduce((max, event) => Math.max(max, event.start + event.duration), 0);
  selectedScoreIndex = scoreEvents.length ? 0 : -1;
  scoreViewStart = 0;
  updateScoreButtons();
  drawStaffForString(getSelectedString(), guitarType.value);
  statusText.textContent = `已导入 ${scoreEvents.length} 个音符`;
}

function normalizeImportedScoreEvent(event, index) {
  const midi = Number.isFinite(event.midi) ? Math.round(event.midi) : Math.round(frequencyToMidi(Number(event.freq)));
  if (!Number.isFinite(midi)) return null;
  const guitar = GUITARS[guitarType.value];
  const playable = mapMidiToGuitar(midi, guitar) || { stringIndex: 0, fret: 0 };
  const string = guitar.strings[playable.stringIndex] || guitar.strings[0];
  const targetFreq = Number(event.targetFreq) || midiToFrequency(midi);
  const measuredFreq = Number(event.measuredFreq) || Number(event.freq) || targetFreq;
  return {
    id: String(event.id ?? index),
    start: Math.max(0, Number(event.start) || 0),
    duration: Math.max(0.08, Number(event.duration) || 0.3),
    midi,
    note: event.note || midiToNoteName(midi),
    freq: measuredFreq,
    measuredFreq,
    targetFreq,
    cents: Number.isFinite(event.cents) ? event.cents : centsBetween(measuredFreq, targetFreq),
    stringIndex: playable.stringIndex,
    stringName: string.name,
    stringNote: string.note,
    fret: Number.isFinite(event.fret) ? event.fret : playable.fret,
    confidence: Number(event.confidence) || 1,
    voiceCount: Math.max(1, Math.round(Number(event.voiceCount) || 1)),
    polyphonic: Boolean(event.polyphonic),
    source: event.source || "imported",
    file: event.file || "imported"
  };
}

function remapScoreEventsToGuitar() {
  const guitar = GUITARS[guitarType.value];
  scoreEvents = scoreEvents.map((event) => {
    const playable = mapMidiToGuitar(event.midi, guitar) || { stringIndex: 0, fret: 0 };
    const string = guitar.strings[playable.stringIndex] || guitar.strings[0];
    return {
      ...event,
      stringIndex: playable.stringIndex,
      stringName: string.name,
      stringNote: string.note,
      fret: playable.fret
    };
  });
}

function drawStaffNote(string, type, leftX, rightX, bottomY, lineGap) {
  const parsed = parseNoteName(string.note);
  if (!parsed) return;

  const displayOctave = parsed.octave + 1;
  const bottomLine = type === "bass" ? { letter: "G", octave: 2 } : { letter: "E", octave: 4 };
  const step = diatonicIndex(parsed.letter, displayOctave) - diatonicIndex(bottomLine.letter, bottomLine.octave);
  const noteX = leftX + (rightX - leftX) * 0.46;
  const noteY = bottomY - step * (lineGap / 2);

  staffCtx.save();
  staffCtx.strokeStyle = "rgba(17,17,17,0.78)";
  staffCtx.lineWidth = 1.2;
  for (let ledger = -2; ledger >= step; ledger -= 2) {
    const y = bottomY - ledger * (lineGap / 2);
    drawLedgerLine(noteX, y);
  }
  for (let ledger = 10; ledger <= step; ledger += 2) {
    const y = bottomY - ledger * (lineGap / 2);
    drawLedgerLine(noteX, y);
  }

  staffCtx.translate(noteX, noteY);
  staffCtx.rotate(-0.22);
  staffCtx.fillStyle = "#111111";
  staffCtx.beginPath();
  staffCtx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
  staffCtx.fill();
  staffCtx.restore();

  staffCtx.save();
  staffCtx.strokeStyle = "#111111";
  staffCtx.lineWidth = 2;
  const stemUp = step < 4;
  const stemX = noteX + (stemUp ? 9 : -9);
  staffCtx.beginPath();
  staffCtx.moveTo(stemX, noteY);
  staffCtx.lineTo(stemX, noteY + (stemUp ? -44 : 44));
  staffCtx.stroke();
  staffCtx.restore();

  if (parsed.accidental) {
    staffCtx.fillStyle = "#111111";
    staffCtx.font = "22px Georgia, serif";
    staffCtx.textAlign = "center";
    staffCtx.textBaseline = "middle";
    staffCtx.fillText("♯", noteX - 28, noteY - 1);
  }

  staffCtx.fillStyle = "rgba(17,17,17,0.68)";
  staffCtx.font = "14px SimHei, Microsoft YaHei, Arial, sans-serif";
  staffCtx.textAlign = "center";
  staffCtx.fillText(`${string.note} 实音`, noteX + 76, noteY);
}

function drawLedgerLine(x, y) {
  staffCtx.beginPath();
  staffCtx.moveTo(x - 18, y);
  staffCtx.lineTo(x + 18, y);
  staffCtx.stroke();
}

function parseNoteName(note) {
  const match = String(note).replace("♯", "#").match(/^([A-G])([#]?)(-?\d+)$/);
  if (!match) return null;
  return {
    letter: match[1],
    accidental: match[2],
    octave: Number(match[3])
  };
}

function diatonicIndex(letter, octave) {
  const order = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  return octave * 7 + order[letter];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetGuitarViewState() {
  guitarView = { x: 0, y: 0, zoom: 1 };
}

function zoomGuitarAt(clientX, clientY, nextZoom) {
  const rect = canvas.getBoundingClientRect();
  const oldZoom = guitarView.zoom;
  const zoom = clamp(nextZoom, 0.56, 1.9);
  if (Math.abs(zoom - oldZoom) < 0.001) return;

  const baseScale = getBaseGuitarScale(rect.width, rect.height);
  const localX = (clientX - rect.left - rect.width / 2 - guitarView.x) / (baseScale * oldZoom);
  const localY = (clientY - rect.top - rect.height / 2 - guitarView.y) / (baseScale * oldZoom);
  guitarView.x = clientX - rect.left - rect.width / 2 - localX * baseScale * zoom;
  guitarView.y = clientY - rect.top - rect.height / 2 - localY * baseScale * zoom;
  guitarView.zoom = zoom;
}

function zoomGuitarFromCenter(factor) {
  const rect = canvas.getBoundingClientRect();
  zoomGuitarAt(rect.left + rect.width / 2, rect.top + rect.height / 2, guitarView.zoom * factor);
}

function getPointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getPointerCenter(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function beginPointerSnapshot() {
  const pointers = Array.from(activePointers.values());
  if (pointers.length >= 2) {
    const [a, b] = pointers;
    dragSnapshot = {
      mode: "pinch",
      distance: getPointerDistance(a, b),
      center: getPointerCenter(a, b),
      x: guitarView.x,
      y: guitarView.y,
      zoom: guitarView.zoom
    };
  } else if (pointers.length === 1) {
    dragSnapshot = {
      mode: "pan",
      point: pointers[0],
      x: guitarView.x,
      y: guitarView.y
    };
  } else {
    dragSnapshot = null;
  }
}

function updatePointerView() {
  if (!dragSnapshot) return;
  const pointers = Array.from(activePointers.values());
  if (dragSnapshot.mode === "pinch" && pointers.length >= 2) {
    const [a, b] = pointers;
    const center = getPointerCenter(a, b);
    const distance = Math.max(1, getPointerDistance(a, b));
    guitarView.zoom = clamp(dragSnapshot.zoom * (distance / Math.max(1, dragSnapshot.distance)), 0.56, 1.9);
    guitarView.x = dragSnapshot.x + center.x - dragSnapshot.center.x;
    guitarView.y = dragSnapshot.y + center.y - dragSnapshot.center.y;
    return;
  }

  if (dragSnapshot.mode === "pan" && pointers.length === 1) {
    guitarView.x = dragSnapshot.x + pointers[0].x - dragSnapshot.point.x;
    guitarView.y = dragSnapshot.y + pointers[0].y - dragSnapshot.point.y;
  }
}

audioInput.addEventListener("change", (event) => {
  selectedFiles = Array.from(event.target.files || []);
  statusText.textContent = selectedFiles.length ? `已读取 ${selectedFiles.length} 段录音` : "等待录音";
  latestResults = [];
  resultRibbon.innerHTML = "";
  updateFileList();
});

guitarType.addEventListener("change", () => {
  animationStart = performance.now();
  latestResults = [];
  selectedStringKey = "";
  resultRibbon.innerHTML = "";
  resetGuitarViewState();
  updateTimbreOptions();
  if (scoreEvents.length) remapScoreEventsToGuitar();
  renderStringButtons();
  drawStaffForString();
  statusText.textContent = selectedFiles.length ? `已读取 ${selectedFiles.length} 段录音` : "等待录音";
});

timbreType.addEventListener("change", () => {
  const selected = getSelectedString();
  if (selected) playStringTone(selected, guitarType.value);
});

analyzeButton.addEventListener("click", analyzeFiles);
exportScoreButton.addEventListener("click", exportScore);
playFromScoreButton.addEventListener("click", playScoreFromSelected);
stopScoreButton.addEventListener("click", () => stopScorePlayback());

scoreInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importScoreFile(file);
  } catch (error) {
    console.error(error);
    resultText.textContent = `无法导入线谱。\n\n${error.message || error}`;
    resultDialog.showModal();
  } finally {
    scoreInput.value = "";
  }
});

zoomOut.addEventListener("click", () => zoomGuitarFromCenter(0.88));
zoomIn.addEventListener("click", () => zoomGuitarFromCenter(1.14));
resetView.addEventListener("click", resetGuitarViewState);

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  beginPointerSnapshot();
  canvas.classList.add("is-dragging");
  event.preventDefault();
});

canvas.addEventListener("pointermove", (event) => {
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  updatePointerView();
  event.preventDefault();
});

function endCanvasPointer(event) {
  activePointers.delete(event.pointerId);
  beginPointerSnapshot();
  if (!activePointers.size) canvas.classList.remove("is-dragging");
}

canvas.addEventListener("pointerup", endCanvasPointer);
canvas.addEventListener("pointercancel", endCanvasPointer);
canvas.addEventListener("lostpointercapture", endCanvasPointer);

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    zoomGuitarAt(event.clientX, event.clientY, guitarView.zoom * Math.exp(-event.deltaY * 0.0012));
  },
  { passive: false }
);

staffCanvas.addEventListener("click", (event) => {
  const index = getScoreEventAtCanvasPoint(event.clientX, event.clientY);
  if (index >= 0) selectScoreEvent(index, true);
});

staffCanvas.addEventListener(
  "wheel",
  (event) => {
    if (!scoreEvents.length) return;
    event.preventDefault();
    const delta = event.deltaY || event.deltaX;
    const maxStart = Math.max(0, scoreDuration - scoreViewDuration);
    scoreViewStart = clamp(scoreViewStart + Math.sign(delta) * scoreViewDuration * 0.22, 0, maxStart);
    drawStaffForString(getSelectedString(), guitarType.value);
  },
  { passive: false }
);

scoreSlider.addEventListener("input", () => {
  scoreViewStart = Number(scoreSlider.value) || 0;
  drawStaffForString(getSelectedString(), guitarType.value);
});

closeDialog.addEventListener("click", () => {
  resultDialog.close();
});

resultDialog.addEventListener("click", (event) => {
  const rect = resultDialog.getBoundingClientRect();
  const isInside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!isInside) resultDialog.close();
});

window.addEventListener("resize", () => {
  resizeCanvas();
  drawStaffForString(getSelectedString(), guitarType.value);
});

updateFileList();
updateTimbreOptions();
renderStringButtons();
updateScoreButtons();
drawStaffForString();
requestAnimationFrame(drawGuitar);
