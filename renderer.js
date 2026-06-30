// ================================================================
//  renderer.js — 描画担当（Canvas描画・パーティクル・タイトル演出）
//  依存: levels.js (T, DIRS, STAGES)
//        logic.js  (state)
// ================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── アニメーション用タイマー ──
let time = 0;
let playerRotation = 0;

// ── セル色定義 ──
const CELL_COLORS = {
  [T.WALL]:       { fill: '#2d4a1e', stroke: '#4a7a30', glow: null },
  [T.DARK_WALL]:  { fill: '#1a0d2e', stroke: '#5a3a7e', glow: '#7c3aed' },
  [T.KEY]:        { fill: '#facc15', stroke: '#fbbf24', glow: '#fde68a' },
  [T.DOOR]:       { fill: '#92400e', stroke: '#b45309', glow: '#fbbf24' },
  [T.SPIKE]:      { fill: '#dc2626', stroke: '#ef4444', glow: '#fca5a5' },
  [T.ICE]:        { fill: '#bae6fd', stroke: '#7dd3fc', glow: '#e0f2fe' },
  [T.GOAL]:       { fill: '#16a34a', stroke: '#4ade80', glow: '#86efac' },
  [T.MUSHROOM]:   { fill: '#dc2626', stroke: '#ef4444', glow: '#fca5a5' },
};

