// ================================================================
//  levels.js — タイル定義・ステージデータ
//  依存: なし（他ファイルから参照される）
// ================================================================

// ── Tile types ──
const T = {
  EMPTY: 0, WALL: 1, PLAYER: 2, BOX: 3,
  KEY: 4,   DOOR: 5, SPIKE: 6,  ICE: 7,
  GOAL: 8,  DARK_WALL: 9, MUSHROOM: 10,
};

// ── Gravity directions ──
const DIRS = {
  DOWN:  { dx: 0,  dy: 1,  arrow: '↓', rot: 0   },
  UP:    { dx: 0,  dy: -1, arrow: '↑', rot: 180 },
  LEFT:  { dx: -1, dy: 0,  arrow: '←', rot: 90  },
  RIGHT: { dx: 1,  dy: 0,  arrow: '→', rot: 270 },
};

// ── Stage definitions (グリム童話5ステージ) ──
// Legend: 0=空, 1=壁, 2=プレイヤー, 3=木箱, 4=鍵, 5=扉, 6=トゲ, 7=氷床, 8=ゴール, 9=魔法の壁, 10=キノコ
const STAGES = [
  // ─── Stage 1: 赤ずきんの森 ───
  {
    name: '赤ずきんの森',
    subtitle: 'Chapter 1',
    story: '魔女に囚われた赤ずきん。\n重力を操り、鍵を拾って扉を開けろ。',
    palette: { bg: '#0d1a0d', wall: '#2d5a1b', dark: '#1a3d0e', accent: '#7fff4f', glow: '#4ade80' },
    icon: '🐺',
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,1,0,1],
      [1,0,2,0,0,0,4,0,1,0,1,1],
      [1,0,1,0,1,0,1,0,1,0,0,1],
      [1,0,0,0,1,0,1,0,0,5,0,1],
      [1,0,1,0,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    doorTarget: { x: 9, y: 5 },
  },
  // ─── Stage 2: ラプンツェルの塔 ───
  {
    name: 'ラプンツェルの塔',
    subtitle: 'Chapter 2',
    story: '高い塔に閉じ込められた。\n重力を反転させ、上を目指せ。',
    palette: { bg: '#0d0a1a', wall: '#4a2f7a', dark: '#2d1654', accent: '#d946ef', glow: '#e879f9' },
    icon: '🏰',
    grid: [
      [1,1,1,1,1,1,1,1,1,1],
      [1,8,0,0,0,0,0,0,0,1],
      [1,0,0,1,1,0,0,0,0,1],
      [1,0,0,1,0,0,4,0,0,1],
      [1,0,0,0,0,0,1,1,0,1],
      [1,0,3,0,0,0,0,0,0,1],
      [1,1,1,1,0,0,0,0,0,1],
      [1,0,0,0,0,1,1,1,0,1],
      [1,0,2,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1],
    ],
    doorTarget: null,
  },
  // ─── Stage 3: ヘンゼルとグレーテルの菓子の家 ───
  {
    name: '菓子の家の迷宮',
    subtitle: 'Chapter 3',
    story: '魔女の菓子の家は\n滑る氷の床に変わった。\n重力の向きを使い分けて脱出せよ。',
    palette: { bg: '#1a0a0a', wall: '#7a2020', dark: '#4a1010', accent: '#fb923c', glow: '#fbbf24' },
    icon: '🍬',
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,8,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,7,7,7,0,0,0,0,0,1],
      [1,0,0,4,0,0,0,1,0,0,0,1],
      [1,0,1,0,0,0,0,1,0,0,0,1],
      [1,0,0,0,0,7,7,1,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,1],
      [1,6,6,0,0,0,0,0,0,6,6,1],
      [1,1,1,0,1,1,1,1,0,1,1,1],
      [1,0,1,0,0,2,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    doorTarget: null,
  },
  // ─── Stage 4: シンデレラの牢獄 ───
  {
    name: 'シンデレラの牢獄',
    subtitle: 'Chapter 4',
    story: '複数の箱が道を塞いでいる。\n正しい順番で重力を操れ。',
    palette: { bg: '#0a0d1a', wall: '#1e3a5f', dark: '#0f2040', accent: '#60a5fa', glow: '#93c5fd' },
    icon: '👠',
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,2,0,3,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,0,0,4,0,0,0,1],
      [1,0,0,0,0,0,0,1,1,1,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,3,0,0,1,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,3,0,1],
      [1,0,0,0,0,0,0,0,5,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    doorTarget: { x: 8, y: 8 },
  },
  // ─── Stage 5: 雪の女王の宮殿 ───
  {
    name: '雪の女王の宮殿',
    subtitle: 'Final Chapter',
    story: '最後の試練。\n氷と重力、すべての力を解き放て。\n自由を掴め！',
    palette: { bg: '#05101a', wall: '#1e4a6a', dark: '#0a2a40', accent: '#7dd3fc', glow: '#bae6fd' },
    icon: '❄️',
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,8,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,7,7,0,0,0,0,1,0,0,0,1],
      [1,0,1,1,0,0,0,0,0,1,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,4,0,1],
      [1,0,0,0,0,0,0,3,0,0,0,0,0,1],
      [1,1,1,0,0,1,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,0,3,0,1],
      [1,6,6,0,0,0,0,0,0,0,6,6,0,1],
      [1,1,1,1,0,1,1,1,0,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,2,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    doorTarget: null,
  },
];

