// FILED! — Burlington waterfront at sunset, drawn procedurally.
// Composition (top to bottom): sunset sky → rounded layered Adirondacks →
// Lake Champlain with sun reflection → waterfront landmarks (Boathouse +
// Spirit of Ethan Allen at left, marina at right) kept HIGH in the frame →
// calm near-solid dusk foreground so the player character pops.
// Static parts render once to an offscreen canvas; weather animates live.

export function currentSeason() {
  const q = new URLSearchParams(location.search).get('season');
  if (['winter', 'spring', 'summer', 'fall'].includes(q)) return q;
  const m = new Date().getMonth();
  if (m === 11 || m <= 2) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 8) return 'summer';
  return 'fall';
}

// Sunset variants per season: same dusk composition, shifted temperature.
export const PALETTES = {
  winter: {
    sky: ['#1c2447', '#584a74', '#c46a6e', '#f5b28a'],
    sun: '#ffd9c0', mountFar: '#6a6390', mountNear: '#453e68',
    lakeTop: '#c98d80', lakeBot: '#312c55',
    wx: 'snow',
  },
  spring: {
    sky: ['#20305c', '#6b4f80', '#d97a5e', '#ffc27a'],
    sun: '#ffe3b0', mountFar: '#635c8c', mountNear: '#413a64',
    lakeTop: '#d9955e', lakeBot: '#2e2a52',
    wx: 'rain',
  },
  summer: {
    sky: ['#243a6b', '#8c5a86', '#e0784f', '#ffc25e'],
    sun: '#ffe9a8', mountFar: '#5a5480', mountNear: '#3d3763',
    lakeTop: '#e09a58', lakeBot: '#2e2a52',
    wx: 'none',
  },
  fall: {
    sky: ['#251f4e', '#7c4a6e', '#e07038', '#ffb347'],
    sun: '#ffdf94', mountFar: '#5e5078', mountNear: '#3f3358',
    lakeTop: '#e08c46', lakeBot: '#2b2449',
    wx: 'leaves',
  },
};

const SIL = '#241f45';        // universal dusk silhouette plum
const SIL_DARK = '#1c1838';
const WARM_WINDOW = '#ffce7a';

function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rounded, rolling, overlapping ridge — the Adirondacks from Burlington,
// NOT alpine spikes. Built from broad low arcs.
function drawRidge(ctx, W, baseY, maxRise, color, rnd, bumps) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, baseY + 2);
  let x = -20;
  let y = baseY - maxRise * (0.3 + rnd() * 0.4);
  ctx.lineTo(x, y);
  while (x < W + 20) {
    const w = W * (0.14 + rnd() * 0.2);          // broad
    const peak = baseY - maxRise * (0.45 + rnd() * 0.55);
    const end = baseY - maxRise * (0.15 + rnd() * 0.4);
    // one rounded swell: up then down with soft control points
    ctx.quadraticCurveTo(x + w * 0.5, peak, x + w, end);
    x += w; y = end;
    bumps--;
  }
  ctx.lineTo(W + 20, baseY + 2);
  ctx.closePath();
  ctx.fill();
}

