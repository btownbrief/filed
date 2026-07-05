// FILED! — Burlington's tallest game.
// A reflex arcade game set at the World's Tallest Filing Cabinet.

import { sound } from './audio.js';
import { CHARS } from './characters.js';
import { currentSeason, renderBackdrop, makeWeather, drawWeather, PALETTES } from './scenery.js';

/* ============================== constants ============================== */

const LS_BEST = 'filed.best';
const LS_CHAR = 'filed.char';

const FILE_LABELS = [
  'PERMIT APPROVED', 'PUBLIC COMMENT', 'MEETING MINUTES', 'PARKING STUDY',
  'TRAFFIC STUDY', 'ACT 250', 'DESIGN REVISION', 'ZONING VARIANCE',
  'BIKE LANE FEEDBACK', 'ANOTHER STUDY', 'TABLED', 'RESUBMIT', 'DRAFT 7',
  'FINAL FINAL v3', 'SIDEWALK PLAN', 'NOISE COMPLAINT', 'LEAF PICKUP MAP',
  'WETLAND MEMO', 'SEWER CAPACITY', 'FEASIBILITY STUDY', 'COMMUNITY INPUT',
  'STEERING COMMITTEE', 'SITE PLAN REVIEW', 'CURB CUT REQUEST', 'SEE ATTACHMENT',
  'STORMWATER PERMIT', 'APPENDIX K', 'Q3 VISIONING DECK', 'MORATORIUM(?)',
  'PILOT PROGRAM', 'TASK FORCE NOTES', 'HISTORIC REVIEW', 'ROUNDABOUT PETITION',
  'CHARRETTE RESULTS', 'SNOW PLOW ROUTES', 'COMPOST ORDINANCE',
];

const DEATH_LINES = [
  'PERMIT DENIED', 'TABLED UNTIL NEXT MEETING', 'NEEDS ANOTHER STUDY',
  'PUBLIC COMMENT CLOSED', 'RESUBMIT WITH CHANGES', 'SEE YOU IN 38 YEARS',
  'LOST IN COMMITTEE', 'DRAFT REJECTED', 'QUORUM NOT MET', 'FORM B-7 MISSING',
];
const TIMEOUT_LINES = [
  'BURIED IN PAPERWORK', 'DEADLINE MISSED', 'FISCAL YEAR ENDED',
  'OFFICE HOURS ARE OVER', 'GRANT WINDOW CLOSED',
];
const GO_JOKES = [
  'A committee has been formed in your honor.',
  'Your feedback has been noted for the record.',
  'The cabinet remains undefeated since 2002.',
  'Please take a number. Now serving: 4.',
  'This outcome will be studied. Extensively.',
  'Minutes of your defeat will be circulated.',
  'An intern has been assigned to your case.',
  'Next public hearing: the third Tuesday of never.',
];
const MILESTONES = {
  10: 'INTERN PROMOTED',
  25: 'PUBLIC MEETING SURVIVED',
  50: 'COMMITTEE FORMED',
  75: 'ANOTHER STUDY COMPLETED',
  100: 'CABINET RESPECTS YOU NOW',
  150: 'ACT 250: CLEARED',
  200: 'STANDING OVATION AT COUNCIL',
  250: 'ZONING TRANSCENDED',
  300: 'PAPERWORK SINGULARITY',
};

/* ============================== dom refs ============================== */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const hudEl = $('hud'), scoreEl = $('score'), timerWrap = $('timer-wrap'),
  timerFill = $('timer-fill'), milestoneEl = $('milestone'),
  menuEl = $('menu'), gameoverEl = $('gameover'), muteBtn = $('mute'),
  goVerdict = $('go-verdict'), goScore = $('go-score'), goJoke = $('go-joke'),
  goBest = $('go-best'), retryBtn = $('retry'), goMenuBtn = $('go-menu'),
  bestLine = $('best-line');

/* ============================== layout ============================== */

let W = 0, H = 0, dpr = 1;
let groundY = 0, segH = 0, cabW = 0, cx = 0, drawerExt = 0, playerX = 0, playerH = 0;
let nSegs = 10;
const bgCanvas = document.createElement('canvas');
let weather = null;
let season = currentSeason();
let pal = PALETTES[season];