// ================================================================
//  Helper: roundRect
// ================================================================
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ================================================================
//  drawCell — 各タイルの描画
// ================================================================
function drawCell(x, y, type, cs) {
  const px = x * cs;
  const py = y * cs;
  const s = getStageData(state.stage);
  const pal = s.palette;

  if (type === T.EMPTY) return;

  ctx.save();
  ctx.translate(px, py);

  switch (type) {
    case T.WALL:
    case T.DARK_WALL: {
      drawWall(type, cs);
      break;
    }

    case T.BOX: {
      const gb = ctx.createLinearGradient(0, 0, cs, cs);
      gb.addColorStop(0, '#92400e');
      gb.addColorStop(1, '#451a03');
      ctx.fillStyle = gb;
      roundRect(ctx, 2, 2, cs - 4, cs - 4, 5);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 2, 2, cs - 4, cs - 4, 5);
      ctx.stroke();

      ctx.strokeStyle = '#fbbf2466';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cs * 0.5, 4); ctx.lineTo(cs * 0.5, cs - 4);
      ctx.moveTo(4, cs * 0.5); ctx.lineTo(cs - 4, cs * 0.5);
      ctx.stroke();

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#fbbf2444';
      roundRect(ctx, 3, 3, cs - 6, cs - 6, 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }

    case T.KEY: {
      const pulse = Math.sin(time * 0.1) * 0.15 + 1;
      ctx.scale(pulse, pulse);
      ctx.translate(cs * (1 - pulse) * 0.5 / pulse, cs * (1 - pulse) * 0.5 / pulse);

      ctx.shadowColor = '#fde68a';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#facc15';
      const kx = cs * 0.4, ky = cs * 0.45, kr = cs * 0.18;
      ctx.beginPath(); ctx.arc(kx, ky, kr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath(); ctx.arc(kx, ky, kr * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(kx + kr * 0.9, ky - kr * 0.25, cs * 0.35, kr * 0.5);
      ctx.fillRect(kx + kr * 0.9 + cs * 0.15, ky + kr * 0.25, cs * 0.08, cs * 0.12);
      ctx.fillRect(kx + kr * 0.9 + cs * 0.25, ky + kr * 0.25, cs * 0.08, cs * 0.08);
      ctx.shadowBlur = 0;
      break;
    }

    case T.DOOR: {
      const gd = ctx.createLinearGradient(0, 0, 0, cs);
      gd.addColorStop(0, '#b45309');
      gd.addColorStop(1, '#451a03');
      ctx.fillStyle = state.hasKey ? '#4ade80' : gd;
      roundRect(ctx, 3, 1, cs - 6, cs - 2, 4);
      ctx.fill();
      ctx.strokeStyle = state.hasKey ? '#86efac' : '#fbbf24';
      ctx.lineWidth = 2;
      roundRect(ctx, 3, 1, cs - 6, cs - 2, 4);
      ctx.stroke();

      if (!state.hasKey) {
        ctx.fillStyle = '#fbbf24';
        const lx = cs * 0.5, ly = cs * 0.52, lw = cs * 0.22, lh = cs * 0.2;
        ctx.fillRect(lx - lw * 0.5, ly, lw, lh);
        ctx.beginPath();
        ctx.arc(lx, ly, lw * 0.5, Math.PI, 0);
        ctx.lineWidth = cs * 0.06;
        ctx.strokeStyle = '#fbbf24';
        ctx.stroke();
      } else {
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${cs * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', cs * 0.5, cs * 0.5);
        ctx.shadowBlur = 0;
      }
      break;
    }

    case T.SPIKE: {
      const count = 3;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#fca5a5';
      ctx.shadowBlur = 8;
      for (let i = 0; i < count; i++) {
        const bx = cs * (i + 0.5) / count;
        ctx.beginPath();
        ctx.moveTo(bx - cs * 0.12, cs - 2);
        ctx.lineTo(bx, cs * 0.15);
        ctx.lineTo(bx + cs * 0.12, cs - 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      break;
    }

    case T.ICE: {
      const gi = ctx.createLinearGradient(0, 0, cs, cs);
      gi.addColorStop(0, '#e0f2fe');
      gi.addColorStop(1, '#7dd3fc');
      ctx.fillStyle = gi;
      ctx.fillRect(0, cs - 6, cs, 6);
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, cs - 6, cs, 6);
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(cs * 0.1, cs - 5, cs * 0.2, 2);
      break;
    }

    case T.GOAL: {
      const pulse2 = Math.sin(time * 0.08) * 0.1 + 1;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 20 * pulse2;
      const gg = ctx.createRadialGradient(cs * 0.5, cs * 0.5, 2, cs * 0.5, cs * 0.5, cs * 0.5);
      gg.addColorStop(0, pal.accent + 'ff');
      gg.addColorStop(0.6, pal.glow + '88');
      gg.addColorStop(1, pal.dark + '00');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(cs * 0.5, cs * 0.5, cs * 0.42 * pulse2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${cs * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', cs * 0.5, cs * 0.5);
      break;
    }

    case T.MUSHROOM: {
      const gm = ctx.createRadialGradient(cs * 0.5, cs * 0.35, 2, cs * 0.5, cs * 0.4, cs * 0.5);
      gm.addColorStop(0, '#fca5a5');
      gm.addColorStop(1, '#dc2626');
      ctx.fillStyle = gm;
      ctx.beginPath();
      ctx.ellipse(cs * 0.5, cs * 0.42, cs * 0.42, cs * 0.28, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fee2e2';
      [[0.32, 0.32], [0.5, 0.24], [0.68, 0.34], [0.42, 0.4]].forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(cs * fx, cs * fy, cs * 0.045, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#fef3c7';
      roundRect(ctx, cs * 0.4, cs * 0.42, cs * 0.2, cs * 0.5, 3);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      roundRect(ctx, cs * 0.4, cs * 0.42, cs * 0.2, cs * 0.5, 3);
      ctx.stroke();
      break;
    }

    case T.PLAYER: {
      drawPlayer(cs);
      break;
    }
  }

  ctx.restore();
}

// ================================================================
//  drawPlayer — プレイヤーキャラクター描画（スキン対応）
// ================================================================
function drawPlayer(cs) {
  const bob = Math.sin(time * 0.12) * 2;
  const s = getStageData(state.stage);
  const pal = s.palette;

  ctx.save();
  ctx.translate(cs / 2, cs / 2);

  const targetRot = {
    DOWN: 0,
    RIGHT: -Math.PI / 2,
    UP: Math.PI,
    LEFT: Math.PI / 2
  }[state.gravity];

  playerRotation += (targetRot - playerRotation) * 0.15;
  ctx.rotate(playerRotation);
  ctx.translate(-cs / 2, -cs / 2);

  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = 16;

  const skin = (typeof state !== 'undefined' && state.currentSkin) ? state.currentSkin : 'wizard';

  switch(skin) {
    case 'knight': drawPlayerKnight(cs, bob); break;
    case 'ghost':  drawPlayerGhost(cs, bob);  break;
    case 'fairy':  drawPlayerFairy(cs, bob);  break;
    case 'dragon': drawPlayerDragon(cs, bob); break;
    case 'cat':    drawPlayerCat(cs, bob);    break;
    default:       drawPlayerWizard(cs, bob); break;
  }

  // Key indicator (共通)
  if (state.hasKey) {
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.font = `${cs * 0.25}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗝️', cs * 0.82, cs * 0.2 + bob);
    ctx.shadowBlur = 0;
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlayerWizard(cs, bob) {
  const gc = ctx.createLinearGradient(0, 0, 0, cs);
  gc.addColorStop(0, '#dc2626');
  gc.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = gc;
  roundRect(ctx, cs * 0.22, cs * 0.28 + bob, cs * 0.56, cs * 0.52, 8);
  ctx.fill();

  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(cs * 0.5, cs * 0.27 + bob, cs * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e0d2e';
  ctx.beginPath();
  ctx.arc(cs * 0.42, cs * 0.25 + bob, cs * 0.04, 0, Math.PI * 2);
  ctx.arc(cs * 0.58, cs * 0.25 + bob, cs * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e0d2e';
  ctx.fillRect(cs * 0.3, cs * 0.09 + bob, cs * 0.4, cs * 0.05);
  ctx.beginPath();
  ctx.moveTo(cs * 0.38, cs * 0.09 + bob);
  ctx.lineTo(cs * 0.5, cs * -0.04 + bob);
  ctx.lineTo(cs * 0.62, cs * 0.09 + bob);
  ctx.closePath();
  ctx.fill();
}

function drawPlayerKnight(cs, bob) {
  // Armor body
  const ga = ctx.createLinearGradient(0, 0, 0, cs);
  ga.addColorStop(0, '#94a3b8');
  ga.addColorStop(1, '#334155');
  ctx.fillStyle = ga;
  roundRect(ctx, cs * 0.18, cs * 0.28 + bob, cs * 0.64, cs * 0.56, 6);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  roundRect(ctx, cs * 0.18, cs * 0.28 + bob, cs * 0.64, cs * 0.56, 6);
  ctx.stroke();

  // Cross on chest
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(cs * 0.46, cs * 0.34 + bob, cs * 0.08, cs * 0.22);
  ctx.fillRect(cs * 0.34, cs * 0.42 + bob, cs * 0.32, cs * 0.07);

  // Helmet
  const gh = ctx.createLinearGradient(0, cs * 0.05, 0, cs * 0.28);
  gh.addColorStop(0, '#64748b');
  gh.addColorStop(1, '#475569');
  ctx.fillStyle = gh;
  roundRect(ctx, cs * 0.25, cs * 0.08 + bob, cs * 0.5, cs * 0.24, 10);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cs * 0.25, cs * 0.08 + bob, cs * 0.5, cs * 0.24, 10);
  ctx.stroke();

  // Visor slit (eyes glow)
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 8;
  ctx.fillRect(cs * 0.33, cs * 0.17 + bob, cs * 0.14, cs * 0.05);
  ctx.fillRect(cs * 0.53, cs * 0.17 + bob, cs * 0.14, cs * 0.05);
  ctx.shadowBlur = 0;
}

function drawPlayerGhost(cs, bob) {
  const ghostBob = bob + Math.sin(time * 0.07) * 3;

  // Body (translucent)
  ctx.globalAlpha = 0.82;
  const gg = ctx.createRadialGradient(cs*0.5, cs*0.4+ghostBob, cs*0.05, cs*0.5, cs*0.4+ghostBob, cs*0.42);
  gg.addColorStop(0, '#e0e7ff');
  gg.addColorStop(0.6, '#a5b4fc');
  gg.addColorStop(1, '#6366f100');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(cs * 0.5, cs * 0.35 + ghostBob, cs * 0.32, Math.PI, 0);
  ctx.lineTo(cs * 0.82, cs * 0.72 + ghostBob);
  // Wavy bottom
  ctx.quadraticCurveTo(cs * 0.72, cs * 0.62 + ghostBob, cs * 0.62, cs * 0.72 + ghostBob);
  ctx.quadraticCurveTo(cs * 0.52, cs * 0.82 + ghostBob, cs * 0.42, cs * 0.72 + ghostBob);
  ctx.quadraticCurveTo(cs * 0.32, cs * 0.62 + ghostBob, cs * 0.18, cs * 0.72 + ghostBob);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Glowing eyes
  ctx.fillStyle = '#312e81';
  ctx.shadowColor = '#818cf8';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(cs * 0.40, cs * 0.34 + ghostBob, cs * 0.07, cs * 0.06, 0, 0, Math.PI * 2);
  ctx.ellipse(cs * 0.60, cs * 0.34 + ghostBob, cs * 0.07, cs * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawPlayerFairy(cs, bob) {
  // Wings (behind)
  const wingPulse = Math.sin(time * 0.25) * 0.08;
  ctx.save();
  ctx.globalAlpha = 0.55 + wingPulse;

  // Left wing
  ctx.fillStyle = '#f0abfc';
  ctx.shadowColor = '#e879f9';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(cs * 0.28, cs * 0.38 + bob, cs * 0.22, cs * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.ellipse(cs * 0.72, cs * 0.38 + bob, cs * 0.22, cs * 0.14, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Body
  const gf = ctx.createLinearGradient(0, cs * 0.25, 0, cs * 0.82);
  gf.addColorStop(0, '#f0abfc');
  gf.addColorStop(1, '#a855f7');
  ctx.fillStyle = gf;
  roundRect(ctx, cs * 0.28, cs * 0.30 + bob, cs * 0.44, cs * 0.46, 10);
  ctx.fill();

  // Face
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(cs * 0.5, cs * 0.26 + bob, cs * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Sparkling eyes
  ctx.fillStyle = '#7c3aed';
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(cs * 0.43, cs * 0.24 + bob, cs * 0.04, 0, Math.PI * 2);
  ctx.arc(cs * 0.57, cs * 0.24 + bob, cs * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Crown/tiara
  ctx.fillStyle = '#facc15';
  ctx.shadowColor = '#fde68a';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cs * 0.36, cs * 0.11 + bob);
  ctx.lineTo(cs * 0.40, cs * 0.05 + bob);
  ctx.lineTo(cs * 0.50, cs * 0.09 + bob);
  ctx.lineTo(cs * 0.60, cs * 0.05 + bob);
  ctx.lineTo(cs * 0.64, cs * 0.11 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawPlayerDragon(cs, bob) {
  const flamePulse = Math.sin(time * 0.18) * 0.1;

  // Tail
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = cs * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cs * 0.78, cs * 0.65 + bob);
  ctx.quadraticCurveTo(cs * 0.95, cs * 0.60 + bob, cs * 0.92, cs * 0.80 + bob);
  ctx.stroke();

  // Body
  const gd = ctx.createLinearGradient(0, cs * 0.2, 0, cs);
  gd.addColorStop(0, '#16a34a');
  gd.addColorStop(1, '#14532d');
  ctx.fillStyle = gd;
  roundRect(ctx, cs * 0.18, cs * 0.28 + bob, cs * 0.64, cs * 0.56, 12);
  ctx.fill();

  // Scales pattern
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 1;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      ctx.beginPath();
      ctx.arc(
        cs * (0.28 + sx * 0.22),
        cs * (0.42 + sy * 0.15) + bob,
        cs * 0.08, Math.PI, 0
      );
      ctx.stroke();
    }
  }

  // Head
  const gh2 = ctx.createLinearGradient(0, cs * 0.04, 0, cs * 0.32);
  gh2.addColorStop(0, '#22c55e');
  gh2.addColorStop(1, '#15803d');
  ctx.fillStyle = gh2;
  roundRect(ctx, cs * 0.22, cs * 0.06 + bob, cs * 0.56, cs * 0.28, 10);
  ctx.fill();

  // Horns
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(cs * 0.32, cs * 0.08 + bob);
  ctx.lineTo(cs * 0.28, cs * -0.02 + bob);
  ctx.lineTo(cs * 0.38, cs * 0.08 + bob);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cs * 0.62, cs * 0.08 + bob);
  ctx.lineTo(cs * 0.72, cs * -0.02 + bob);
  ctx.lineTo(cs * 0.68, cs * 0.08 + bob);
  ctx.fill();

  // Eyes (fiery)
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(cs * 0.38, cs * 0.18 + bob, cs * 0.06, cs * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(cs * 0.62, cs * 0.18 + bob, cs * 0.06, cs * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Flame breath (animated)
  const fAlpha = 0.5 + flamePulse;
  ctx.globalAlpha = fAlpha;
  ctx.fillStyle = '#f97316';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(cs * 0.82, cs * 0.20 + bob, cs * 0.14, cs * 0.06, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(cs * 0.88, cs * 0.19 + bob, cs * 0.07, cs * 0.04, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawPlayerCat(cs, bob) {
  const tailWag = Math.sin(time * 0.1) * 0.15;
  const earTwitch = Math.sin(time * 0.22) * 0.04;

  // ── Tail (ふわふわ動く尻尾) ──
  ctx.strokeStyle = '#f5c9a0';
  ctx.lineWidth = cs * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cs * 0.76, cs * 0.68 + bob);
  ctx.quadraticCurveTo(
    cs * (0.95 + tailWag), cs * 0.55 + bob,
    cs * (0.88 + tailWag), cs * 0.32 + bob
  );
  ctx.stroke();
  ctx.fillStyle = '#f5c9a0';
  ctx.beginPath();
  ctx.arc(cs * (0.88 + tailWag), cs * 0.32 + bob, cs * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // ── Body (まんまるなローブ) ──
  const gb = ctx.createLinearGradient(0, cs * 0.32, 0, cs);
  gb.addColorStop(0, '#fbb6ce');
  gb.addColorStop(1, '#ec8fc0');
  ctx.fillStyle = gb;
  ctx.beginPath();
  ctx.ellipse(cs * 0.5, cs * 0.62 + bob, cs * 0.30, cs * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // ローブのフリル模様
  ctx.strokeStyle = '#ffffff77';
  ctx.lineWidth = cs * 0.015;
  ctx.beginPath();
  ctx.ellipse(cs * 0.5, cs * 0.62 + bob, cs * 0.22, cs * 0.18, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 前足
  ctx.fillStyle = '#fdf2f8';
  ctx.beginPath();
  ctx.ellipse(cs * 0.36, cs * 0.80 + bob, cs * 0.06, cs * 0.08, 0, 0, Math.PI * 2);
  ctx.ellipse(cs * 0.64, cs * 0.80 + bob, cs * 0.06, cs * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Head (まんまる) ──
  const gh = ctx.createRadialGradient(
    cs * 0.44, cs * 0.30 + bob, cs * 0.02,
    cs * 0.5, cs * 0.33 + bob, cs * 0.24
  );
  gh.addColorStop(0, '#fff7ed');
  gh.addColorStop(1, '#fde7c8');
  ctx.fillStyle = gh;
  ctx.beginPath();
  ctx.arc(cs * 0.5, cs * 0.33 + bob, cs * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // ── Ears (ふわふわ揺れる三角の耳) ──
  ctx.fillStyle = '#fde7c8';
  // 左耳
  ctx.beginPath();
  ctx.moveTo(cs * (0.30 - earTwitch), cs * 0.20 + bob);
  ctx.lineTo(cs * (0.24 - earTwitch), cs * 0.04 + bob);
  ctx.lineTo(cs * (0.42 - earTwitch), cs * 0.14 + bob);
  ctx.closePath();
  ctx.fill();
  // 右耳
  ctx.beginPath();
  ctx.moveTo(cs * (0.70 + earTwitch), cs * 0.20 + bob);
  ctx.lineTo(cs * (0.76 + earTwitch), cs * 0.04 + bob);
  ctx.lineTo(cs * (0.58 + earTwitch), cs * 0.14 + bob);
  ctx.closePath();
  ctx.fill();
  // 耳の内側（ピンク）
  ctx.fillStyle = '#fbb6ce';
  ctx.beginPath();
  ctx.moveTo(cs * (0.31 - earTwitch), cs * 0.17 + bob);
  ctx.lineTo(cs * (0.28 - earTwitch), cs * 0.08 + bob);
  ctx.lineTo(cs * (0.38 - earTwitch), cs * 0.135 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cs * (0.69 + earTwitch), cs * 0.17 + bob);
  ctx.lineTo(cs * (0.72 + earTwitch), cs * 0.08 + bob);
  ctx.lineTo(cs * (0.62 + earTwitch), cs * 0.135 + bob);
  ctx.closePath();
  ctx.fill();

  // ── とんがり魔法帽子（猫耳の間にちょこんと乗る小さい帽子）──
  ctx.fillStyle = '#c084fc';
  ctx.beginPath();
  ctx.moveTo(cs * 0.40, cs * 0.155 + bob);
  ctx.lineTo(cs * 0.5, cs * -0.03 + bob);
  ctx.lineTo(cs * 0.60, cs * 0.155 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0abfc';
  ctx.beginPath();
  ctx.ellipse(cs * 0.5, cs * 0.155 + bob, cs * 0.11, cs * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  // 帽子の星
  ctx.fillStyle = '#fde68a';
  ctx.shadowColor = '#fde68a';
  ctx.shadowBlur = 8;
  ctx.font = `${cs * 0.08}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cs * 0.5, cs * 0.06 + bob);
  ctx.shadowBlur = 0;

  // ── Cheeks (ほっぺ) ──
  ctx.fillStyle = '#fbb6ce99';
  ctx.beginPath();
  ctx.ellipse(cs * 0.37, cs * 0.36 + bob, cs * 0.045, cs * 0.03, 0, 0, Math.PI * 2);
  ctx.ellipse(cs * 0.63, cs * 0.36 + bob, cs * 0.045, cs * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Whiskers (ヒゲ) ──
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = cs * 0.008;
  ctx.lineCap = 'round';
  [-1, 1].forEach(side => {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      const baseX = cs * (0.5 + side * 0.21);
      const baseY = cs * (0.345 + i * 0.025) + bob;
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(baseX + side * cs * 0.13, baseY - cs * 0.01 + i * cs * 0.02);
      ctx.stroke();
    }
  });

  // ── Eyes (大きくてキラキラ) ──
  const blink = (Math.sin(time * 0.06) > 0.96) ? 0.15 : 1; // 稀にまばたき
  ctx.fillStyle = '#5b3a29';
  ctx.beginPath();
  ctx.ellipse(cs * 0.41, cs * 0.32 + bob, cs * 0.045, cs * 0.06 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(cs * 0.59, cs * 0.32 + bob, cs * 0.045, cs * 0.06 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  if (blink > 0.5) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cs * 0.425, cs * 0.30 + bob, cs * 0.014, 0, Math.PI * 2);
    ctx.arc(cs * 0.605, cs * 0.30 + bob, cs * 0.014, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Nose & mouth ──
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.moveTo(cs * 0.485, cs * 0.385 + bob);
  ctx.lineTo(cs * 0.515, cs * 0.385 + bob);
  ctx.lineTo(cs * 0.5, cs * 0.40 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a8694f';
  ctx.lineWidth = cs * 0.012;
  ctx.beginPath();
  ctx.moveTo(cs * 0.5, cs * 0.40 + bob);
  ctx.quadraticCurveTo(cs * 0.46, cs * 0.43 + bob, cs * 0.43, cs * 0.41 + bob);
  ctx.moveTo(cs * 0.5, cs * 0.40 + bob);
  ctx.quadraticCurveTo(cs * 0.54, cs * 0.43 + bob, cs * 0.57, cs * 0.41 + bob);
  ctx.stroke();

  // ── キラキラ魔法の粒子 ──
  const sparkle = (Math.sin(time * 0.15) + 1) / 2;
  ctx.fillStyle = `rgba(253, 230, 138, ${0.4 + sparkle * 0.5})`;
  ctx.shadowColor = '#fde68a';
  ctx.shadowBlur = 10;
  ctx.font = `${cs * 0.07}px sans-serif`;
  ctx.fillText('✨', cs * 0.18, cs * 0.55 + bob - sparkle * cs * 0.05);
  ctx.fillText('✨', cs * 0.84, cs * 0.45 + bob - (1 - sparkle) * cs * 0.05);
  ctx.shadowBlur = 0;
}

// ================================================================
//  render — メインレンダリングループ
// ================================================================
function render() {
  const cs = state.cellSize;
  const s = getStageData(state.stage);
  const pal = s.palette;

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = pal.wall + '22';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++) {
      ctx.strokeRect(x * cs, y * cs, cs, cs);
    }

  // Camera shake
  let shakeX = 0, shakeY = 0;
  if (state.shakeTime > 0) {
    shakeX = (Math.random() - 0.5) * 8 * (state.shakeTime / 20);
    shakeY = (Math.random() - 0.5) * 8 * (state.shakeTime / 20);
    state.shakeTime--;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const type = state.grid[y][x];
      if (type !== T.EMPTY) {
        try {
          drawCell(x, y, type, cs);
        } catch (err) {
          console.error('drawCell failed at', x, y, 'type=', type, err);
        }
      }
    }
  }

  ctx.restore();

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // Stage clear flash
  if (state.won) {
    const alpha = Math.min(0.6, (time % 30) / 30 * 0.6);
    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  time++;
}

// ================================================================
//  Title screen particles
// ================================================================
const titleParticles = [];

function initTitleParticles() {
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = 0; i < 45; i++) {
    titleParticles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.15 + Math.random() * 0.35),
      size: 2 + Math.random() * 3.5,
      opacity: 0.15 + Math.random() * 0.35,
      hue: 36 + Math.random() * 24,        // 暖色（古紙・蜂蜜色）
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      sway: Math.random() * Math.PI * 2,
    });
  }
}

function animateTitleParticles() {
  const div = document.getElementById('titleParticles');
  let c2 = div.__canvas;
  if (!c2) {
    c2 = document.createElement('canvas');
    c2.width = window.innerWidth; c2.height = window.innerHeight;
    c2.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    div.parentNode.insertBefore(c2, div);
    div.__canvas = c2;
  }
  const ctx2 = c2.getContext('2d');
  ctx2.clearRect(0, 0, c2.width, c2.height);

  for (const p of titleParticles) {
    p.sway += 0.015;
    p.x += p.vx + Math.sin(p.sway) * 0.3;
    p.y += p.vy;
    p.rot += p.rotSpeed;
    if (p.y < -10) { p.y = c2.height + 10; p.x = Math.random() * c2.width; }
    if (p.x < -10) p.x = c2.width + 10;
    if (p.x > c2.width + 10) p.x = -10;

    ctx2.save();
    ctx2.translate(p.x, p.y);
    ctx2.rotate(p.rot);
    ctx2.globalAlpha = p.opacity;
    ctx2.shadowColor = `hsl(${p.hue}, 60%, 55%)`;
    ctx2.shadowBlur = 4;
    ctx2.fillStyle = `hsl(${p.hue}, 55%, 68%)`;
    // 小さな紙片・木の葉風の楕円
    ctx2.beginPath();
    ctx2.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.restore();
  }
  ctx2.globalAlpha = 1;
  ctx2.shadowBlur = 0;
}

function drawWall(type, cs) {
  const dark = (type === T.DARK_WALL);

  // テストプレイ中のカスタムステージ(state.stage === 5)には
  // 対応するテーマ描画が無いため、エディタで選択中のテーマ(currentThemeIdx)
  // にフォールバックする。
  let themeIdx = state.stage;
  if (themeIdx >= TEST_STAGE_INDEX || themeIdx < 0) {
    themeIdx = (typeof currentThemeIdx !== 'undefined') ? currentThemeIdx : 0;
  }

  switch(themeIdx) {

    case 0:
      drawForestWall(cs, dark);
      break;

    case 1:
      drawTowerWall(cs, dark);
      break;

    case 2:
      drawCandyWall(cs, dark);
      break;

    case 3:
      drawPalaceWall(cs, dark);
      break;

    case 4:
      drawIceWall(cs, dark);
      break;
  }
}

function drawForestWall(cs, dark){

  // 木材ベース
  const g = ctx.createLinearGradient(0,0,0,cs);

  if(dark){
    g.addColorStop(0,"#5a3d24");
    g.addColorStop(1,"#352012");
  }else{
    g.addColorStop(0,"#8c6239");
    g.addColorStop(1,"#5f3d22");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // ブロック枠
  ctx.strokeStyle = dark ? "#26160d" : "#3f2614";
  ctx.lineWidth = 2;
  ctx.strokeRect(0,0,cs,cs);

  // 上の苔
  ctx.fillStyle = dark ? "#3bbf6b" : "#67f29c";

  const moss = [
    [0.05,0.00,0.09],
    [0.18,0.02,0.08],
    [0.32,0.01,0.10],
    [0.46,0.00,0.08],
    [0.60,0.02,0.09],
    [0.75,0.00,0.10],
    [0.92,0.01,0.08]
  ];

  moss.forEach(m=>{
    ctx.beginPath();
    ctx.arc(
      cs*m[0],
      cs*m[1],
      cs*m[2],
      Math.PI,
      0
    );
    ctx.fill();
  });

  // 葉っぱ（固定配置）
  const leafColors = dark
    ? ["#1e4d22","#27682d","#1a3d1d"]
    : ["#5cbf41","#4faa34","#73d655"];

  const leaves = [
    [0.08,0.05,0],
    [0.18,0.02,1],
    [0.28,0.07,2],
    [0.38,0.03,0],
    [0.48,0.06,1],
    [0.58,0.02,2],
    [0.68,0.05,0],
    [0.78,0.03,1],
    [0.88,0.06,2]
  ];

  leaves.forEach(l=>{
    ctx.fillStyle = leafColors[l[2]];

    ctx.beginPath();
    ctx.arc(
      cs*l[0],
      cs*l[1],
      cs*0.09,
      0,
      Math.PI*2
    );
    ctx.fill();
  });

  // ツタ（固定）
  ctx.strokeStyle =
    dark ? "#2dd47a" : "#52ff9f";

  ctx.lineWidth = 2;

  const vx = cs * 0.78;

  ctx.beginPath();
  ctx.moveTo(vx,0);

  ctx.bezierCurveTo(
    vx+2,
    cs*0.25,
    vx-3,
    cs*0.55,
    vx,
    cs
  );

  ctx.stroke();

  // ツタの葉
  const vineLeaves = [
    [0.18,-3],
    [0.32, 3],
    [0.50,-3],
    [0.68, 3],
    [0.84,-3]
  ];

  vineLeaves.forEach(v=>{

    const y = cs*v[0];

    ctx.fillStyle =
      dark ? "#6affb0" : "#a5ffd1";

    ctx.beginPath();
    ctx.arc(vx+v[1],y,2,0,Math.PI*2);
    ctx.fill();

  });

  // 木目（固定）
  ctx.strokeStyle = dark ? "#2d180d" : "#4b2e18";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(cs*0.20,cs*0.35);
  ctx.lineTo(cs*0.42,cs*0.42);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.55,cs*0.62);
  ctx.lineTo(cs*0.78,cs*0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.25,cs*0.75);
  ctx.lineTo(cs*0.45,cs*0.80);
  ctx.stroke();
}

function drawTowerWall(cs, dark){

  // 石壁ベース
  const g = ctx.createLinearGradient(0,0,0,cs);

  if(dark){
    g.addColorStop(0,"#4b3a68");
    g.addColorStop(1,"#241933");
  }else{
    g.addColorStop(0,"#9f95b8");
    g.addColorStop(1,"#6f6488");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // レンガ
  const bw = cs / 2;
  const bh = cs / 3;

  ctx.strokeStyle = dark ? "#1a1324" : "#4c445f";
  ctx.lineWidth = 2;

  for(let row=0; row<3; row++){

    const offset = (row % 2) * bw * 0.5;

    for(let col=-1; col<3; col++){

      ctx.strokeRect(
        col*bw + offset,
        row*bh,
        bw,
        bh
      );
    }
  }

  // 石の陰影
  ctx.fillStyle = dark
    ? "#ffffff08"
    : "#ffffff18";

  ctx.fillRect(
    2,
    2,
    cs-4,
    cs*0.18
  );

  // ひび割れ
  ctx.strokeStyle =
    dark ? "#120d1b" : "#5f566f";

  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(cs*0.30, cs*0.15);
  ctx.lineTo(cs*0.35, cs*0.30);
  ctx.lineTo(cs*0.28, cs*0.42);
  ctx.lineTo(cs*0.36, cs*0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.72, cs*0.52);
  ctx.lineTo(cs*0.60, cs*0.65);
  ctx.lineTo(cs*0.68, cs*0.82);
  ctx.stroke();

  // 欠け
  ctx.fillStyle =
    dark ? "#1d1328" : "#5e5570";

  ctx.beginPath();
  ctx.moveTo(cs*0.05, cs*0.20);
  ctx.lineTo(cs*0.12, cs*0.26);
  ctx.lineTo(cs*0.05, cs*0.34);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cs*0.95, cs*0.65);
  ctx.lineTo(cs*0.86, cs*0.72);
  ctx.lineTo(cs*0.95, cs*0.80);
  ctx.fill();

  // 魔法の光
  ctx.shadowColor = "#c084fc";
  ctx.shadowBlur = 10;

  ctx.fillStyle = "#c084fc88";

  ctx.beginPath();
  ctx.arc(
    cs*0.20,
    cs*0.20,
    cs*0.04,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    cs*0.80,
    cs*0.75,
    cs*0.03,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawCandyWall(cs, dark){

  // クッキー生地
  const g = ctx.createLinearGradient(0,0,0,cs);

  if(dark){
    g.addColorStop(0,"#8b5a2b");
    g.addColorStop(1,"#4a2a10");
  }else{
    g.addColorStop(0,"#d8a56a");
    g.addColorStop(1,"#b97a3d");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // クッキー枠
  ctx.strokeStyle =
    dark ? "#3b1f0c" : "#8b4513";

  ctx.lineWidth = 2;
  ctx.strokeRect(0,0,cs,cs);

  // アイシング
  ctx.fillStyle =
    dark ? "#ffe8f5" : "#fff8fc";

  ctx.beginPath();

  ctx.moveTo(0,0);

  ctx.bezierCurveTo(
    cs*0.15, cs*0.08,
    cs*0.30,-cs*0.03,
    cs*0.45, cs*0.08
  );

  ctx.bezierCurveTo(
    cs*0.60, cs*0.18,
    cs*0.75,-cs*0.02,
    cs, cs*0.08
  );

  ctx.lineTo(cs,0);
  ctx.closePath();
  ctx.fill();

  // キャンディ固定配置
  const candies = [
    [0.18,0.30,"#ff4fa3"],
    [0.45,0.22,"#60a5fa"],
    [0.75,0.32,"#facc15"],
    [0.28,0.68,"#fb7185"],
    [0.65,0.74,"#4ade80"]
  ];

  candies.forEach(c=>{

    ctx.fillStyle = c[2];

    ctx.beginPath();
    ctx.arc(
      cs*c[0],
      cs*c[1],
      cs*0.08,
      0,
      Math.PI*2
    );
    ctx.fill();

    // キャンディ包装
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.moveTo(cs*c[0]-8,cs*c[1]);
    ctx.lineTo(cs*c[0]-14,cs*c[1]-4);
    ctx.lineTo(cs*c[0]-14,cs*c[1]+4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cs*c[0]+8,cs*c[1]);
    ctx.lineTo(cs*c[0]+14,cs*c[1]-4);
    ctx.lineTo(cs*c[0]+14,cs*c[1]+4);
    ctx.fill();
  });

  // チョコチップ
  const chips = [
    [0.12,0.15],
    [0.35,0.45],
    [0.55,0.55],
    [0.82,0.18],
    [0.72,0.86],
    [0.20,0.82]
  ];

  ctx.fillStyle = "#4a2511";

  chips.forEach(ch=>{

    ctx.beginPath();
    ctx.arc(
      cs*ch[0],
      cs*ch[1],
      cs*0.03,
      0,
      Math.PI*2
    );
    ctx.fill();
  });

  // ペパーミント
  ctx.save();

  ctx.translate(
    cs*0.80,
    cs*0.80
  );

  ctx.beginPath();
  ctx.arc(
    0,
    0,
    cs*0.10,
    0,
    Math.PI*2
  );

  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.strokeStyle = "#ff4f7d";
  ctx.lineWidth = 2;

  for(let i=0;i<6;i++){

    ctx.beginPath();

    ctx.moveTo(0,0);

    ctx.lineTo(
      Math.cos(i*Math.PI/3)*cs*0.10,
      Math.sin(i*Math.PI/3)*cs*0.10
    );

    ctx.stroke();
  }

  ctx.restore();
}

function drawPalaceWall(cs, dark){

  // 大理石ベース
  const g = ctx.createLinearGradient(0,0,cs,cs);

  if(dark){
    g.addColorStop(0,"#6a738c");
    g.addColorStop(1,"#3a4154");
  }else{
    g.addColorStop(0,"#f3f6ff");
    g.addColorStop(1,"#d8ddea");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // 外枠（金装飾）
  ctx.strokeStyle =
    dark ? "#b8860b" : "#ffd700";

  ctx.lineWidth = 3;

  ctx.strokeRect(
    2,
    2,
    cs-4,
    cs-4
  );

  // 内枠
  ctx.lineWidth = 1.5;

  ctx.strokeRect(
    6,
    6,
    cs-12,
    cs-12
  );

  // ステンドグラス中央
  const glass = ctx.createLinearGradient(
    0,
    0,
    0,
    cs
  );

  glass.addColorStop(0,"#93c5fd");
  glass.addColorStop(1,"#2563eb");

  ctx.fillStyle = glass;

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.18);
  ctx.lineTo(cs*0.72, cs*0.50);
  ctx.lineTo(cs*0.50, cs*0.82);
  ctx.lineTo(cs*0.28, cs*0.50);

  ctx.closePath();
  ctx.fill();

  // ステンドグラス枠
  ctx.strokeStyle =
    dark ? "#c9a227" : "#facc15";

  ctx.lineWidth = 2;

  ctx.stroke();

  // 十字模様
  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.22);
  ctx.lineTo(cs*0.50, cs*0.78);

  ctx.moveTo(cs*0.34, cs*0.50);
  ctx.lineTo(cs*0.66, cs*0.50);

  ctx.stroke();

  // 大理石の筋（固定）
  ctx.strokeStyle =
    dark ? "#8b93a8" : "#c7cfdd";

  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cs*0.15, cs*0.20);
  ctx.lineTo(cs*0.30, cs*0.35);
  ctx.lineTo(cs*0.22, cs*0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.70, cs*0.10);
  ctx.lineTo(cs*0.80, cs*0.35);
  ctx.lineTo(cs*0.72, cs*0.60);
  ctx.stroke();

  // 王冠モチーフ
  ctx.fillStyle =
    dark ? "#d4af37" : "#ffd700";

  ctx.beginPath();

  ctx.moveTo(cs*0.35, cs*0.12);
  ctx.lineTo(cs*0.42, cs*0.04);
  ctx.lineTo(cs*0.50, cs*0.12);
  ctx.lineTo(cs*0.58, cs*0.04);
  ctx.lineTo(cs*0.65, cs*0.12);

  ctx.closePath();
  ctx.fill();

  // 宝石
  ctx.fillStyle = "#60a5fa";

  ctx.beginPath();
  ctx.arc(
    cs*0.50,
    cs*0.09,
    cs*0.03,
    0,
    Math.PI*2
  );
  ctx.fill();
}

function drawIceWall(cs, dark){

  // 氷のグラデーション
  const g = ctx.createLinearGradient(
    0,
    0,
    cs,
    cs
  );

  if(dark){
    g.addColorStop(0,"#3b82f6");
    g.addColorStop(1,"#0f172a");
  }else{
    g.addColorStop(0,"#e0f2fe");
    g.addColorStop(1,"#7dd3fc");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // 外枠
  ctx.strokeStyle =
    dark ? "#60a5fa" : "#ffffff";

  ctx.lineWidth = 2;

  ctx.strokeRect(
    0,
    0,
    cs,
    cs
  );

  // 氷の反射
  ctx.fillStyle =
    dark ? "#ffffff10" : "#ffffff40";

  ctx.beginPath();

  ctx.moveTo(0,0);
  ctx.lineTo(cs*0.7,0);
  ctx.lineTo(0,cs*0.7);

  ctx.closePath();
  ctx.fill();

  // 氷のひび
  ctx.strokeStyle =
    dark ? "#93c5fd" : "#ffffff";

  ctx.lineWidth = 1.2;

  ctx.beginPath();

  ctx.moveTo(cs*0.20, cs*0.15);
  ctx.lineTo(cs*0.35, cs*0.30);
  ctx.lineTo(cs*0.28, cs*0.45);

  ctx.stroke();

  ctx.beginPath();

  ctx.moveTo(cs*0.72, cs*0.25);
  ctx.lineTo(cs*0.60, cs*0.42);
  ctx.lineTo(cs*0.78, cs*0.62);

  ctx.stroke();

  // 氷のステンドグラス

  const glass = ctx.createLinearGradient(
    0,
    cs*0.25,
    0,
    cs*0.75
  );

  glass.addColorStop(0,"#ffffff");
  glass.addColorStop(1,"#93c5fd");

  ctx.fillStyle = glass;

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.18);
  ctx.lineTo(cs*0.72, cs*0.50);
  ctx.lineTo(cs*0.50, cs*0.82);
  ctx.lineTo(cs*0.28, cs*0.50);

  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  ctx.stroke();

  // 窓の十字

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.22);
  ctx.lineTo(cs*0.50, cs*0.78);

  ctx.moveTo(cs*0.34, cs*0.50);
  ctx.lineTo(cs*0.66, cs*0.50);

  ctx.stroke();

  // 氷の宝石
  ctx.fillStyle =
    dark ? "#bfdbfe" : "#ffffff";

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.15);
  ctx.lineTo(cs*0.58, cs*0.25);
  ctx.lineTo(cs*0.50, cs*0.35);
  ctx.lineTo(cs*0.42, cs*0.25);

  ctx.closePath();
  ctx.fill();

  // 氷の尖塔
  ctx.fillStyle = "#e0f2fe";

  ctx.beginPath();

  ctx.moveTo(cs*0.15, cs*0.20);
  ctx.lineTo(cs*0.22, cs*0.05);
  ctx.lineTo(cs*0.29, cs*0.20);

  ctx.closePath();
  ctx.fill();

  ctx.beginPath();

  ctx.moveTo(cs*0.85, cs*0.20);
  ctx.lineTo(cs*0.78, cs*0.05);
  ctx.lineTo(cs*0.71, cs*0.20);

  ctx.closePath();
  ctx.fill();

  // 魔法の輝き
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 12;

  ctx.fillStyle = "#ffffffaa";

  ctx.beginPath();
  ctx.arc(
    cs*0.18,
    cs*0.18,
    cs*0.03,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    cs*0.82,
    cs*0.82,
    cs*0.025,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.shadowBlur = 0;
}

// ================================================================
//  renderEditor — エディタモード用の描画
// ================================================================
function renderEditor() {
  const cs = state.cellSize;
  const pal = THEMES_INTEGRATED[currentThemeIdx].palette;

  // 背景クリア
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド線の描画
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      ctx.strokeRect(x * cs, y * cs, cs, cs);
    }
  }

  // セルの描画
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const type = editGrid[y][x];
      if (type !== T.EMPTY) {
        try {
          drawCell(x, y, type, cs);
        } catch (err) {
          console.error('drawCell (editor) failed at', x, y, 'type=', type, err);
        }
      }
    }
  }

  time++;
}