// Burlington Community Boathouse: long low structure, layered decks,
// reddish hipped roof, two square cupolas with their own little red caps.
function drawBoathouse(ctx, x, baseY, w, h) {
  const roofRed = '#8f3d33';
  // pilings under the deck
  ctx.strokeStyle = SIL_DARK; ctx.lineWidth = Math.max(2, w * 0.012);
  for (let i = 0; i <= 6; i++) {
    const px = x + (w * i) / 6;
    ctx.beginPath(); ctx.moveTo(px, baseY); ctx.lineTo(px, baseY - h * 0.14); ctx.stroke();
  }
  // lower deck slab
  ctx.fillStyle = SIL;
  ctx.fillRect(x - w * 0.06, baseY - h * 0.2, w * 1.12, h * 0.08);
  // main body (two stories)
  ctx.fillStyle = SIL;
  ctx.fillRect(x, baseY - h * 0.62, w, h * 0.45);
  // wraparound upper-deck rail line (kept faint)
  ctx.fillStyle = 'rgba(255,255,255,.10)';
  ctx.fillRect(x - w * 0.04, baseY - h * 0.42, w * 1.08, h * 0.02);
  // long hipped red roof
  ctx.fillStyle = roofRed;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.08, baseY - h * 0.60);
  ctx.lineTo(x + w * 0.14, baseY - h * 0.78);
  ctx.lineTo(x + w * 0.86, baseY - h * 0.78);
  ctx.lineTo(x + w * 1.08, baseY - h * 0.60);
  ctx.closePath(); ctx.fill();
  // two square cupolas with red caps
  for (const cxr of [0.30, 0.62]) {
    const cw = w * 0.13, cxp = x + w * cxr;
    ctx.fillStyle = SIL;
    ctx.fillRect(cxp, baseY - h * 1.02, cw, h * 0.26);
    ctx.fillStyle = 'rgba(255,206,122,.75)';   // lit cupola louvers
    ctx.fillRect(cxp + cw * 0.2, baseY - h * 0.97, cw * 0.6, h * 0.1);
    ctx.fillStyle = roofRed;
    ctx.beginPath();
    ctx.moveTo(cxp - cw * 0.25, baseY - h * 1.02);
    ctx.lineTo(cxp + cw * 0.5, baseY - h * 1.16);
    ctx.lineTo(cxp + cw * 1.25, baseY - h * 1.02);
    ctx.closePath(); ctx.fill();
  }
  // a few warm windows on the main floor
  ctx.fillStyle = WARM_WINDOW;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + w * (0.1 + i * 0.17), baseY - h * 0.55, w * 0.06, h * 0.09);
  }
}

// Spirit of Ethan Allen: big white multi-deck cruise boat, dark hull, docked.
function drawSpirit(ctx, x, baseY, w, h) {
  // dark hull with raked bow (pointing right)
  ctx.fillStyle = '#1f2646';
  ctx.beginPath();
  ctx.moveTo(x, baseY - h * 0.30);
  ctx.lineTo(x + w, baseY - h * 0.30);
  ctx.lineTo(x + w * 0.94, baseY);
  ctx.lineTo(x + w * 0.05, baseY);
  ctx.closePath(); ctx.fill();
  // white main + upper decks, stepped back
  ctx.fillStyle = '#ece4d8';
  ctx.fillRect(x + w * 0.03, baseY - h * 0.58, w * 0.93, h * 0.30);
  ctx.fillRect(x + w * 0.10, baseY - h * 0.82, w * 0.74, h * 0.26);
  ctx.fillRect(x + w * 0.22, baseY - h * 1.0, w * 0.42, h * 0.20);
  // window strips (warm, lit for dusk)
  ctx.fillStyle = WARM_WINDOW;
  for (const [yy, x0, x1] of [[0.50, 0.07, 0.92], [0.74, 0.13, 0.80], [0.93, 0.25, 0.60]]) {
    for (let wx = x0; wx < x1; wx += 0.075) {
      ctx.fillRect(x + w * wx, baseY - h * yy, w * 0.045, h * 0.08);
    }
  }
  // rail lines
  ctx.fillStyle = 'rgba(40,40,80,.35)';
  ctx.fillRect(x + w * 0.03, baseY - h * 0.60, w * 0.93, h * 0.025);
  ctx.fillRect(x + w * 0.10, baseY - h * 0.84, w * 0.74, h * 0.025);
  // little mast
  ctx.strokeStyle = '#d8d0c4'; ctx.lineWidth = Math.max(1.5, w * 0.012);
  ctx.beginPath(); ctx.moveTo(x + w * 0.43, baseY - h * 1.0); ctx.lineTo(x + w * 0.43, baseY - h * 1.22); ctx.stroke();
}