function layout() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  groundY = H * 0.80;
  segH = Math.max(40, Math.min(H * 0.088, 92));
  cabW = Math.min(W * 0.40, segH * 2.35);
  cx = W / 2;
  drawerExt = cabW * 0.80;
  playerX = cabW / 2 + drawerExt * 0.52;   // distance from center to player
  playerH = segH * 1.42;
  nSegs = Math.ceil(groundY / segH) + 2;

  bgCanvas.width = Math.round(W * dpr);
  bgCanvas.height = Math.round(H * dpr);
  const bctx = bgCanvas.getContext('2d');
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderBackdrop(bgCanvas, W, H, groundY, season);
  weather = makeWeather(W, H, season);

  while (segments.length < nSegs) pushSegment();
}

/* ============================== game state ============================== */

let state = 'menu';           // menu | play | dying | over
let segments = [];            // [0] = bottom. { hz: -1|0|1, seed }
let genState = { lastHz: 0, run: 0, gap: 99, made: 0, lastSide: 1 };
let score = 0;
let best = parseInt(localStorage.getItem(LS_BEST) || '0', 10) || 0;
let timer = 1, started = false;
let playerSide = -1;          // -1 left, +1 right
let charKey = localStorage.getItem(LS_CHAR) in CHARS ? localStorage.getItem(LS_CHAR) : 'dot';
let stampT = 999;             // ms since last stamp
let dropOff = 0;              // stack settle animation offset
let wobble = 0, wobbleV = 0;  // cabinet wobble spring
let shake = 0;
let deathT = 0, deathKind = '', deathFly = null;
let overShownAt = 0;
let beatBestThisRun = false;
let milestoneTimer = null;
let time = 0;
let clouds = [];

const chips = [];   // flying processed segments
const papers = [];  // paper scrap particles
const floats = []; // floating file-label texts

/* ============================== generation ============================== */
// Fairness rule: a drawer may directly follow another drawer only on the SAME
// side. An opposite-side drawer requires >=1 safe segment between (otherwise the
// sequence is unsurvivable). Difficulty ramps density, run length and gap size.

function nextHazard() {
  const g = genState;
  const d = Math.min(1, g.made / 240);            // 0..1 difficulty
  const pHaz = 0.34 + 0.28 * d;
  const maxRun = g.made < 45 ? 2 : d < 0.7 ? 3 : 4;
  const minGap = g.made < 30 ? 2 : 1;
  let hz = 0;

  if (g.lastHz !== 0) {
    // continue a same-side run, never start opposite adjacent
    if (g.run < maxRun && Math.random() < 0.42 + 0.18 * d) hz = g.lastHz;
  } else if (g.gap >= minGap && Math.random() < pHaz) {
    // fresh drawer; bias toward switching sides to force alternation
    hz = Math.random() < 0.6 ? -g.lastSide : g.lastSide;
  }

  if (hz !== 0) {
    g.run = g.lastHz === hz ? g.run + 1 : 1;
    g.gap = 0;
    g.lastSide = hz;
  } else {
    g.run = 0;
    g.gap++;
  }
  g.lastHz = hz;
  g.made++;
  return hz;
}

function pushSegment() {
  const hz = genState.made < 4 ? (genState.made++, 0) : nextHazard();
  segments.push({ hz, seed: Math.floor(Math.random() * 1e9) });
}

function resetRun() {
  segments = [];
  genState = { lastHz: 0, run: 0, gap: 99, made: 0, lastSide: Math.random() < 0.5 ? -1 : 1 };
  for (let i = 0; i < nSegs; i++) pushSegment();
  score = 0; timer = 1; started = false;
  playerSide = -1; stampT = 999; dropOff = 0; wobble = 0; wobbleV = 0; shake = 0;
  chips.length = 0; papers.length = 0; floats.length = 0;
  beatBestThisRun = false;
  deathFly = null;
  scoreEl.textContent = '0';
  timerWrap.classList.remove('low');
  hideMilestone();
}

/* ============================== difficulty ============================== */

// Steady-state taps/sec needed: ~0.8 at start, ~1.4 @100, ~2.2 @200, ~3.5 @300, ~4.3 cap.
function drainRate() { return Math.min(0.155, 0.065 + Math.min(score, 420) * 0.00028); }
function tapGain() { return Math.max(0.036, 0.078 - score * 0.00012); }

/* ============================== core tap ============================== */