// ================================================================
//  テストプレイ用ステージのルックアップ
//  （STAGES配列自体を汚染すると「全クリア」判定やエピローグ等が
//   壊れるため、専用のインデックス+ヘルパー経由で参照する）
// ================================================================
const TEST_STAGE_INDEX = STAGES.length;
function getStageData(idx) {
  if (idx === TEST_STAGE_INDEX) {
    return (typeof CUSTOM_STAGE_DATA !== 'undefined') ? CUSTOM_STAGE_DATA : null;
  }
  return STAGES[idx];
}

// ================================================================
//  称号システム — 各ステージの最短手数(BFS)・タイムリミット設定
// ================================================================

// ステージごとの「金称号」獲得に必要なタイム制限（秒）
const STAGE_TIME_LIMITS = [20, 25, 35, 30, 40];

// BFSで最短重力切替回数を求める（称号判定の基準値として使用）
// stageData には { grid, doorTarget } を持つオブジェクトを渡す
// （STAGES[i] だけでなく、エディタで作成したカスタムステージにも使えるようにする）
function computeOptimalMovesForData(stageData) {
  const s = stageData;
  const startGrid = s.grid.map(r => [...r]);
  const rows = startGrid.length, cols = startGrid[0].length;

  function gridKey(grid, grav, hasKey) {
    return grid.map(r => r.join('')).join('|') + '_' + grav + '_' + (hasKey ? 1 : 0);
  }

  function findAllLocal(grid, type) {
    const res = [];
    for (let y = 0; y < grid.length; y++)
      for (let x = 0; x < grid[y].length; x++)
        if (grid[y][x] === type) res.push({ x, y });
    return res;
  }
  function findOneLocal(grid, type) { return findAllLocal(grid, type)[0] || null; }

  function applyGravityLocal(grid, grav, hasKeyIn) {
    const dir = DIRS[grav];
    let hasKey = hasKeyIn;
    let won = false, dead = false;
    let moved = true, iterations = 0;
    while (moved && iterations < 200) {
      moved = false;
      iterations++;
      const moveables = findAllLocal(grid, T.PLAYER).concat(findAllLocal(grid, T.BOX));
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
        // 氷(T.ICE)は乗れる床（すり抜け不可）— 本編の物理と同一仕様
        const canFall = (below === T.EMPTY)
          || (below === T.KEY && type === T.PLAYER)
          || (below === T.GOAL && type === T.PLAYER && hasKey);
        if (canFall) {
          if (below === T.KEY && type === T.PLAYER) hasKey = true;
          grid[ny][nx] = type;
          grid[pos.y][pos.x] = T.EMPTY;
          moved = true;
        }
        if (below === T.SPIKE && type === T.PLAYER) dead = true;
        if (below === T.DOOR && type === T.PLAYER && hasKey) {
          grid[ny][nx] = T.PLAYER;
          grid[pos.y][pos.x] = T.EMPTY;
          won = true;
          moved = true;
        }
        if (below === T.GOAL && type === T.PLAYER && hasKey) won = true;
      }
    }
    return { grid, hasKey, won, dead };
  }

  // 現在プレイヤーの足元にある氷タイル（本編の standingIce と同じ概念）
  function standingIceLocal(grid, grav) {
    const p = findOneLocal(grid, T.PLAYER);
    if (!p) return null;
    const dir = DIRS[grav];
    const x = p.x + dir.dx, y = p.y + dir.dy;
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return null;
    return grid[y][x] === T.ICE ? { x, y } : null;
  }

  // 1手（重力変更）を本編と同じ順序で完全にシミュレートする:
  // 落下 → 乗っていた氷から離れていたら破壊 → 再落下
  function simulateMove(grid, newGrav, hasKeyIn, prevIce) {
    let result = applyGravityLocal(grid, newGrav, hasKeyIn);
    if (result.dead) return result;
    if (prevIce && result.grid[prevIce.y] && result.grid[prevIce.y][prevIce.x] === T.ICE) {
      const p = findOneLocal(result.grid, T.PLAYER);
      const dir = DIRS[newGrav];
      const stillOn = p && (p.x + dir.dx === prevIce.x) && (p.y + dir.dy === prevIce.y);
      if (!stillOn) {
        result.grid[prevIce.y][prevIce.x] = T.EMPTY;
        const again = applyGravityLocal(result.grid, newGrav, result.hasKey);
        again.won = again.won || result.won;
        result = again;
      }
    }
    return result;
  }

  function checkGoalLocal(grid, hasKey) {
    const p = findOneLocal(grid, T.PLAYER);
    if (!p) return false;
    if (s.doorTarget) return p.x === s.doorTarget.x && p.y === s.doorTarget.y;
    return grid[p.y][p.x] === T.GOAL && hasKey;
  }

  // BFS over (grid-state, gravity, hasKey)
  const startState = { grid: startGrid, grav: 'DOWN', hasKey: false };
  const startKey = gridKey(startState.grid, startState.grav, startState.hasKey);
  const visited = new Set([startKey]);
  let queue = [{ ...startState, depth: 0 }];
  const dirs = ['DOWN', 'UP', 'LEFT', 'RIGHT'];

  // 初期状態自体がクリア済みかチェック
  if (checkGoalLocal(startState.grid, startState.hasKey)) return 0;

  let head = 0;
  const MAX_NODES = 60000;
  let nodesVisited = 0;

  while (head < queue.length && nodesVisited < MAX_NODES) {
    const cur = queue[head++];
    nodesVisited++;
    const prevIce = standingIceLocal(cur.grid, cur.grav);
    for (const d of dirs) {
      if (d === cur.grav) continue; // 同方向への切替は無意味
      const gridCopy = cur.grid.map(r => [...r]);
      const result = simulateMove(gridCopy, d, cur.hasKey, prevIce);
      if (result.dead) continue;
      const newDepth = cur.depth + 1;
      if (result.won || checkGoalLocal(result.grid, result.hasKey)) {
        return newDepth;
      }
      const key = gridKey(result.grid, d, result.hasKey);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ grid: result.grid, grav: d, hasKey: result.hasKey, depth: newDepth });
      }
    }
  }
  return null; // 計算不能/到達不可
}

// 従来どおり STAGES[idx] を対象に計算する版（後方互換のためのラッパー）
function computeOptimalMoves(stageIdx) {
  return computeOptimalMovesForData(STAGES[stageIdx]);
}

// 各ステージの最短手数キャッシュ（遅延計算）
const _optimalMovesCache = {};

// カスタムステージ（エディタのテストプレイ・オンラインプレイ）用の
// 最短手数キャッシュ。グリッド内容が変わるたびに再計算する。
let _customOptimalCache = { key: null, value: null };

function getOptimalMoves(stageIdx) {
  if (stageIdx === TEST_STAGE_INDEX) {
    const data = getStageData(stageIdx);
    if (!data) return null;
    const key = JSON.stringify(data.grid) + '|' + JSON.stringify(data.doorTarget || null);
    if (_customOptimalCache.key !== key) {
      _customOptimalCache = { key, value: computeOptimalMovesForData(data) };
    }
    return _customOptimalCache.value;
  }
  if (!(stageIdx in _optimalMovesCache)) {
    _optimalMovesCache[stageIdx] = computeOptimalMoves(stageIdx);
  }
  return _optimalMovesCache[stageIdx];
}