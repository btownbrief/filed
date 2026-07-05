// FILED! — procedural South End Burlington backdrop with seasons.
// The static parts render once to an offscreen canvas; weather particles animate live.

export function currentSeason() {
  const q = new URLSearchParams(location.search).get('season');
  if (['winter', 'spring', 'summer', 'fall'].includes(q)) return q;
  const m = new Date().getMonth(); // 0-11
  if (m === 11 || m <= 2) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 8) return 'summer';
  return 'fall';
}

export const PALETTES = {
  winter: {
    skyTop: '#8fb6d9', skyBot: '#e3ecf2', sun: '#f4f7fa',
    mountFar: '#b6c9dd', mountNear: '#93aac4',
    lake: '#7d9db8', lakeGlint: '#c4d8e6',
    ground: '#e6ecf0', groundEdge: '#c9d4dc', sidewalk: '#d5dde3',
    brickA: '#8e5344', brickB: '#6b4a52', roof: '#e8eef2',
    tree: null, treeTrunk: '#5d5048',
    wx: 'snow',
  },
  spring: {
    skyTop: '#7fa8c9', skyBot: '#cfe0d8', sun: '#fbf3d0',
    mountFar: '#9db4a8', mountNear: '#7a9a85',
    lake: '#5f8aa6', lakeGlint: '#a8c8d4',
    ground: '#8fb06a', groundEdge: '#75975a', sidewalk: '#b8bfc2',
    brickA: '#9e5a43', brickB: '#7a5158', roof: '#77828c',
    tree: '#9dc46a', treeTrunk: '#6b5a48',
    wx: 'rain',
  },
  summer: {
    skyTop: '#4f97d4', skyBot: '#bfe0ef', sun: '#ffec9e',
    mountFar: '#7fa3b8', mountNear: '#5c8a6e',
    lake: '#3f7fa8', lakeGlint: '#9fd4e8',
    ground: '#6da84f', groundEdge: '#578a3f', sidewalk: '#c2c8ca',
    brickA: '#a85c40', brickB: '#845560', roof: '#6d7880',
    tree: '#4d8a3a', treeTrunk: '#66513e',
    wx: 'none',
  },
  fall: {
    skyTop: '#7796b8', skyBot: '#e8d5b0', sun: '#f7dc9a',
    mountFar: '#a08e9a', mountNear: '#8a7562',
    lake: '#54748f', lakeGlint: '#b0c4cc',
    ground: '#b08d4a', groundEdge: '#93743c', sidewalk: '#c0c2c0',
    brickA: '#96503c', brickB: '#75505a', roof: '#77726a',
    tree: 'fall', treeTrunk: '#5d4a38',
    wx: 'leaves',
  },
};

const FALL_COLORS = ['#d9822b', '#c9542e', '#e0a832', '#a83a28', '#b8862c'];

// deterministic pseudo-random
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawTree(ctx, x, gy, size, pal, rnd) {
  ctx.fillStyle = pal.treeTrunk;
  ctx.fillRect(x - size * 0.05, gy - size * 0.5, size * 0.1, size * 0.5);
  if (pal.tree === null) {
    // bare winter branches with snow dusting
    ctx.strokeStyle = pal.treeTrunk; ctx.lineWidth = size * 0.04; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, gy - size * 0.45);
      ctx.lineTo(x + Math.cos(a) * size * 0.45, gy - size * 0.45 + Math.sin(a) * size * 0.45);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(x, gy - size * 0.75, size * 0.09, 0, 7); ctx.fill();
  } else {
    for (let i = 0; i < 3; i++) {
      const cx = x + (rnd() - 0.5) * size * 0.5;
      const cy = gy - size * (0.55 + rnd() * 0.35);
      ctx.fillStyle = pal.tree === 'fall'
        ? FALL_COLORS[Math.floor(rnd() * FALL_COLORS.length)]
        : pal.tree;
      ctx.beginPath(); ctx.arc(cx, cy, size * (0.22 + rnd() * 0.14), 0, 7); ctx.fill();
    }
  }
}