function tap(side) {
  if (state !== 'play') return;
  sound.unlock();
  playerSide = side;
  started = true;

  // Moving into an open drawer that is already at the bottom: crushed.
  if (segments[0].hz === side) { die('moved'); return; }

  // Process the bottom section.
  const removed = segments.shift();
  pushSegment();
  score++;
  timer = Math.min(1, timer + tapGain());
  scoreEl.textContent = String(score);
  scoreEl.classList.remove('pop'); void scoreEl.offsetWidth; scoreEl.classList.add('pop');

  // juice
  stampT = 0;
  dropOff = Math.min(dropOff + segH, segH * 1.4);
  wobbleV += (Math.random() - 0.5) * 0.02 + side * -0.012;
  shake = Math.min(shake + 3.2, 7);
  spawnChip(removed, side);
  spawnPapers(cx, groundY - segH * 0.5, 5 + Math.floor(Math.random() * 4), side);
  if (Math.random() < 0.22) spawnFloat();
  sound.stamp(1);
  if (Math.random() < 0.5) sound.drawerClack();

  checkMilestones();

  // The stack advanced: does a drawer descend onto the player?
  if (segments[0].hz === playerSide) { die('crushed'); return; }
}

function checkMilestones() {
  if (MILESTONES[score]) {
    showMilestone(MILESTONES[score]); sound.ding();
  } else if (score > 300 && score % 100 === 0) {
    showMilestone(`${score} FILES. THE STATE HAS QUESTIONS.`); sound.ding();
  }
  if (!beatBestThisRun && best > 0 && score > best) {
    beatBestThisRun = true;
    showMilestone('NEW PERSONAL BEST!');
    sound.fanfare();
  }
}

function die(kind) {
  state = 'dying';
  deathKind = kind;
  deathT = 0;
  shake = 12;
  wobbleV += playerSide * 0.05;
  if (kind === 'timeout') sound.timeout(); else sound.death();
  spawnPapers(cx + playerSide * playerX, groundY - segH * 0.6, 26, -playerSide);
  deathFly = {
    x: cx + playerSide * playerX, y: groundY,
    vx: playerSide * (kind === 'timeout' ? 0.02 : 0.38 + Math.random() * 0.1),
    vy: kind === 'timeout' ? -0.1 : -0.55,
    rot: 0, vr: playerSide * (kind === 'timeout' ? 0.004 : 0.012),
  };
  setTimeout(showGameOver, 700);
}

function showGameOver() {
  state = 'over';
  overShownAt = performance.now();
  const lines = deathKind === 'timeout' ? TIMEOUT_LINES : DEATH_LINES;
  goVerdict.textContent = lines[Math.floor(Math.random() * lines.length)];
  goScore.textContent = String(score);
  document.getElementById('go-score-label').textContent =
    score === 1 ? 'FILE PROCESSED' : 'FILES PROCESSED';
  const years = (score * 3.8) / 365;
  const yearsTxt = years >= 0.1 ? `${years.toFixed(1)} YEARS OF PAPERWORK CLEARED. ` : '';
  goJoke.textContent = yearsTxt + GO_JOKES[Math.floor(Math.random() * GO_JOKES.length)];
  const isBest = score > best;
  if (isBest) {
    best = score;
    localStorage.setItem(LS_BEST, String(best));
    goBest.textContent = '★ NEW PERSONAL BEST ★';
    goBest.classList.add('new-best');
  } else {
    goBest.textContent = `BEST: ${best} FILES`;
    goBest.classList.remove('new-best');
  }
  gameoverEl.classList.remove('hidden');
  hudEl.classList.add('hidden');
}

function startGame() {
  resetRun();
  state = 'play';
  menuEl.classList.add('hidden');
  gameoverEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
}

function toMenu() {
  state = 'menu';
  gameoverEl.classList.add('hidden');
  hudEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  updateBestLine();
  resetRun();
}

/* ============================== effects ============================== */

function spawnChip(seg, side) {
  chips.push({
    x: cx, y: groundY - segH / 2,
    vx: -side * (0.5 + Math.random() * 0.25),
    vy: -0.45 - Math.random() * 0.2,
    rot: 0, vr: -side * (0.008 + Math.random() * 0.006),
    hz: seg.hz, seed: seg.seed, life: 900,
  });
  if (chips.length > 6) chips.shift();
}

