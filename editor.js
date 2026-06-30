// ================================================================
//  editor.js — ステージエディタのロジック
//  依存: levels.js, logic.js, renderer.js
// ================================================================

let editGrid = [];
let selectedTile = T.WALL;
let currentThemeIdx = 0;
let isDrawing = false;
let CUSTOM_STAGE_DATA = null;

// エディタ用のT_INFO（キノコも追加）
const EDITOR_T_INFO = {
  [T.EMPTY]:     { name: '消しゴム', icon: '⬜', desc: '配置したオブジェクトを消去します' },
  [T.WALL]:      { name: '通常壁',   icon: '🧱', desc: 'プレイヤーや木箱を遮る絶対的な壁' },
  [T.DARK_WALL]: { name: '魔法壁',   icon: '🔮', desc: 'テーマごとの魔法の装飾壁' },
  [T.PLAYER]:    { name: '始点',     icon: '🚶', desc: 'プレイヤーの開始位置（1つのみ）' },
  [T.BOX]:       { name: '木箱',     icon: '📦', desc: '重力で落下する。足場やトゲ避けに' },
  [T.KEY]:       { name: '鍵',       icon: '🔑', desc: '扉を開けたり、星を取るのに必要' },
  [T.DOOR]:      { name: '扉',       icon: '🚪', desc: '鍵を持っていると開く脱出用ゴール' },
  [T.SPIKE]:     { name: 'トゲ',     icon: '🔺', desc: 'プレイヤーが触れると即ゲームオーバー' },
  [T.ICE]:       { name: '氷の床',   icon: '🧊', desc: '重力がかかると上を滑る床' },
  [T.GOAL]:      { name: 'ゴール',   icon: '⭐', desc: '鍵を持った状態で触れるとステージクリア' },
  [T.MUSHROOM]:  { name: 'キノコ',   icon: '🍄', desc: 'プレイヤーが触れて乗ることができる床' },
};

// エディタ初期化
function initEditor() {
  buildPaletteUI();
  setupInitialGrid(12, 9);
  
  // イベントリスナーのセットアップ
  const cv = document.getElementById('gameCanvas');
  cv.removeEventListener('mousedown', startDraw);
  cv.removeEventListener('mousemove', doDraw);
  cv.addEventListener('mousedown', startDraw);
  cv.addEventListener('mousemove', doDraw);
  
  window.removeEventListener('mouseup', endDraw);
  window.addEventListener('mouseup', endDraw);
  
  // タッチ対応
  cv.addEventListener('touchstart', (e) => { startDraw(e.touches[0]); }, {passive:false});
  cv.addEventListener('touchmove', (e) => { doDraw(e.touches[0]); e.preventDefault(); }, {passive:false});
  cv.addEventListener('touchend', endDraw);

  // UI要素のイベント登録
  document.getElementById('inputCols').onchange = resizeGrid;
  document.getElementById('inputRows').onchange = resizeGrid;
  document.getElementById('selectTheme').onchange = changeTheme;
  document.getElementById('exportBtn').onclick = exportStage;
  document.getElementById('importBtn').onclick = importStage;
  document.getElementById('testPlayBtn').onclick = startTestPlay;
  document.getElementById('editorCloseBtn').onclick = closeEditorAndReturnTitle;
  document.getElementById('editPanelToggleBtn').onclick = toggleEditPanel;
  
  // テストプレイHUDの「エディットに戻る」ボタン
  document.getElementById('exitTestBtn').onclick = stopTestPlay;

  // ステージ作成中は移動用のタッチコントロールは不要なので隠す
  document.getElementById('touchControls').classList.add('hidden');

  // パネルを開いた状態で表示
  document.getElementById('editPanel').classList.remove('hidden');
  document.getElementById('editPanelToggleBtn').classList.remove('hidden');
  document.getElementById('editPanelToggleBtn').classList.add('panel-open');
}

// エディタの左パネルを開閉する（編集モードのまま、キャンバスを広く使いたい時用）
function toggleEditPanel() {
  const panel = document.getElementById('editPanel');
  const toggleBtn = document.getElementById('editPanelToggleBtn');
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !willOpen);
  toggleBtn.classList.toggle('panel-open', willOpen);
  toggleBtn.textContent = willOpen ? '☰' : '✕';
  if (state.isEditorMode && !state.isTestPlay) {
    fitCanvasForEditor();
  }
}

function buildPaletteUI() {
  const paletteDiv = document.getElementById('palette');
  paletteDiv.innerHTML = '';
  for (const [typeStr, info] of Object.entries(EDITOR_T_INFO)) {
    const type = parseInt(typeStr);
    const btn = document.createElement('button');
    btn.className = `palette-btn ${type === selectedTile ? 'active' : ''}`;
    btn.id = `palette-t-${type}`;
    btn.innerHTML = `${info.icon}<span>${info.name}</span>`;
    btn.setAttribute('data-tooltip', `${info.name}: ${info.desc}`);
    btn.onclick = () => selectPalette(type);
    paletteDiv.appendChild(btn);
  }
}