// Marina: dock lines, moored sailboats with masts, tiny motorboats.
function drawMarina(ctx, x, baseY, w, h, rnd) {
  // dock
  ctx.fillStyle = SIL;
  ctx.fillRect(x, baseY - h * 0.10, w, h * 0.07);
  ctx.strokeStyle = SIL_DARK; ctx.lineWidth = Math.max(2, w * 0.008);
  for (let i = 0; i <= 8; i++) {
    const px = x + (w * i) / 8;
    ctx.beginPath(); ctx.moveTo(px, baseY); ctx.lineTo(px, baseY - h * 0.08); ctx.stroke();
  }
  // sailboats: hull + mast (+ occasional boom line), spaced along the dock
  const n = 5;
  for (let i = 0; i < n; i++) {
    const bx = x + w * (0.06 + i * 0.19) + rnd() * w * 0.03;
    const bw = w * (0.10 + rnd() * 0.04);
    const mastH = h * (0.55 + rnd() * 0.4);
    // hull
    ctx.fillStyle = i % 2 ? SIL : '#3a3560';
    ctx.beginPath();
    ctx.moveTo(bx, baseY - h * 0.13);
    ctx.lineTo(bx + bw, baseY - h * 0.13);
    ctx.lineTo(bx + bw * 0.82, baseY - h * 0.02);
    ctx.lineTo(bx + bw * 0.16, baseY - h * 0.02);
    ctx.closePath(); ctx.fill();
    // cabin bump
    ctx.fillRect(bx + bw * 0.3, baseY - h * 0.18, bw * 0.4, h * 0.05);
    // mast + forestay
    ctx.strokeStyle = SIL_DARK; ctx.lineWidth = Math.max(1.2, w * 0.006);
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.5, baseY - h * 0.16); ctx.lineTo(bx + bw * 0.5, baseY - h * 0.16 - mastH); ctx.stroke();
    ctx.lineWidth = Math.max(0.8, w * 0.003);
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.5, baseY - h * 0.16 - mastH); ctx.lineTo(bx + bw * 0.95, baseY - h * 0.15); ctx.stroke();
  }
}