function spawnPapers(x, y, n, dir) {
  for (let i = 0; i < n; i++) {
    papers.push({
      x: x + (Math.random() - 0.5) * cabW * 0.7,
      y: y + (Math.random() - 0.5) * segH * 0.6,
      vx: dir * Math.random() * 0.35 + (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.4,
      rot: Math.random() * 7, vr: (Math.random() - 0.5) * 0.02,
      w: 6 + Math.random() * 8,
      c: Math.random() < 0.4 ? '#e8c87c' : '#f6f3ea',
      life: 1200 + Math.random() * 600,
    });
  }
  while (papers.length > 90) papers.shift();
}

function spawnFloat() {
  floats.push({
    txt: FILE_LABELS[Math.floor(Math.random() * FILE_LABELS.length)],
    x: cx + (Math.random() - 0.5) * cabW,
    y: groundY - segH * (1.3 + Math.random() * 1.2),
    life: 1100,
  });
  if (floats.length > 2) floats.shift();
  sound.flutter();
}

function showMilestone(txt) {
  milestoneEl.textContent = txt;
  milestoneEl.classList.add('show');
  clearTimeout(milestoneTimer);
  milestoneTimer = setTimeout(hideMilestone, 1600);
}
function hideMilestone() { milestoneEl.classList.remove('show'); }

/* ============================== cabinet drawing ============================== */

function segRnd(seed, i) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// One filing-cabinet section. yTop = top edge. Draws extended drawer if hazardous.
function drawSegment(c, yTop, seg) {
  const x = cx - cabW / 2, h = segH, w = cabW;
  const r = (i) => segRnd(seg.seed, i);

  // steel body
  const grad = c.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#5d707e');
  grad.addColorStop(0.5, '#79909f');
  grad.addColorStop(1, '#4d5e6b');
  c.fillStyle = grad;
  c.fillRect(x, yTop, w, h + 1);

  // rust blotches (the landmark is gloriously rusty — but readable)
  for (let i = 0; i < 2; i++) {
    if (r(i) < 0.7) {
      c.fillStyle = `rgba(${150 + r(i + 3) * 40 | 0}, ${72 + r(i + 5) * 30 | 0}, 38, ${0.16 + r(i + 7) * 0.16})`;
      c.beginPath();
      c.ellipse(x + w * (0.1 + r(i + 9) * 0.8), yTop + h * (0.15 + r(i + 11) * 0.7),
        w * (0.04 + r(i + 13) * 0.07), h * (0.08 + r(i + 15) * 0.16), r(i + 17) * 3, 0, 7);
      c.fill();
    }
  }
  // rust drip from top seam
  c.fillStyle = 'rgba(146,74,36,.22)';
  c.fillRect(x + w * (0.2 + r(20) * 0.6), yTop, w * 0.018, h * (0.25 + r(21) * 0.4));

  // seam
  c.fillStyle = 'rgba(20,28,36,.5)';
  c.fillRect(x, yTop, w, 2);

  if (seg.hz === 0) {
    // closed drawer face: recessed panel + cup handle + label plate
    c.fillStyle = 'rgba(255,255,255,.07)';
    c.fillRect(x + w * 0.06, yTop + h * 0.14, w * 0.88, h * 0.72);
    c.strokeStyle = 'rgba(20,28,36,.35)'; c.lineWidth = 1.5;
    c.strokeRect(x + w * 0.06, yTop + h * 0.14, w * 0.88, h * 0.72);
    // label plate
    c.fillStyle = '#c9beA6';
    c.fillStyle = '#cfc5ad';
    c.fillRect(x + w * 0.36, yTop + h * 0.24, w * 0.28, h * 0.2);
    c.strokeStyle = 'rgba(40,40,30,.4)'; c.lineWidth = 1;
    c.strokeRect(x + w * 0.36, yTop + h * 0.24, w * 0.28, h * 0.2);
    c.fillStyle = 'rgba(60,60,50,.55)';
    c.fillRect(x + w * 0.40, yTop + h * 0.315, w * 0.20, h * 0.035);
    // cup handle
    c.fillStyle = '#3b4854';
    c.beginPath();
    c.roundRect(x + w * 0.42, yTop + h * 0.56, w * 0.16, h * 0.14, 3);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.fillRect(x + w * 0.42, yTop + h * 0.56, w * 0.16, h * 0.04);
  } else {
    // OPEN DRAWER — the hazard. Slides far out to one side.
    const dir = seg.hz;                       // -1 left, +1 right
    const edge = dir < 0 ? x : x + w;         // cabinet edge it exits from
    const ext = drawerExt * dir;
    const dTop = yTop + h * 0.10, dH = h * 0.80;

    // dark opening in the face
    c.fillStyle = 'rgba(12,18,24,.85)';
    c.fillRect(x + w * 0.05, dTop, w * 0.9, dH);

    // drawer box from face outward
    const bx = dir < 0 ? edge + ext : edge;
    const bw = Math.abs(ext);
    const dgrad = c.createLinearGradient(0, dTop, 0, dTop + dH);
    dgrad.addColorStop(0, '#8ba2b1');
    dgrad.addColorStop(1, '#5a6d7a');
    c.fillStyle = dgrad;
    c.fillRect(bx, dTop, bw, dH);
    // drawer sides shading
    c.fillStyle = 'rgba(20,28,36,.35)';
    c.fillRect(bx, dTop + dH - 4, bw, 4);
    // rust on the drawer too
    c.fillStyle = 'rgba(150,76,38,.35)';
    c.beginPath();
    c.ellipse(bx + bw * (0.3 + r(30) * 0.4), dTop + dH * 0.6, bw * 0.12, dH * 0.2, 0.5, 0, 7);
    c.fill();
    // end face with handle + warning label
    const ex = dir < 0 ? bx : bx + bw;
    c.fillStyle = '#42525e';
    c.fillRect(dir < 0 ? ex : ex - 5, dTop, 5, dH);
    c.fillStyle = '#2c3843';
    const hx = dir < 0 ? bx + 6 : bx + bw - 16;
    c.beginPath(); c.roundRect(hx, dTop + dH * 0.4, 10, dH * 0.24, 2); c.fill();

    // overflowing folders & papers sticking up — reads as danger
    for (let i = 0; i < 5; i++) {
      const px = bx + bw * (0.12 + i * 0.18) + r(40 + i) * bw * 0.05;
      const ph = dH * (0.35 + r(50 + i) * 0.5);
      c.fillStyle = i % 2 ? '#e8c87c' : '#f4f0e4';
      c.save();
      c.translate(px, dTop);
      c.rotate((r(60 + i) - 0.5) * 0.3);
      c.fillRect(0, -ph * 0.55, bw * 0.13, ph);
      c.restore();
    }
    // red "OUT" tab on the end so the hazard side is unmistakable
    c.fillStyle = '#d0402e';
    const tabX = dir < 0 ? bx - 2 : bx + bw - 8;
    c.beginPath(); c.roundRect(tabX, dTop - 7, 10, 12, 2); c.fill();
  }
}

function drawCabinet(c) {
  c.save();
  // wobble around the base
  c.translate(cx, groundY);
  c.rotate(wobble);
  c.translate(-cx, -groundY);

  for (let i = 0; i < segments.length; i++) {
    const yTop = groundY - (i + 1) * segH - dropOff;
    if (yTop + segH < 0) break;
    drawSegment(c, yTop, segments[i]);
  }
  // plinth
  c.fillStyle = '#3a4650';
  c.fillRect(cx - cabW / 2 - 5, groundY - 3, cabW + 10, 8);
  c.restore();
}

/* ============================== player drawing ============================== */

function drawPlayer(c) {
  const drawFn = CHARS[charKey].draw;
  if (state === 'dying' || state === 'over') {
    if (!deathFly) return;
    c.save();
    c.translate(deathFly.x, deathFly.y);
    c.rotate(deathFly.rot);
    drawFn(c, 0, 0, playerH, -playerSide, 'idle', 0, time);
    // spiral eyes substitute: a few stars
    c.fillStyle = '#ffe08a';
    c.font = `${playerH * 0.16}px sans-serif`;
    c.fillText('✶', -playerH * 0.1, -playerH * 0.95);
    c.fillText('✶', playerH * 0.12, -playerH * 1.02);
    c.restore();
    return;
  }
  const px = cx + playerSide * playerX;
  const facing = -playerSide; // face the cabinet
  const pose = stampT < 260 ? 'stamp' : 'idle';
  const poseT = Math.min(1, stampT / 260);
  drawFn(c, px, groundY, playerH, facing, pose, poseT, time);
}

/* ============================== render loop ============================== */

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(50, now - lastT);
  lastT = now;
  time = now;

  update(dt, now);
  render(now, dt);
  requestAnimationFrame(frame);
}

