// ================================================================
//  logic.js — ゲームロジック・物理・入力・UI
//  依存: levels.js (T, DIRS, STAGES)
//        renderer.js (render, initTitleParticles, animateTitleParticles)
// ================================================================

// ================================================================
//  Game state
// ================================================================
let state = {
  stage: 0,
  grid: [],
  rows: 0, cols: 0,
  playerPos: { x: 0, y: 0 },
  gravity: 'DOWN',
  hasKey: false,
  moves: 0,
  history: [],
  cellSize: 56,
  offsetX: 0, offsetY: 0,
  particles: [],
  gravRotation: 0,
  shakeTime: 0,
  fallAnimations: [],
  gameStarted: false,
  gameOver: false,
  won: false,
  coins: 0,
  currentSkin: 'wizard',
  unlockedSkins: ['wizard'],
  clearedStages: [],
  earnedTitles: [],      // 獲得済み称号id配列
  stageStartTime: 0,     // ステージ開始時刻(ms)
  newlyEarnedTitles: [], // 直近のクリアで新規獲得した称号（演出用）
  usedUndoThisStage: false,
  hasSeenPrologue: false,
  hasSeenEpilogue: false,
};

// ================================================================
//  称号(Titles) definitions
// ================================================================
// type: 'time'  -> 制限時間内クリア
//       'moves' -> 最短手数(+ tolerance)以内クリア
//       'noundo'-> アンドゥなしクリア
//       'all'   -> 全ステージクリア
function buildTitleDefs() {
  const defs = [];
  STAGES.forEach((s, i) => {
    defs.push({
      id: `gold_${i}`,
      stage: i,
      tier: 'gold',
      icon: '🏆',
      name: `${s.name}・完全制覇`,
      type: 'moves',
      tolerance: 0,
      desc: `「${s.name}」を最短手数でクリア`,
    });
    defs.push({
      id: `silver_${i}`,
      stage: i,
      tier: 'silver',
      icon: '🥈',
      name: `${s.name}・熟練`,
      type: 'moves',
      tolerance: 2,
      desc: `「${s.name}」を最短+2手以内でクリア`,
    });
    defs.push({
      id: `time_${i}`,
      stage: i,
      tier: 'time',
      icon: '⏱️',
      name: `${s.name}・俊足`,
      type: 'time',
      limit: STAGE_TIME_LIMITS[i],
      desc: `「${s.name}」を${STAGE_TIME_LIMITS[i]}秒以内にクリア`,
    });
    defs.push({
      id: `noundo_${i}`,
      stage: i,
      tier: 'bronze',
      icon: '🥉',
      name: `${s.name}・不退転`,
      type: 'noundo',
      desc: `「${s.name}」を一度も後戻りせずにクリア`,
    });
  });
  defs.push({
    id: 'all_clear',
    stage: null,
    tier: 'special',
    icon: '👑',
    name: '重力の覇者',
    type: 'all',
    desc: '全ステージをクリアする',
  });
  return defs;
}
const TITLE_DEFS = buildTitleDefs();
const SKINS = [
  { id: 'wizard',  name: '魔法使い',  icon: '🧙',  cost: 0,   desc: 'デフォルトキャラ' },
  { id: 'knight',  name: '騎士',      icon: '⚔️',  cost: 15,  desc: '鋼の鎧を纏う勇者' },
  { id: 'ghost',   name: '幽霊',      icon: '👻',  cost: 20,  desc: '壁をすり抜けそうな霊' },
  { id: 'fairy',   name: '妖精',      icon: '🧚',  cost: 25,  desc: '光の翼を持つ精霊' },
  { id: 'dragon',  name: 'ドラゴン',  icon: '🐉',  cost: 40,  desc: '炎を吐く最強の存在' },
  { id: 'cat',     name: 'ねこ魔法使い', icon: '🐱', cost: 0, unlockType: 'titles_complete',
    desc: '称号をすべて集めた者だけに\n姿を見せる、特別な使い魔。' },
];

function isTitlesComplete() {
  return state.earnedTitles.length >= TITLE_DEFS.length;
}