export function renderBackdrop(bg, W, H, groundY, season) {
  const ctx = bg.getContext('2d');
  const pal = PALETTES[season];
  const rnd = mulberry(20260705);

  const horizon = H * 0.335;         // waterline meets sky
  const shoreY = H * 0.615;          // waterfront structures stand here (kept high)
  const sunX = W * 0.36;

  // ---- sunset sky ----
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, pal.sky[0]);
  sky.addColorStop(0.48, pal.sky[1]);
  sky.addColorStop(0.8, pal.sky[2]);
  sky.addColorStop(1, pal.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon + 2);

  // sun: soft glow sitting just above the mountains
  const sunY = horizon - H * 0.045;
  for (const [r, a] of [[H * 0.16, 0.16], [H * 0.085, 0.22], [H * 0.038, 0.9]]) {
    ctx.fillStyle = pal.sun;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // dusk cloud streaks: long, flat, layered
  for (let i = 0; i < 4; i++) {
    const cy = H * (0.06 + i * 0.055) + rnd() * H * 0.02;
    const cw = W * (0.3 + rnd() * 0.45);
    const cx0 = rnd() * W - cw * 0.3;
    ctx.fillStyle = i < 2 ? 'rgba(30,26,64,.35)' : 'rgba(255,170,110,.20)';
    ctx.beginPath();
    ctx.ellipse(cx0 + cw / 2, cy, cw / 2, H * (0.008 + rnd() * 0.007), 0, 0, 7);
    ctx.fill();
  }

  // ---- rounded, layered Adirondacks ----
  drawRidge(ctx, W, horizon + 1, H * 0.055, pal.mountFar, rnd, 6);
  drawRidge(ctx, W, horizon + 1, H * 0.032, pal.mountNear, rnd, 7);

  // ---- Lake Champlain ----
  const lake = ctx.createLinearGradient(0, horizon, 0, shoreY);
  lake.addColorStop(0, pal.lakeTop);
  lake.addColorStop(0.45, '#7a5a72');
  lake.addColorStop(1, pal.lakeBot);
  ctx.fillStyle = lake;
  ctx.fillRect(0, horizon, W, shoreY - horizon);
  // sun reflection column: broken shimmer lines widening toward viewer
  ctx.fillStyle = pal.sun;
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const ly = horizon + (shoreY - horizon) * t * 0.9 + 3;
    const lw = (6 + t * 30) * (0.5 + rnd());
    ctx.globalAlpha = 0.28 * (1 - t * 0.6);
    ctx.fillRect(sunX - lw / 2 + (rnd() - 0.5) * 14, ly, lw, 1.6);
  }
  // scattered dusk glints
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(rnd() * W, horizon + rnd() * (shoreY - horizon) * 0.8, 10 + rnd() * 26, 1.2);
  }
  ctx.globalAlpha = 1;

  // ---- waterfront landmarks (high in frame, clear of the cabinet) ----
  // Mirror the cabinet footprint math from main.js so landmarks stay visible
  // in the side gutters on any aspect ratio.
  const segH = Math.max(40, Math.min(H * 0.088, 92));
  const cabW = Math.min(W * 0.40, segH * 2.35);
  const gutter = Math.max(60, (W - cabW) / 2);   // width of each side gutter

  // LEFT: Spirit of Ethan Allen docked BESIDE the Boathouse (lakeward side)
  const spW = Math.min(gutter * 0.52, H * 0.16);
  const spX = Math.max(2, gutter * 0.02);
  drawSpirit(ctx, spX, shoreY - H * 0.006, spW, H * 0.078);
  const bhW = Math.min(gutter * 0.50, H * 0.18);
  const bhX = spX + spW + gutter * 0.015;
  drawBoathouse(ctx, bhX, shoreY - H * 0.010, bhW, H * 0.100);
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#f0e0c0';
  ctx.fillRect(spX + 4, shoreY + 4, (spW + bhW) * 0.85, H * 0.012);
  ctx.globalAlpha = 1;

  // RIGHT: marina fills the right gutter
  const mX = W - gutter * 0.98;
  drawMarina(ctx, mX, shoreY, gutter * 0.96, H * 0.12, rnd);
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#f0e0c0';
  ctx.fillRect(mX + gutter * 0.1, shoreY + 4, gutter * 0.7, H * 0.012);
  ctx.globalAlpha = 1;

  // ---- calm dusk foreground: the character-readability zone ----
  const fg = ctx.createLinearGradient(0, shoreY, 0, H);
  fg.addColorStop(0, '#262148');
  fg.addColorStop(0.35, '#211d40');
  fg.addColorStop(1, '#171430');
  ctx.fillStyle = fg;
  ctx.fillRect(0, shoreY, W, H - shoreY);
  // boardwalk edge highlight where land meets water
  ctx.fillStyle = 'rgba(255,190,120,.18)';
  ctx.fillRect(0, shoreY, W, 2);
  // extremely subtle plank hints, upper foreground only (never behind player)
  ctx.strokeStyle = 'rgba(255,255,255,.03)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const py = shoreY + (groundY - shoreY) * (i / 9);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
  }
  // gentle ground line so the cabinet and characters sit on something
  ctx.fillStyle = 'rgba(255,205,140,.14)';
  ctx.fillRect(0, groundY, W, 2.5);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(0, groundY + 2.5, W, H - groundY);
}

/* ---- live weather layer (unchanged behavior, dusk-tinted) ---- */
const FALL_COLORS = ['#d9822b', '#c9542e', '#e0a832', '#a83a28'];

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
      ctx.fillStyle = 'rgba(255,240,225,.75)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 + p.v, 0, 7); ctx.fill();
    } else if (wx === 'rain') {
      p.y += p.v * dt * 0.35;
      p.x -= p.v * dt * 0.06;
      if (p.y > H) { p.y = -10; p.x = Math.random() * (W * 1.2); }
      ctx.strokeStyle = 'rgba(220,190,200,.4)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 2, p.y + 9); ctx.stroke();
    } else {
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