function drawBuilding(ctx, x, gy, w, h, color, roofColor, rnd, pal, snow) {
  ctx.fillStyle = color;
  ctx.fillRect(x, gy - h, w, h);
  // simple brick courses
  ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1;
  for (let yy = gy - h + 8; yy < gy; yy += 9) {
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
  }
  // windows (some lit warm — Vermont dusk energy)
  const cols = Math.max(2, Math.floor(w / 26));
  const rows = Math.max(2, Math.floor(h / 34));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const wx = x + w * (c + 0.5) / cols - 5;
      const wy = gy - h + h * (r + 0.35) / rows - 7;
      ctx.fillStyle = rnd() < 0.3 ? '#f3d98a' : 'rgba(28,38,48,.75)';
      ctx.fillRect(wx, wy, 10, 14);
    }
  }
  // parapet / snow cap
  ctx.fillStyle = snow ? '#eef3f6' : roofColor;
  ctx.fillRect(x - 3, gy - h - 6, w + 6, 7);
}

function drawSmokestack(ctx, x, gy, h, pal, snow) {
  const w = h * 0.14;
  ctx.fillStyle = '#8a4a38';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, gy);
  ctx.lineTo(x - w * 0.34, gy - h);
  ctx.lineTo(x + w * 0.34, gy - h);
  ctx.lineTo(x + w / 2, gy);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) {
    const yy = gy - (h * i) / 6;
    const ww = w / 2 - (w * 0.16 * i) / 6;
    ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x + ww, yy); ctx.stroke();
  }
  ctx.fillStyle = snow ? '#eef3f6' : '#6b3a2c';
  ctx.fillRect(x - w * 0.42, gy - h - 5, w * 0.84, 6);
}

function drawUtilityPole(ctx, x, gy, h, toX) {
  ctx.strokeStyle = '#4d4238'; ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - h); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - h * 0.16, gy - h * 0.92); ctx.lineTo(x + h * 0.16, gy - h * 0.92); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - h * 0.12, gy - h * 0.8); ctx.lineTo(x + h * 0.12, gy - h * 0.8); ctx.stroke();
  // sagging wires off-screen
  ctx.strokeStyle = 'rgba(40,36,30,.55)'; ctx.lineWidth = 1.6;
  for (const wy of [h * 0.92, h * 0.8]) {
    ctx.beginPath();
    ctx.moveTo(x + h * 0.14, gy - wy);
    ctx.quadraticCurveTo((x + toX) / 2, gy - wy + 26, toX, gy - wy - 8);
    ctx.stroke();
  }
}

function drawBike(ctx, x, gy, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x - s * 0.5, gy - s * 0.32, s * 0.32, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + s * 0.5, gy - s * 0.32, s * 0.32, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, gy - s * 0.32); ctx.lineTo(x - s * 0.08, gy - s * 0.85);
  ctx.lineTo(x + s * 0.34, gy - s * 0.85); ctx.lineTo(x + s * 0.5, gy - s * 0.32);
  ctx.lineTo(x - s * 0.12, gy - s * 0.32); ctx.lineTo(x - s * 0.08, gy - s * 0.85);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.14, gy - s * 0.95); ctx.lineTo(x - s * 0.02, gy - s * 0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 0.30 * s, gy - s * 1.0); ctx.lineTo(x + 0.34 * s, gy - s * 0.85); ctx.stroke();
}