// ================================================================
//  Coin/Skin persistence (localStorage fallback if storage API fails)
// ================================================================
async function loadProgress() {
  try {
    const result = await window.storage.get('grimm-progress');
    if (result) {
      const data = JSON.parse(result.value);
      state.coins = data.coins || 0;
      state.currentSkin = data.currentSkin || 'wizard';
      state.unlockedSkins = data.unlockedSkins || ['wizard'];
      state.clearedStages = data.clearedStages || [];
      state.earnedTitles = data.earnedTitles || [];
      state.hasSeenPrologue = data.hasSeenPrologue || false;
      state.hasSeenEpilogue = data.hasSeenEpilogue || false;
    }
  } catch(e) {
    // storage not available, use defaults
  }
  updateCoinDisplay();
}

async function saveProgress() {
  try {
    await window.storage.set('grimm-progress', JSON.stringify({
      coins: state.coins,
      currentSkin: state.currentSkin,
      unlockedSkins: state.unlockedSkins,
      clearedStages: state.clearedStages,
      earnedTitles: state.earnedTitles,
      hasSeenPrologue: state.hasSeenPrologue,
      hasSeenEpilogue: state.hasSeenEpilogue,
    }));
  } catch(e) {}
}

function updateCoinDisplay() {
  const el = document.getElementById('coinCount');
  if (el) el.textContent = '🪙 ' + state.coins;
}

// ================================================================
//  Shop UI
// ================================================================
let _shopCloseCallback = null;

function openShop(onClose) {
  _shopCloseCallback = onClose || null;
  const shop = document.getElementById('shopScreen');
  shop.classList.remove('hidden');
  renderShop();
}

function closeShop() {
  document.getElementById('shopScreen').classList.add('hidden');
  if (_shopCloseCallback) {
    _shopCloseCallback();
    _shopCloseCallback = null;
  }
}

