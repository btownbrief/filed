// FILED! — procedural character art.
// Two bureaucrats, drawn entirely with canvas shapes.
// Characters are drawn feet at (0,0), facing +x, in a box roughly [-h*0.42, -h] .. [h*0.42, 0].

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// The giant municipal rubber stamp, held in the forward hand.
// (gx, gy) = grip point. ang = stamp angle (0 = upright). s = scale unit.
function drawStamp(ctx, gx, gy, ang, s, squash = 0) {
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(ang);
  const w = s * 0.52, hh = s * 0.34;
  // handle
  ctx.fillStyle = '#8a5a2b';
  rr(ctx, -s * 0.05, -s * 0.34, s * 0.1, s * 0.3, s * 0.04); ctx.fill();
  // knob
  ctx.fillStyle = '#a8713a';
  ctx.beginPath(); ctx.arc(0, -s * 0.36, s * 0.09, 0, 7); ctx.fill();
  // rubber block (squashes on impact)
  const sq = 1 - squash * 0.35;
  ctx.fillStyle = '#c22417';
  rr(ctx, -w / 2, -s * 0.06, w, hh * sq, s * 0.05); ctx.fill();
  ctx.fillStyle = '#8f180e';
  rr(ctx, -w / 2, -s * 0.06 + hh * sq * 0.62, w, hh * sq * 0.38, s * 0.04); ctx.fill();
  // FILED! label on the block
  ctx.fillStyle = '#ffe9e5';
  ctx.font = `900 ${s * 0.13}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('FILED!', 0, -s * 0.06 + hh * sq * 0.32);
  ctx.restore();
}

// Shared pose math. Returns arm/body offsets for the current pose.
// pose: 'idle' | 'stamp' | 'dead' | 'menu'
// poseT: stamp progress 0..1 (0 = wind up start, ~0.35 = impact)
function poseParams(pose, poseT, time) {
  const p = { bounce: 0, armAng: -0.5, stampAng: -0.35, lean: 0, squash: 0, crouch: 0 };
  if (pose === 'idle' || pose === 'menu') {
    p.bounce = Math.sin(time * 0.004) * 0.016;
    p.armAng = -0.55 + Math.sin(time * 0.004) * 0.05;
    p.stampAng = -0.4;
  } else if (pose === 'stamp') {
    // fast overhead slam: windup (0-0.2), slam (0.2-0.45), recover
    let t = poseT;
    let swing;
    if (t < 0.2) swing = -0.9 - t * 2;            // raise
    else if (t < 0.45) swing = -1.3 + (t - 0.2) * 8.4; // slam down/forward
    else swing = 0.8 - (t - 0.45) * 2.4;           // recover
    p.armAng = swing;
    p.stampAng = swing * 0.55 + 0.2;
    p.lean = t > 0.2 && t < 0.6 ? 0.14 : -0.05;
    p.crouch = t > 0.2 && t < 0.55 ? 0.05 : 0;
    p.squash = t > 0.28 && t < 0.5 ? 1 : 0;
  }
  return p;
}

// DOT — Deputy Zoning Administrator. Teal skirt suit, red bun, glasses, heels.
export function drawDot(ctx, x, y, h, facing, pose, poseT = 0, time = 0) {
  const s = h;                 // scale unit = height
  const P = poseParams(pose, poseT, time);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.translate(0, -P.bounce * s + P.crouch * s);
  ctx.rotate(P.lean);

  const skin = '#e8b48c', suit = '#1e7f86', suitDark = '#16626a', hair = '#a63d20';

  // === back arm (holds folder against hip) ===
  ctx.strokeStyle = suitDark; ctx.lineWidth = s * 0.075; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.10, -s * 0.60); ctx.lineTo(-s * 0.17, -s * 0.44); ctx.stroke();
  // manila folder tucked under back arm
  ctx.save(); ctx.translate(-s * 0.20, -s * 0.44); ctx.rotate(-0.25);
  ctx.fillStyle = '#e8c87c'; rr(ctx, -s * 0.09, -s * 0.06, s * 0.18, s * 0.12, s * 0.015); ctx.fill();
  ctx.fillStyle = '#fff'; rr(ctx, -s * 0.07, -s * 0.045, s * 0.14, s * 0.02, s * 0.008); ctx.fill();
  ctx.restore();

  // === legs: heels! ===
  const legX1 = -s * 0.075, legX2 = s * 0.075;
  ctx.strokeStyle = skin; ctx.lineWidth = s * 0.055;
  ctx.beginPath(); ctx.moveTo(legX1, -s * 0.30); ctx.lineTo(legX1 - s * 0.01, -s * 0.045); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(legX2, -s * 0.30); ctx.lineTo(legX2 + s * 0.01, -s * 0.045); ctx.stroke();
  // high heel pumps (side profile: pointed toe forward, stiletto heel back)
  ctx.fillStyle = '#b3232f';
  for (const lx of [legX1 - s * 0.01, legX2 + s * 0.01]) {
    ctx.beginPath();
    ctx.moveTo(lx - s * 0.045, -s * 0.055);
    ctx.quadraticCurveTo(lx + s * 0.02, -s * 0.075, lx + s * 0.10, -s * 0.02);
    ctx.lineTo(lx + s * 0.10, 0);
    ctx.lineTo(lx - s * 0.028, 0);          // sole
    ctx.lineTo(lx - s * 0.028, -s * 0.008);
    ctx.lineTo(lx - s * 0.045, -s * 0.008); // heel top
    // stiletto
    ctx.lineTo(lx - s * 0.042, 0);
    ctx.lineTo(lx - s * 0.052, 0);
    ctx.closePath(); ctx.fill();
  }

  // === pencil skirt (A-line silhouette) ===
  ctx.fillStyle = suit;
  ctx.beginPath();
  ctx.moveTo(-s * 0.115, -s * 0.46);
  ctx.lineTo(s * 0.115, -s * 0.46);
  ctx.lineTo(s * 0.145, -s * 0.27);
  ctx.lineTo(-s * 0.145, -s * 0.27);
  ctx.closePath(); ctx.fill();

  // === blazer torso ===
  ctx.fillStyle = suit;
  rr(ctx, -s * 0.115, -s * 0.68, s * 0.23, s * 0.24, s * 0.06); ctx.fill();
  // blouse V
  ctx.fillStyle = '#fdf6ee';
  ctx.beginPath();
  ctx.moveTo(s * 0.0, -s * 0.68); ctx.lineTo(s * 0.075, -s * 0.68);
  ctx.lineTo(s * 0.035, -s * 0.575); ctx.closePath(); ctx.fill();
  // lapel line
  ctx.strokeStyle = suitDark; ctx.lineWidth = s * 0.012;
  ctx.beginPath(); ctx.moveTo(s * 0.075, -s * 0.68); ctx.lineTo(s * 0.03, -s * 0.55); ctx.stroke();
  // brass button
  ctx.fillStyle = '#e8c87c';
  ctx.beginPath(); ctx.arc(s * 0.02, -s * 0.51, s * 0.014, 0, 7); ctx.fill();

  // === head ===
  const hy = -s * 0.77;
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(s * 0.025, hy, s * 0.095, 0, 7); ctx.fill();
  // hair: swept back with a big bun
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(s * 0.015, hy - s * 0.012, s * 0.10, Math.PI * 0.85, Math.PI * 1.98);
  ctx.fill();
  ctx.beginPath(); ctx.arc(-s * 0.10, hy - s * 0.045, s * 0.062, 0, 7); ctx.fill(); // bun
  ctx.fillStyle = '#7d2c15';
  ctx.beginPath(); ctx.arc(-s * 0.10, hy - s * 0.045, s * 0.028, 0, 7); ctx.fill();
  // pencil through the bun
  ctx.strokeStyle = '#e8b23a'; ctx.lineWidth = s * 0.016;
  ctx.beginPath(); ctx.moveTo(-s * 0.155, hy - s * 0.10); ctx.lineTo(-s * 0.045, hy + s * 0.0); ctx.stroke();
  // cat-eye glasses
  ctx.strokeStyle = '#26333d'; ctx.lineWidth = s * 0.013;
  ctx.beginPath(); ctx.arc(s * 0.065, hy - s * 0.012, s * 0.033, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.032, hy - s * 0.018); ctx.lineTo(-s * 0.02, hy - s * 0.025); ctx.stroke();
  // eye + brow
  ctx.fillStyle = '#26333d';
  ctx.beginPath(); ctx.arc(s * 0.068, hy - s * 0.012, s * 0.012, 0, 7); ctx.fill();
  // determined mouth
  ctx.strokeStyle = '#a5674a'; ctx.lineWidth = s * 0.012;
  ctx.beginPath(); ctx.moveTo(s * 0.06, hy + s * 0.05); ctx.lineTo(s * 0.098, hy + s * 0.045); ctx.stroke();
  // earring
  ctx.fillStyle = '#e8c87c';
  ctx.beginPath(); ctx.arc(-s * 0.005, hy + s * 0.03, s * 0.012, 0, 7); ctx.fill();

  // === front arm + stamp ===
  const shX = s * 0.06, shY = -s * 0.63;
  const aa = P.armAng;
  const ex = shX + Math.cos(aa) * s * 0.22, ey = shY + Math.sin(aa) * s * 0.22;
  ctx.strokeStyle = suit; ctx.lineWidth = s * 0.075; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(ex, ey); ctx.stroke();
  // hand
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(ex, ey, s * 0.045, 0, 7); ctx.fill();
  drawStamp(ctx, ex, ey, P.stampAng + Math.PI / 2 + 0.2, s * 0.62, P.squash);

  ctx.restore();
}

// GIL — Permit Compliance Officer. Rumpled brown suit, comb-over, mustache, coffee thermos in pocket.
export function drawGil(ctx, x, y, h, facing, pose, poseT = 0, time = 0) {
  const s = h;
  const P = poseParams(pose, poseT, time);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.translate(0, -P.bounce * s + P.crouch * s);
  ctx.rotate(P.lean);

  const skin = '#dfa578', suit = '#6d5138', suitDark = '#543d29', shirt = '#e9ecf2';

  // === back arm (clipboard) ===
  ctx.strokeStyle = suitDark; ctx.lineWidth = s * 0.085; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.58); ctx.lineTo(-s * 0.20, -s * 0.42); ctx.stroke();
  ctx.save(); ctx.translate(-s * 0.23, -s * 0.42); ctx.rotate(-0.2);
  ctx.fillStyle = '#9c6b32'; rr(ctx, -s * 0.075, -s * 0.1, s * 0.15, s * 0.2, s * 0.015); ctx.fill();
  ctx.fillStyle = '#fff'; rr(ctx, -s * 0.06, -s * 0.08, s * 0.12, s * 0.16, s * 0.01); ctx.fill();
  ctx.fillStyle = '#8a8f98';
  rr(ctx, -s * 0.03, -s * 0.115, s * 0.06, s * 0.035, s * 0.01); ctx.fill();
  ctx.strokeStyle = '#b9c0cb'; ctx.lineWidth = s * 0.01;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(-s * 0.045, -s * 0.05 + i * s * 0.032);
    ctx.lineTo(s * 0.045, -s * 0.05 + i * s * 0.032); ctx.stroke();
  }
  ctx.restore();

  // === legs: rumpled trousers + brown oxfords ===
  ctx.strokeStyle = suitDark; ctx.lineWidth = s * 0.085;
  ctx.beginPath(); ctx.moveTo(-s * 0.07, -s * 0.32); ctx.lineTo(-s * 0.085, -s * 0.035); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.07, -s * 0.32); ctx.lineTo(s * 0.085, -s * 0.035); ctx.stroke();
  ctx.fillStyle = '#3f2c1a';
  for (const lx of [-s * 0.085, s * 0.085]) {
    rr(ctx, lx - s * 0.05, -s * 0.045, s * 0.155, s * 0.045, s * 0.02); ctx.fill();
  }

  // === torso: barrel chest, jacket open over shirt+belly ===
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(s * 0.01, -s * 0.45, s * 0.13, s * 0.17, 0, 0, 7); ctx.fill();
  ctx.fillStyle = suit;
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, -s * 0.66);
  ctx.quadraticCurveTo(-s * 0.19, -s * 0.45, -s * 0.15, -s * 0.30);
  ctx.lineTo(-s * 0.05, -s * 0.30);
  ctx.quadraticCurveTo(-s * 0.10, -s * 0.48, -s * 0.03, -s * 0.66);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.16, -s * 0.66);
  ctx.quadraticCurveTo(s * 0.20, -s * 0.45, s * 0.16, -s * 0.30);
  ctx.lineTo(s * 0.075, -s * 0.30);
  ctx.quadraticCurveTo(s * 0.115, -s * 0.48, s * 0.055, -s * 0.66);
  ctx.closePath(); ctx.fill();
  // shoulders bridge
  ctx.fillStyle = suit;
  rr(ctx, -s * 0.15, -s * 0.69, s * 0.31, s * 0.09, s * 0.04); ctx.fill();
  // tie (slightly crooked, of course)
  ctx.fillStyle = '#a8332c';
  ctx.save(); ctx.translate(s * 0.012, -s * 0.62); ctx.rotate(0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(s * 0.035, s * 0.04); ctx.lineTo(s * 0.012, s * 0.22);
  ctx.lineTo(-s * 0.018, s * 0.20); ctx.lineTo(-s * 0.03, s * 0.04);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // ID badge clipped to jacket
  ctx.fillStyle = '#fff'; rr(ctx, s * 0.10, -s * 0.55, s * 0.055, s * 0.07, s * 0.008); ctx.fill();
  ctx.fillStyle = '#7fa6c9'; rr(ctx, s * 0.108, -s * 0.543, s * 0.038, s * 0.028, s * 0.006); ctx.fill();

  // === head: balding, mustache, tired eyes ===
  const hy = -s * 0.78;
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(s * 0.03, hy, s * 0.10, 0, 7); ctx.fill();
  // ear
  ctx.beginPath(); ctx.arc(-s * 0.045, hy + s * 0.01, s * 0.025, 0, 7); ctx.fill();
  // gray side hair + three-strand comb-over
  ctx.fillStyle = '#b9bdc2';
  ctx.beginPath(); ctx.arc(-s * 0.055, hy - s * 0.01, s * 0.045, Math.PI * 0.6, Math.PI * 1.5); ctx.fill();
  ctx.strokeStyle = '#b9bdc2'; ctx.lineWidth = s * 0.012; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, hy - s * 0.075 - i * s * 0.012);
    ctx.quadraticCurveTo(s * 0.03, hy - s * 0.125 - i * s * 0.012, s * 0.10, hy - s * 0.06 - i * s * 0.008);
    ctx.stroke();
  }
  // heavy brow + tired eye
  ctx.strokeStyle = '#5a4632'; ctx.lineWidth = s * 0.016;
  ctx.beginPath(); ctx.moveTo(s * 0.05, hy - s * 0.045); ctx.lineTo(s * 0.10, hy - s * 0.05); ctx.stroke();
  ctx.fillStyle = '#26333d';
  ctx.beginPath(); ctx.arc(s * 0.078, hy - s * 0.02, s * 0.013, 0, 7); ctx.fill();
  // bag under eye
  ctx.strokeStyle = '#c08b60'; ctx.lineWidth = s * 0.01;
  ctx.beginPath(); ctx.arc(s * 0.078, hy - s * 0.005, s * 0.022, 0.2, Math.PI - 0.4); ctx.stroke();
  // big nose
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(s * 0.125, hy + s * 0.012, s * 0.028, 0, 7); ctx.fill();
  // walrus mustache
  ctx.fillStyle = '#9b9fa5';
  ctx.beginPath();
  ctx.ellipse(s * 0.10, hy + s * 0.05, s * 0.055, s * 0.026, 0.12, 0, 7); ctx.fill();

  // === front arm + stamp (meatier arm) ===
  const shX = s * 0.09, shY = -s * 0.62;
  const aa = P.armAng;
  const ex = shX + Math.cos(aa) * s * 0.24, ey = shY + Math.sin(aa) * s * 0.24;
  ctx.strokeStyle = suit; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(ex, ey, s * 0.05, 0, 7); ctx.fill();
  drawStamp(ctx, ex, ey, P.stampAng + Math.PI / 2 + 0.2, s * 0.68, P.squash);

  ctx.restore();
}

export const CHARS = {
  dot: { name: 'DOT', draw: drawDot },
  bernie: { name: 'GIL', draw: drawGil },
};