// Renders the full static backdrop into `bg` (already sized W×H in CSS px space).
export function renderBackdrop(bg, W, H, groundY, season) {
  const ctx = bg.getContext('2d');
  const pal = PALETTES[season];
  const rnd = mulberry(20260704);
  const snow = season === 'winter';
  const horizon = groundY * 0.52;

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(1, pal.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // sun (low over the lake, because every Burlington sunset is a personality)
  ctx.fillStyle = pal.sun;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(W * 0.18, horizon - H * 0.10, Math.min(W, H) * 0.055, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(W * 0.18, horizon - H * 0.10, Math.min(W, H) * 0.095, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  // Adirondacks across the lake
  ctx.fillStyle = pal.mountFar;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  let mx = 0;
  while (mx < W) {
    const peakW = W * (0.16 + rnd() * 0.12);
    ctx.lineTo(mx + peakW / 2, horizon - H * (0.05 + rnd() * 0.055));
    mx += peakW;
    ctx.lineTo(mx, horizon - H * 0.012);
  }
  ctx.lineTo(W, horizon); ctx.closePath(); ctx.fill();
  if (snow) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.moveTo(0, horizon - 2);
    ctx.lineTo(W, horizon - 2); ctx.lineTo(W, horizon - H * 0.02); ctx.lineTo(0, horizon - H * 0.02);
    ctx.closePath(); ctx.fill();
  }

  // Lake Champlain
  ctx.fillStyle = pal.lake;
  ctx.fillRect(0, horizon, W, groundY * 0.14);
  ctx.strokeStyle = pal.lakeGlint; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) {
    const ly = horizon + rnd() * groundY * 0.12 + 4;
    const lx = rnd() * W;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 14 + rnd() * 40, ly); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // mid ground band (the hill up from the lake)
  ctx.fillStyle = pal.mountNear;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(0, horizon + groundY * 0.13);
  ctx.quadraticCurveTo(W * 0.4, horizon + groundY * 0.09, W, horizon + groundY * 0.15);
  ctx.lineTo(W, groundY);
  ctx.closePath(); ctx.fill();

  // South End brick buildings flanking the play area
  const bh = H * 0.16;
  drawBuilding(ctx, -W * 0.04, groundY, W * 0.24, bh * (0.9 + rnd() * 0.3), pal.brickA, pal.roof, rnd, pal, snow);
  drawBuilding(ctx, W * 0.16, groundY, W * 0.15, bh * (0.6 + rnd() * 0.3), pal.brickB, pal.roof, rnd, pal, snow);
  drawBuilding(ctx, W * 0.72, groundY, W * 0.2, bh * (0.85 + rnd() * 0.3), pal.brickB, pal.roof, rnd, pal, snow);
  drawBuilding(ctx, W * 0.9, groundY, W * 0.16, bh * (1.1 + rnd() * 0.3), pal.brickA, pal.roof, rnd, pal, snow);
  drawSmokestack(ctx, W * 0.845, groundY, H * 0.24, pal, snow);

  // trees
  drawTree(ctx, W * 0.10, groundY, H * 0.13, pal, rnd);
  drawTree(ctx, W * 0.62, groundY, H * 0.10, pal, rnd);
  drawTree(ctx, W * 0.95, groundY, H * 0.11, pal, rnd);

  // utility pole + wires (left), and a leaned bike
  drawUtilityPole(ctx, W * 0.07, groundY, H * 0.30, -W * 0.2);
  drawBike(ctx, W * 0.68, groundY, H * 0.035, '#3f6d8a');

  // ground
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = pal.sidewalk;
  ctx.fillRect(0, groundY, W, H * 0.012);
  ctx.fillStyle = pal.groundEdge;
  ctx.fillRect(0, groundY + H * 0.012, W, H * 0.006);
  // ground speckle
  ctx.fillStyle = 'rgba(0,0,0,.06)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * W, groundY + H * 0.02 + rnd() * (H - groundY - H * 0.02), 1 + rnd() * 2.5, 0, 7);
    ctx.fill();
  }
  if (snow) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(0, groundY, W, H * 0.012);
  }
}

// ---- live weather layer ----
export function makeWeather(W, H, season) {
  const wx = PALETTES[season].wx;
  const parts = [];
  const n = wx === 'none' ? 0 : wx === 'rain' ? 60 : wx === 'snow' ? 70 : 26;
  for (let i = 0; i < n; i++) {
    parts.push({
      x: Math.random() * W, y: Math.random() * H,
      v: 0.5 + Math.random(), ph: Math.random() * 7,
      c: FALL_COLORS[i % FALL_COLORS.length],
    });
  }
  return { wx, parts };
}

export function drawWeather(ctx, weather, W, H, dt, time) {
  const { wx, parts } = weather;
  if (wx === 'none') return;
  for (const p of parts) {
    if (wx === 'snow') {
      p.y += p.v * dt * 0.045;
      p.x += Math.sin(time * 0.001 + p.ph) * 0.4;
      if (p.y > H) { p.y = -6; p.x = Math.random() * W; }
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 + p.v, 0, 7); ctx.fill();
    } else if (wx === 'rain') {
      p.y += p.v * dt * 0.35;
      p.x -= p.v * dt * 0.06;
      if (p.y > H) { p.y = -10; p.x = Math.random() * (W * 1.2); }
      ctx.strokeStyle = 'rgba(190,215,235,.5)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 2, p.y + 9); ctx.stroke();
    } else { // leaves
      p.y += p.v * dt * 0.03;
      p.x += Math.sin(time * 0.0012 + p.ph) * 0.9 - 0.2;
      if (p.y > H) { p.y = -8; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 8;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(time * 0.002 + p.ph) * 0.8);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2.2, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
}