function update(dt, now) {
  // physics-ish updates
  stampT += dt;
  dropOff = Math.max(0, dropOff - dt * segH / 75);
  // wobble spring (clamped so the tower never visibly keels over)
  wobbleV += -wobble * 0.012 * dt - wobbleV * 0.006 * dt;
  wobble += wobbleV * dt * 0.06;
  wobble = Math.max(-0.045, Math.min(0.045, wobble));
  wobbleV = Math.max(-0.03, Math.min(0.03, wobbleV));
  shake = Math.max(0, shake - dt * 0.03);

  if (state === 'play' && started) {
    timer -= drainRate() * dt / 1000;
    if (timer <= 0) { timer = 0; die('timeout'); }
    timerWrap.classList.toggle('low', timer < 0.3);
  }
  timerFill.style.transform = `scaleX(${timer})`;

  if (deathFly) {
    deathFly.vy += dt * 0.0016;
    deathFly.x += deathFly.vx * dt;
    deathFly.y += deathFly.vy * dt;
    deathFly.rot += deathFly.vr * dt;
    deathT += dt;
  }

  for (let i = chips.length - 1; i >= 0; i--) {
    const p = chips[i];
    p.vy += dt * 0.0022;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > H + segH * 2) chips.splice(i, 1);
  }
  for (let i = papers.length - 1; i >= 0; i--) {
    const p = papers[i];
    p.vy += dt * 0.0006;
    p.x += p.vx * dt + Math.sin(now * 0.004 + p.rot) * 0.3;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > H) papers.splice(i, 1);
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.y -= dt * 0.045;
    f.life -= dt;
    if (f.life <= 0) floats.splice(i, 1);
  }
}