function selectPalette(type) {
  selectedTile = type;
  document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById(`palette-t-${type}`);
  if (target) target.classList.add('active');
}

function setupInitialGrid(c, r) {
  document.getElementById('inputCols').value = c;
  document.getElementById('inputRows').value = r;
  editGrid = [];
  for (let y = 0; y < r; y++) {
    const row = [];
    for (let x = 0; x < c; x++) {
      if (x === 0 || x === c - 1 || y === 0 || y === r - 1) row.push(T.WALL);
      else row.push(T.EMPTY);
    }
    editGrid.push(row);
  }
  fitCanvasForEditor();
}

function resizeGrid() {
  if (!state.isEditorMode) return;
  const newCols = parseInt(document.getElementById('inputCols').value) || 10;
  const newRows = parseInt(document.getElementById('inputRows').value) || 8;
  
  const newGrid = [];
  for (let y = 0; y < newRows; y++) {
    const row = [];
    for (let x = 0; x < newCols; x++) {
      if (editGrid[y] && editGrid[y][x] !== undefined) {
        if (x === 0 || x === newCols - 1 || y === 0 || y === newRows - 1) {
          row.push(T.WALL);
        } else {
          row.push(editGrid[y][x]);
        }
      } else {
        if (x === 0 || x === newCols - 1 || y === 0 || y === newRows - 1) row.push(T.WALL);
        else row.push(T.EMPTY);
      }
    }
    newGrid.push(row);
  }
  editGrid = newGrid;
  fitCanvasForEditor();
}

function changeTheme() {
  currentThemeIdx = parseInt(document.getElementById('selectTheme').value);
  state.stage = currentThemeIdx;
}

function fitCanvasForEditor() {
  const cols = editGrid[0].length;
  const rows = editGrid.length;
  const panel = document.getElementById('editPanel');
  const panelOpen = !panel.classList.contains('hidden');
  const sideWidth = panelOpen ? panel.getBoundingClientRect().width : 0;
  const maxW = window.innerWidth - sideWidth - 40; // パネル幅 + 余白
  const maxH = window.innerHeight - 80;
  const cellW = Math.floor(maxW / cols);
  const cellH = Math.floor(maxH / rows);
  state.cellSize = Math.max(24, Math.min(56, Math.min(cellW, cellH)));
  
  const w = cols * state.cellSize;
  const h = rows * state.cellSize;
  
  canvas.width = w;
  canvas.height = h;
  
  state.cols = cols;
  state.rows = rows;
  
  // 中央寄せ（パネルが開いている場合はその右側領域で）
  const leftOffset = sideWidth + 20 + Math.floor((maxW - w) / 2);
  const topOffset = Math.floor((window.innerHeight - h) / 2);
  
  canvas.style.left = leftOffset + 'px';
  canvas.style.top = topOffset + 'px';
  canvas.style.position = 'fixed';
}

function getGridCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX;
  const clientY = e.clientY;
  const x = Math.floor((clientX - rect.left) / state.cellSize);
  const y = Math.floor((clientY - rect.top) / state.cellSize);
  return { x, y };
}

function startDraw(e) {
  if (!state.isEditorMode || state.isTestPlay) return;
  isDrawing = true;
  doDraw(e);
}

function doDraw(e) {
  if (!isDrawing || !state.isEditorMode || state.isTestPlay) return;
  const pos = getGridCoords(e);
  const cols = editGrid[0].length;
  const rows = editGrid.length;
  
  if (pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows) {
    // 最外周の壁は変更不可
    if (pos.x === 0 || pos.x === cols - 1 || pos.y === 0 || pos.y === rows - 1) {
      return; 
    }

    if (selectedTile === T.PLAYER) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (editGrid[y][x] === T.PLAYER) editGrid[y][x] = T.EMPTY;
        }
      }
    }
    editGrid[pos.y][pos.x] = selectedTile;
  }
}

function endDraw() { isDrawing = false; }

// エディタ終了、タイトルへ
function closeEditorAndReturnTitle() {
  state.isEditorMode = false;
  state.isTestPlay = false;
  document.getElementById('editPanel').classList.add('hidden');
  document.getElementById('editPanelToggleBtn').classList.add('hidden');
  document.getElementById('touchControls').classList.remove('hidden');
  goToTitle();
}