function renderShop() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  document.getElementById('shopCoins').textContent = '🪙 ' + state.coins;

  SKINS.forEach(skin => {
    const owned = state.unlockedSkins.includes(skin.id);
    const active = state.currentSkin === skin.id;
    const isTitleLocked = skin.unlockType === 'titles_complete';
    const titleConditionMet = isTitleLocked && isTitlesComplete();
    const card = document.createElement('div');
    card.className = 'skin-card'
      + (active ? ' active' : '')
      + (owned ? ' owned' : '')
      + (isTitleLocked ? ' special-skin' : '');

    let actionHtml;
    if (active) {
      actionHtml = '<span class="skin-badge equipped">装備中</span>';
    } else if (owned) {
      actionHtml = '<button class="skin-btn equip-btn" data-id="'+skin.id+'">装備する</button>';
    } else if (isTitleLocked) {
      actionHtml = titleConditionMet
        ? '<button class="skin-btn unlock-btn special-btn" data-id="'+skin.id+'">✨ 受け取る</button>'
        : '<span class="skin-badge locked">📜 称号コンプで解放</span>';
    } else if (skin.cost === 0) {
      actionHtml = '<button class="skin-btn equip-btn" data-id="'+skin.id+'">装備する</button>';
    } else if (state.coins >= skin.cost) {
      actionHtml = '<button class="skin-btn buy-btn" data-id="'+skin.id+'" data-cost="'+skin.cost+'">🪙 '+skin.cost+' で購入</button>';
    } else {
      actionHtml = '<span class="skin-badge locked">🪙 '+skin.cost+' 必要</span>';
    }

    card.innerHTML = `
      <div class="skin-icon">${skin.icon}</div>
      ${isTitleLocked ? '<div class="skin-special-tag">✨ 称号コンプ限定</div>' : ''}
      <div class="skin-name">${skin.name}</div>
      <div class="skin-desc">${skin.desc}</div>
      <div class="skin-action">${actionHtml}</div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const cost = parseInt(btn.dataset.cost);
      if (state.coins >= cost && !state.unlockedSkins.includes(id)) {
        state.coins -= cost;
        state.unlockedSkins.push(id);
        state.currentSkin = id;
        saveProgress();
        updateCoinDisplay();
        renderShop();
        spawnCoinBurst();
      }
    });
  });

  grid.querySelectorAll('.unlock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (!state.unlockedSkins.includes(id) && isTitlesComplete()) {
        state.unlockedSkins.push(id);
        state.currentSkin = id;
        saveProgress();
        renderShop();
        spawnCoinBurst();
      }
    });
  });

  grid.querySelectorAll('.equip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentSkin = btn.dataset.id;
      saveProgress();
      renderShop();
    });
  });
}

function spawnCoinBurst() {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 3 + Math.random() * 6;
    state.particles.push({
      x: canvas.width / 2, y: canvas.height / 2,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1.0, decay: 0.025, size: 5 + Math.random() * 5,
      color: `hsl(${45 + Math.random() * 20}, 100%, 60%)`,
    });
  }
}

// ================================================================
//  Cutscene engine (story.js: CHARACTERS, PROLOGUE_SCENE,
//                    STAGE_INTRO_SCENES, STAGE_OUTRO_SCENES, EPILOGUE_SCENE)
// ================================================================
let _sceneQueue = [];
let _sceneIndex = 0;
let _sceneOnComplete = null;
let _sceneClickHandler = null;

function playScene(lines, onComplete) {
  if (!lines || lines.length === 0) {
    if (onComplete) onComplete();
    return;
  }
  _sceneQueue = lines;
  _sceneIndex = 0;
  _sceneOnComplete = onComplete || null;

  const screen = document.getElementById('storyScreen');
  screen.classList.remove('hidden');

  _renderSceneLine();

  if (_sceneClickHandler) {
    screen.removeEventListener('click', _sceneClickHandler);
  }
  _sceneClickHandler = (e) => {
    if (e.target.id === 'storySkipBtn') return; // skip handled separately
    _advanceScene();
  };
  screen.addEventListener('click', _sceneClickHandler);
}

function _renderSceneLine() {
  const line = _sceneQueue[_sceneIndex];
  const nameTag = document.getElementById('storyNameTag');
  const textEl = document.getElementById('storyText');
  const leftChar = document.getElementById('storyStageLeft');
  const rightChar = document.getElementById('storyStageRight');

  if (line.speaker) {
    nameTag.textContent = line.speaker.icon + ' ' + line.speaker.name;
    nameTag.style.color = line.speaker.color || '#e8d5a3';
    nameTag.classList.remove('hidden');
  } else {
    nameTag.classList.add('hidden');
  }

  textEl.textContent = line.text;

  // 立ち絵表示（side: left/right にキャラがいれば強調表示）
  leftChar.classList.add('hidden');
  rightChar.classList.add('hidden');
  if (line.side === 'left' && line.speaker) {
    leftChar.querySelector('.story-char-icon').textContent = line.speaker.icon;
    leftChar.classList.remove('hidden');
    leftChar.classList.add('active');
  } else if (line.side === 'right' && line.speaker) {
    rightChar.querySelector('.story-char-icon').textContent = line.speaker.icon;
    rightChar.classList.remove('hidden');
    rightChar.classList.add('active');
  }

  const hint = document.getElementById('storyNextHint');
  hint.textContent = (_sceneIndex === _sceneQueue.length - 1) ? 'クリックして閉じる ▶' : 'クリックして進む ▶';
}

function _advanceScene() {
  _sceneIndex++;
  if (_sceneIndex >= _sceneQueue.length) {
    _endScene();
  } else {
    _renderSceneLine();
  }
}

function _endScene() {
  const screen = document.getElementById('storyScreen');
  screen.classList.add('hidden');
  if (_sceneClickHandler) {
    screen.removeEventListener('click', _sceneClickHandler);
    _sceneClickHandler = null;
  }
  const cb = _sceneOnComplete;
  _sceneOnComplete = null;
  if (cb) cb();
}

document.getElementById('storySkipBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  _endScene();
});

// ================================================================
//  Utility
// ================================================================
function deepCopy(g) { return g.map(r => [...r]); }

function findAll(grid, type) {
  const res = [];
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < grid[y].length; x++)
      if (grid[y][x] === type) res.push({ x, y });
  return res;
}

function findOne(grid, type) { return findAll(grid, type)[0] || null; }

function isSolid(t) { return t === T.WALL || t === T.DARK_WALL; }
function isPassable(t) { return t === T.EMPTY || t === T.KEY || t === T.GOAL || t === T.ICE || t === T.MUSHROOM; }

// ================================================================
//  Stage loading
// ================================================================
function loadStage(idx) {
  const s = STAGES[idx];
  state.stage = idx;
  state.grid = deepCopy(s.grid);
  state.rows = state.grid.length;
  state.cols = state.grid[0].length;
  state.gravity = 'DOWN';
  state.hasKey = false;
  state.moves = 0;
  state.history = [];
  state.particles = [];
  state.fallAnimations = [];
  state.gameOver = false;
  state.won = false;
  state.usedUndoThisStage = false;
  state.stageStartTime = Date.now();

  const p = findOne(state.grid, T.PLAYER);
  state.playerPos = { x: p.x, y: p.y };

  fitCanvas();
  updateHUD();
  updateGravArrow(true);
}

function fitCanvas() {
  const maxW = window.innerWidth  - 32;
  const maxH = window.innerHeight - 80;
  const cellW = Math.floor(maxW / state.cols);
  const cellH = Math.floor(maxH / state.rows);
  state.cellSize = Math.max(32, Math.min(64, Math.min(cellW, cellH)));

  const w = state.cols * state.cellSize;
  const h = state.rows * state.cellSize;
  canvas.width  = w;
  canvas.height = h;
  state.offsetX = Math.floor((window.innerWidth  - w) / 2);
  state.offsetY = Math.floor((window.innerHeight - h) / 2);
  canvas.style.left = state.offsetX + 'px';
  canvas.style.top  = state.offsetY + 'px';
  canvas.style.position = 'fixed';
}

// ================================================================
//  Physics — apply gravity (fall all moveable tiles)
// ================================================================
function applyGravity(grid, grav) {
  const dir = DIRS[grav];
  let moved = true;
  let iterations = 0;
  while (moved && iterations < 200) {
    moved = false;
    iterations++;
    const moveables = findAll(grid, T.PLAYER).concat(findAll(grid, T.BOX));
    moveables.sort((a, b) => {
      const ax = dir.dx !== 0 ? a.x * dir.dx : a.y * dir.dy;
      const bx = dir.dx !== 0 ? b.x * dir.dx : b.y * dir.dy;
      return bx - ax;
    });

    for (const pos of moveables) {
      const type = grid[pos.y][pos.x];
      const nx = pos.x + dir.dx;
      const ny = pos.y + dir.dy;

      if (nx < 0 || nx >= grid[0].length || ny < 0 || ny >= grid.length) continue;

      const below = grid[ny][nx];

      const canFall = (below === T.EMPTY)
  　　　|| (below === T.ICE)
  　　　|| (below === T.KEY && type === T.PLAYER)
  　　　|| (below === T.GOAL && type === T.PLAYER && state.hasKey)
  　　　|| (below === T.MUSHROOM && type === T.PLAYER);
      
      if (canFall) {
        if (below === T.KEY && type === T.PLAYER) state.hasKey = true;
        grid[ny][nx] = type;
        grid[pos.y][pos.x] = T.EMPTY;
        if (type === T.PLAYER) state.playerPos = { x: nx, y: ny };
        moved = true;
      }

      if (below === T.SPIKE && type === T.PLAYER) {
        state.gameOver = true;
      }

      if (below === T.DOOR && type === T.PLAYER && state.hasKey) {
        grid[ny][nx] = T.PLAYER;
        grid[pos.y][pos.x] = T.EMPTY;
        state.playerPos = { x: nx, y: ny };
        state.won = true;
        moved = true;
      }

      if (below === T.GOAL && type === T.PLAYER && state.hasKey)  {
        state.won = true;
      }
    }
  }
  return grid;
}

// ================================================================
//  Input — change gravity direction
// ================================================================
function changeGravity(dir) {
  if (state.gameOver || state.won || !state.gameStarted) return;

  state.history.push({
    grid: deepCopy(state.grid),
    playerPos: { ...state.playerPos },
    gravity: state.gravity,
    hasKey: state.hasKey,
    moves: state.moves,
  });
  if (state.history.length > 50) state.history.shift();

  state.gravity = dir;
  state.moves++;

  const oldP = findOne(state.grid, T.PLAYER);
  if (oldP && (oldP.x !== state.playerPos.x || oldP.y !== state.playerPos.y)) {
    state.grid[oldP.y][oldP.x] = T.EMPTY;
    state.grid[state.playerPos.y][state.playerPos.x] = T.PLAYER;
  }

  state.grid = applyGravity(state.grid, dir);
  updateHUD();
  updateGravArrow(false);
  spawnGravParticles(dir);

  if (state.gameOver) {
    state.shakeTime = 20;
    setTimeout(showDeath, 500);
  } else if (state.won || checkGoal()) {
    setTimeout(() => showVictory(), 600);
  }
}

function checkGoal() {
  const p = state.playerPos;
  const s = STAGES[state.stage];
  if (s.doorTarget) {
    return p.x === s.doorTarget.x && p.y === s.doorTarget.y;
  }
  const cell = state.grid[p.y][p.x];
　return (cell === T.GOAL && state.hasKey) || state.won;
}

function undoMove() {
  if (state.history.length === 0) return;
  const h = state.history.pop();
  state.grid = h.grid;
  state.playerPos = h.playerPos;
  state.gravity = h.gravity;
  state.hasKey = h.hasKey;
  state.moves = h.moves;
  state.gameOver = false;
  state.won = false;
  state.usedUndoThisStage = true;
  updateHUD();
  updateGravArrow(false);
}

// ================================================================
//  HUD & UI helpers
// ================================================================
function updateHUD() {
  document.getElementById('stageName').textContent =
    STAGES[state.stage].icon + ' ' + STAGES[state.stage].name;
  document.getElementById('moveCount').textContent = 'moves: ' + state.moves;
}

const ARROW_CHARS = { DOWN: '↓', UP: '↑', LEFT: '←', RIGHT: '→' };
const ARROW_ROTS  = { DOWN: 0, UP: 180, LEFT: 90, RIGHT: 270 };

function updateGravArrow(instant) {
  const el = document.getElementById('gravArrow');
  el.textContent = ARROW_CHARS[state.gravity];
  if (!instant) {
    el.style.transform = `rotate(${ARROW_ROTS[state.gravity]}deg) scale(1.4)`;
    setTimeout(() => { el.style.transform = `rotate(${ARROW_ROTS[state.gravity]}deg) scale(1)`; }, 200);
  }
}

function showOverlay(title, text, btn, cb, showShop = false, showTitleBtn = false) {
  const ov = document.getElementById('overlay');
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayText').textContent = text;
  const b = document.getElementById('overlayBtn');
  b.textContent = btn;
  b.onclick = () => { ov.classList.add('hidden'); cb(); };

  const sb = document.getElementById('overlayShopBtn');
  if (showShop) {
    sb.classList.remove('hidden');
    sb.onclick = () => {
      ov.classList.add('hidden');
      openShop(() => { ov.classList.remove('hidden'); });
    };
  } else {
    sb.classList.add('hidden');
  }

  const tb = document.getElementById('overlayTitleBtn');
  if (showTitleBtn) {
    tb.classList.remove('hidden');
    tb.onclick = () => {
      ov.classList.add('hidden');
      goToTitle();
    };
  } else {
    tb.classList.add('hidden');
  }

  ov.classList.remove('hidden');
}

function showDeath() {
  showOverlay('💀 やられた…', 'トゲに触れてしまった。\nもう一度挑め。', 'もう一度', () => loadStage(state.stage));
}

function checkAndAwardTitles() {
  const stageIdx = state.stage;
  const elapsedSec = (Date.now() - state.stageStartTime) / 1000;
  const optimal = getOptimalMoves(stageIdx);
  const newly = [];

  function award(id) {
    if (!state.earnedTitles.includes(id)) {
      state.earnedTitles.push(id);
      newly.push(id);
    }
  }

  // 手数系（金は最短一致、銀は+2以内）— 金が取れれば銀も同時付与
  if (optimal !== null) {
    if (state.moves <= optimal) {
      award(`gold_${stageIdx}`);
      award(`silver_${stageIdx}`);
    } else if (state.moves <= optimal + 2) {
      award(`silver_${stageIdx}`);
    }
  }

  // タイム系
  const limit = STAGE_TIME_LIMITS[stageIdx];
  if (limit && elapsedSec <= limit) {
    award(`time_${stageIdx}`);
  }

  // アンドゥなし系
  if (!state.usedUndoThisStage) {
    award(`noundo_${stageIdx}`);
  }

  // 全クリア系
  const allCleared = STAGES.every((_, i) => state.clearedStages.includes(i) || i === stageIdx);
  if (allCleared) {
    award('all_clear');
  }

  state.newlyEarnedTitles = newly;
  return newly;
}

// ステージ idx をイントロカットシーン込みで開始する（必要ならプロローグも先に再生）
function startStageWithIntro(idx) {
  const ts = document.getElementById('titleScreen');
  ts.classList.add('fade-out');
  setTimeout(() => { ts.style.display = 'none'; }, 500);

  const beginStage = () => {
    const intro = STAGE_INTRO_SCENES[idx] || [];
    playScene(intro, () => {
      loadStage(idx);
      state.gameStarted = true;
    });
  };

  if (idx === 0 && !state.hasSeenPrologue) {
    state.hasSeenPrologue = true;
    saveProgress();
    playScene(PROLOGUE_SCENE, beginStage);
  } else {
    beginStage();
  }
}

function showVictory() {
  // コイン付与（初回クリアボーナス）
  const alreadyCleared = state.clearedStages.includes(state.stage);
  const coinReward = alreadyCleared ? 3 : 10;
  state.coins += coinReward;
  if (!alreadyCleared) state.clearedStages.push(state.stage);

  const newTitles = checkAndAwardTitles();
  saveProgress();
  updateCoinDisplay();

  const clearedStageIdx = state.stage;
  const next = clearedStageIdx + 1;
  let bonusText = alreadyCleared
    ? `\n🪙 +${coinReward} コイン獲得！`
    : `\n🪙 +${coinReward} コイン獲得！（初回ボーナス）`;

  if (newTitles.length > 0) {
    const titleNames = newTitles
      .map(id => TITLE_DEFS.find(t => t.id === id))
      .filter(Boolean)
      .map(t => `${t.icon} ${t.name}`);
    bonusText += `\n\n📜 称号獲得！\n` + titleNames.join('\n');

    if (isTitlesComplete() && !state.unlockedSkins.includes('cat')) {
      bonusText += `\n\n🐱✨ 全称号コンプリート！\n特別な「ねこ魔法使い」スキンが\nショップで受け取れます！`;
    }
  }

  // クリア後の短いアウトロ（初回クリア時のみ再生。周回時は省略してテンポを優先）
  const outro = (!alreadyCleared && STAGE_OUTRO_SCENES[clearedStageIdx]) || [];

  if (next < STAGES.length) {
    showOverlay(
      '✨ 脱出成功！',
      STAGES[next].icon + ' 次のステージ\n「' + STAGES[next].name + '」へ' + bonusText,
      '次へ進む',
      () => {
        playScene(outro, () => {
          const intro = STAGE_INTRO_SCENES[next] || [];
          playScene(intro, () => {
            loadStage(next);
            state.gameStarted = true;
          });
        });
      },
      true,
      true
    );
  } else {
    showOverlay(
      '🎉 全ステージ制覇！',
      'すべての魔法の牢獄から脱出した！\n君こそ真の重力の使い手だ。' + bonusText,
      'エピローグへ',
      () => {
        const playEpilogue = () => {
          state.hasSeenEpilogue = true;
          saveProgress();
          playScene(EPILOGUE_SCENE, () => {
            goToTitle();
          });
        };
        playScene(outro, playEpilogue);
      },
      true,
      true
    );
  }
}

// ================================================================
//  Particle system
// ================================================================
function spawnGravParticles(dir) {
  const d = DIRS[dir];
  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    state.particles.push({
      x: cx, y: cy,
      vx: d.dx * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2,
      vy: d.dy * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2,
      life: 1.0,
      decay: 0.04 + Math.random() * 0.04,
      size: 3 + Math.random() * 5,
      color: `hsl(${280 + Math.random() * 60}, 90%, 70%)`,
    });
  }
}

function spawnDeathParticles(x, y) {
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 5;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1.0, decay: 0.03, size: 4 + Math.random() * 6,
      color: `hsl(${Math.random() * 40}, 100%, 60%)`,
    });
  }
}

function updateParticles() {
  state.particles = state.particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    p.life -= p.decay;
    return p.life > 0;
  });
}

// ================================================================
//  Game loop
// ================================================================
function gameLoop() {
  requestAnimationFrame(gameLoop);

  if (state.gameStarted) {
    updateParticles();
    render();
  }

  const ts = document.getElementById('titleScreen');
  if (ts && !ts.classList.contains('fade-out') && ts.style.display !== 'none') {
    animateTitleParticles();
  }
}

// ================================================================
//  Input handling
// ================================================================
document.addEventListener('keydown', e => {
  if (!state.gameStarted) return;
  switch (e.key) {
    case 'ArrowDown':  case 's': case 'S': changeGravity('DOWN');  e.preventDefault(); break;
    case 'ArrowUp':    case 'w': case 'W': changeGravity('UP');    e.preventDefault(); break;
    case 'ArrowLeft':  case 'a': case 'A': changeGravity('LEFT');  e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': changeGravity('RIGHT'); e.preventDefault(); break;
    case 'r': case 'R': loadStage(state.stage); break;
    case 'z': case 'Z': undoMove(); break;
  }
});

// Touch/swipe support
let touchStart = null;
document.getElementById('gameCanvas').addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.getElementById('gameCanvas').addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (Math.max(adx, ady) < 20) return;
  if (adx > ady) changeGravity(dx > 0 ? 'RIGHT' : 'LEFT');
  else           changeGravity(dy > 0 ? 'DOWN'  : 'UP');
  touchStart = null;
}, { passive: true });

// 画面上の十字パッド（タップ操作）
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    changeGravity(btn.dataset.dir);
  });
});

// アンドゥ・リセットのタップボタン
document.getElementById('undoBtn').addEventListener('click', () => undoMove());
document.getElementById('resetBtn').addEventListener('click', () => loadStage(state.stage));

// ================================================================
//  Start
// ================================================================
initTitleParticles();
loadProgress().then(() => renderStageSelect());
gameLoop();

function goToTitle() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('storyScreen').classList.add('hidden');
  const ts = document.getElementById('titleScreen');
  ts.style.display = '';
  ts.classList.remove('fade-out');
  ts.style.opacity = '';
  state.gameStarted = false;
  renderStageSelect();
}

function renderStageSelect() {
  const panel = document.getElementById('continuePanel');
  const grid = document.getElementById('stageSelectGrid');
  const maxReached = state.clearedStages.length > 0
    ? Math.max(...state.clearedStages) + 1
    : 0; // 最大到達ステージインデックス（次のステージ）

  if (maxReached === 0) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  grid.innerHTML = '';

  STAGES.forEach((s, i) => {
    const unlocked = i <= maxReached;
    const cleared = state.clearedStages.includes(i);
    const btn = document.createElement('button');
    btn.className = 'stage-select-btn' + (cleared ? ' cleared' : '') + (!unlocked ? ' locked' : '');
    btn.innerHTML = `<span class="ss-icon">${s.icon}</span><span class="ss-name">${s.subtitle}</span>${cleared ? '<span class="ss-check">✓</span>' : ''}`;
    btn.disabled = !unlocked;
    if (unlocked) {
      btn.onclick = () => startStageWithIntro(i);
    }
    grid.appendChild(btn);
  });
}

document.getElementById('startBtn').addEventListener('click', () => {
  startStageWithIntro(0);
});

document.getElementById('shopBtn').addEventListener('click', openShop);
document.getElementById('shopCloseBtn').addEventListener('click', closeShop);
document.getElementById('titleBtn').addEventListener('click', goToTitle);

// ================================================================
//  称号図鑑 (Title Codex) UI
// ================================================================
const TIER_LABELS = {
  gold: '金', silver: '銀', time: '俊足', bronze: '銅', special: '特別',
};

function openCodex() {
  document.getElementById('codexScreen').classList.remove('hidden');
  renderCodex();
}

function closeCodex() {
  document.getElementById('codexScreen').classList.add('hidden');
}

function renderCodex() {
  const grid = document.getElementById('codexGrid');
  grid.innerHTML = '';

  const earnedCount = state.earnedTitles.length;
  document.getElementById('codexProgress').textContent =
    `獲得済み: ${earnedCount} / ${TITLE_DEFS.length}`;

  const rewardEl = document.getElementById('codexReward');
  if (rewardEl) {
    rewardEl.textContent = isTitlesComplete()
      ? '🐱✨ 全称号コンプリート！ショップで「ねこ魔法使い」を受け取れます'
      : '🐱 すべての称号を集めると、特別な「ねこ魔法使い」スキンが解放されます';
    rewardEl.classList.toggle('reward-complete', isTitlesComplete());
  }

  TITLE_DEFS.forEach(t => {
    const earned = state.earnedTitles.includes(t.id);
    const card = document.createElement('div');
    card.className = 'title-card tier-' + t.tier + (earned ? ' earned' : ' locked');

    card.innerHTML = `
      <div class="title-icon">${earned ? t.icon : '❔'}</div>
      <div class="title-tier-label">${TIER_LABELS[t.tier]}</div>
      <div class="title-name">${earned ? t.name : '？？？'}</div>
      <div class="title-desc">${t.desc}</div>
    `;
    grid.appendChild(card);
  });
}

window.addEventListener('resize', () => {
  if (state.gameStarted) fitCanvas();
});

document.getElementById('codexBtn').addEventListener('click', openCodex);
document.getElementById('codexCloseBtn').addEventListener('click', closeCodex);