function render(now, dt) {
  ctx.clearRect(0, 0, W, H);
  // static backdrop
  ctx.drawImage(bgCanvas, 0, 0, W, H);
  // drifting clouds
  drawClouds(ctx, now);

  ctx.save();
  if (shake > 0.3) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  drawCabinet(ctx);

  // highlight the drawer that got you, so the death reads as fair
  if ((state === 'dying' || state === 'over') && deathKind !== 'timeout' && deathT < 900) {
    const flash = 0.5 + Math.sin(deathT * 0.03) * 0.35;
    ctx.strokeStyle = `rgba(255, 60, 40, ${Math.max(0, flash)})`;
    ctx.lineWidth = 4;
    const dTop = groundY - segH * 0.9;
    const bx = playerSide < 0 ? cx - cabW / 2 - drawerExt : cx + cabW / 2;
    ctx.strokeRect(bx - 3, dTop - 3, drawerExt + 6, segH * 0.8 + 6);
  }

  // flying processed sections
  for (const p of chips) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.life / 300);
    const w = cabW * 0.9, h = segH * 0.8;
    ctx.fillStyle = '#6b7f8d';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(150,76,38,.4)';
    ctx.fillRect(-w * 0.2, -h * 0.3, w * 0.25, h * 0.4);
    // the big red FILED! mark stamped on it
    ctx.save();
    ctx.rotate(-0.12);
    ctx.strokeStyle = '#d0402e'; ctx.lineWidth = 2.5;
    ctx.strokeRect(-w * 0.3, -h * 0.28, w * 0.6, h * 0.56);
    ctx.fillStyle = '#d0402e';
    ctx.font = `900 ${h * 0.34}px "Arial Black", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FILED!', 0, 0);
    ctx.restore();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  drawPlayer(ctx);

  // paper scraps
  for (const p of papers) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 400));
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.w / 2, -p.w * 0.35, p.w, p.w * 0.7);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // shake

  // first-run tap hint: pulsing chevrons until the first tap
  if (state === 'play' && !started) {
    const pulse = 0.45 + Math.sin(now * 0.006) * 0.3;
    ctx.globalAlpha = Math.max(0.15, pulse);
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.max(22, segH * 0.5)}px -apple-system, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const hy = groundY - playerH * 1.6;
    ctx.fillText('◀', W * 0.16, hy);
    ctx.fillText('▶', W * 0.84, hy);
    ctx.font = `800 ${Math.max(12, segH * 0.2)}px -apple-system, Arial, sans-serif`;
    ctx.fillText('TAP', W * 0.16, hy + segH * 0.55);
    ctx.fillText('TAP', W * 0.84, hy + segH * 0.55);
    ctx.globalAlpha = 1;
  }

  // floating file labels
  for (const f of floats) {
    const a = Math.max(0, Math.min(1, f.life / 300));
    ctx.globalAlpha = a;
    ctx.font = `800 ${Math.max(12, segH * 0.24)}px -apple-system, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,28,36,.85)';
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = '#ffe08a';
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // weather on top for depth
  drawWeather(ctx, weather, W, H, dt, now);
}