// テストプレイ開始
function startTestPlay() {
  const players = findAll(editGrid, T.PLAYER);
  const goals = findAll(editGrid, T.GOAL);
  const doors = findAll(editGrid, T.DOOR);
  
  if (players.length === 0) {
    showOverlay('⚠️ プレイ不可', 'ステージ内に「始点(🚶)」を1つ配置してください。', '閉じる', () => {});
    return;
  }
  if (goals.length === 0 && doors.length === 0) {
    showOverlay('⚠️ プレイ不可', '「ゴール(⭐)」または「扉(🚪)」を配置してください。', '閉じる', () => {});
    return;
  }
  
  // UI切り替え
  document.getElementById('editPanel').classList.add('hidden');
  document.getElementById('editPanelToggleBtn').classList.add('hidden');
  document.getElementById('exitTestBtn').classList.remove('hidden');
  document.getElementById('titleBtn').classList.add('hidden');
  document.getElementById('touchControls').classList.remove('hidden');
  
  state.isTestPlay = true;
  state.gameStarted = true;
  
  // テストプレイ用の仮ステージ情報を初期化
  const theme = THEMES_INTEGRATED[currentThemeIdx];
  
  state.grid = deepCopy(editGrid);
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
  
  const p = findOne(state.grid, T.PLAYER);
  state.playerPos = { x: p.x, y: p.y };
  
  // STAGES[5] (カスタムステージ用) として定義して state.stage を 5 にする
  CUSTOM_STAGE_DATA = {
    name: 'テストステージ',
    subtitle: 'Custom Stage',
    icon: '🧪',
    palette: theme.palette,
    grid: editGrid,
    doorTarget: (doors.length > 0) ? doors[0] : null
  };
  
  STAGES[5] = CUSTOM_STAGE_DATA;
  state.stage = 5;
  
  fitCanvas(); // logic.jsのfitCanvasを実行
  updateHUD();
  updateGravArrow(true);
}

// テストプレイ終了、エディタに戻る
function stopTestPlay() {
  state.isTestPlay = false;
  state.gameStarted = false;
  
  document.getElementById('exitTestBtn').classList.add('hidden');
  document.getElementById('titleBtn').classList.remove('hidden');
  document.getElementById('editPanel').classList.remove('hidden');
  document.getElementById('editPanelToggleBtn').classList.remove('hidden');
  document.getElementById('editPanelToggleBtn').classList.add('panel-open');
  document.getElementById('editPanelToggleBtn').textContent = '✕';
  document.getElementById('touchControls').classList.add('hidden');
  
  // エディタ用のキャンバスサイズ・位置に再フィット
  state.isEditorMode = true;
  state.stage = currentThemeIdx; // 元のテーマインデックスに戻す
  fitCanvasForEditor();
}

// エクスポート
function exportStage() {
  const stageData = {
    theme: currentThemeIdx,
    grid: editGrid
  };
  const jsonStr = JSON.stringify(stageData);
  const code = btoa(unescape(encodeURIComponent(jsonStr)));
  
  const tx = document.getElementById('importCode');
  tx.value = code;
  tx.select();
  navigator.clipboard.writeText(code).then(() => {
    showOverlay('📋 コピー完了', 'ステージコードをクリップボードにコピーしました。', 'OK', () => {});
  });
}

// インポート
function importStage() {
  const code = document.getElementById('importCode').value.trim();
  if (!code) return;
  try {
    const jsonStr = decodeURIComponent(escape(atob(code)));
    const stageData = JSON.parse(jsonStr);
    
    if (stageData.theme !== undefined && Array.isArray(stageData.grid)) {
      currentThemeIdx = stageData.theme;
      document.getElementById('selectTheme').value = currentThemeIdx;
      editGrid = stageData.grid;
      
      const c = editGrid[0].length;
      const r = editGrid.length;
      document.getElementById('inputCols').value = c;
      document.getElementById('inputRows').value = r;
      
      fitCanvasForEditor();
      showOverlay('✨ 読み込み成功', 'ステージデータを復元しました！', '閉じる', () => {});
    } else {
      throw new Error();
    }
  } catch (e) {
    showOverlay('❌ エラー', '正しいステージコードではありません。', '確認', () => {});
  }
}

// THEMES の定義
const THEMES_INTEGRATED = [
  { name: '赤ずきんの森', palette: { bg: '#0d1a0d', wall: '#2d5a1b', dark: '#1a3d0e', accent: '#7fff4f', glow: '#4ade80' } },
  { name: 'ラプンツェルの塔', palette: { bg: '#0d0a1a', wall: '#4a2f7a', dark: '#2d1654', accent: '#d946ef', glow: '#e879f9' } },
  { name: '菓子の家', palette: { bg: '#1a0a0a', wall: '#7a2020', dark: '#4a1010', accent: '#fb923c', glow: '#fbbf24' } },
  { name: 'シンデレラ牢獄', palette: { bg: '#0a0d1a', wall: '#1e3a5f', dark: '#0f2040', accent: '#60a5fa', glow: '#93c5fd' } },
  { name: '雪の女王宮殿', palette: { bg: '#05101a', wall: '#1e4a6a', dark: '#0a2a40', accent: '#7dd3fc', glow: '#bae6fd' } }
];