let cloudSeeds = [0.15, 0.5, 0.8];
function drawClouds(c, now) {
  c.fillStyle = 'rgba(255,255,255,.65)';
  cloudSeeds.forEach((s, i) => {
    const speed = 0.000006 * (i + 1);
    const x = ((s + now * speed) % 1.2 - 0.1) * W;
    const y = H * (0.08 + i * 0.05);
    const r = W * 0.045;
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.arc(x + r * 0.9, y + r * 0.25, r * 0.75, 0, 7);
    c.arc(x - r * 0.9, y + r * 0.3, r * 0.7, 0, 7);
    c.fill();
  });
}

/* ============================== menu / character select ============================== */

function renderCharCards() {
  document.querySelectorAll('.char-card').forEach((card) => {
    const key = card.dataset.char;
    card.classList.toggle('selected', key === charKey);
    const cv = card.querySelector('.char-canvas');
    const cdpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = 140 * cdpr; cv.height = 180 * cdpr;
    const cc = cv.getContext('2d');
    cc.setTransform(cdpr, 0, 0, cdpr, 0, 0);
    cc.clearRect(0, 0, 140, 180);
    CHARS[key].draw(cc, 70, 172, 150, 1, 'menu', 0, 400);
  });
}

function selectChar(key, andStart) {
  charKey = key;
  localStorage.setItem(LS_CHAR, key);
  renderCharCards();
  if (andStart) { sound.unlock(); sound.blip(); startGame(); }
}

function updateBestLine() {
  bestLine.textContent = best > 0 ? `BEST: ${best} FILES` : '';
}

/* ============================== input ============================== */

function sideFromX(x) { return x < window.innerWidth / 2 ? -1 : 1; }

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (state === 'play') tap(sideFromX(e.clientX));
}, { passive: false });

// block scrolling / double-tap zoom during play
['touchmove', 'touchstart'].forEach((ev) =>
  document.addEventListener(ev, (e) => {
    if (state === 'play' || state === 'dying') e.preventDefault();
  }, { passive: false })
);
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => {
  if (state === 'play') e.preventDefault();
});

gameoverEl.addEventListener('pointerdown', (e) => {
  if (e.target === goMenuBtn) return;
  if (performance.now() - overShownAt < 350) return;
  e.preventDefault();
  sound.unlock();
  startGame();
});
retryBtn.addEventListener('click', () => { });
goMenuBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  sound.unlock(); sound.blip();
  toMenu();
});

document.querySelectorAll('.char-card').forEach((card) => {
  card.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    selectChar(card.dataset.char, true);
  });
});

muteBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  sound.unlock();
  sound.setMuted(!sound.muted);
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
});

window.addEventListener('keydown', (e) => {
  if (e.repeat && e.code === 'Space') return;
  const left = e.code === 'ArrowLeft' || e.code === 'KeyA';
  const right = e.code === 'ArrowRight' || e.code === 'KeyD';
  if (left || right || e.code === 'Space' || e.code === 'Enter') e.preventDefault();

  if (state === 'play') {
    if (left) tap(-1);
    else if (right) tap(1);
  } else if (state === 'menu') {
    if (left) selectChar('dot', false);
    else if (right) selectChar('bernie', false);
    else if (e.code === 'Space' || e.code === 'Enter') { sound.unlock(); startGame(); }
  } else if (state === 'over') {
    if ((e.code === 'Space' || e.code === 'Enter' || left || right) &&
      performance.now() - overShownAt > 250) {
      sound.unlock(); startGame();
    }
  }
});

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 250));

/* ============================== boot ============================== */

muteBtn.textContent = sound.muted ? '🔇' : '🔊';
layout();
resetRun();
renderCharCards();
updateBestLine();
requestAnimationFrame(frame);

// tiny debug hook for testing (safe to leave in; not documented in UI)
window.__filed = {
  get state() { return state; },
  get score() { return score; },
  get segments() { return segments.map((s) => s.hz); },
  get side() { return playerSide; },
  get timer() { return timer; },
  tap, startGame, toMenu,
  setTimer(v) { timer = v; },
  step(dt) { update(dt, performance.now()); },
  renderNow() { render(performance.now(), 16); },
  season,
};
