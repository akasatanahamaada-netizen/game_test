// ================================================================
//  editor.js — ステージエディタのロジック
//  依存: levels.js, logic.js, renderer.js
// ================================================================

let editGrid = [];
let selectedTile = T.WALL;
let currentThemeIdx = 0;
let isDrawing = false;
let CUSTOM_STAGE_DATA = null;

// ── ズーム関連の状態 ──
let editorZoomCellSize = null; // null = 自動フィット、数値 = ユーザーが指定した拡大率(px/セル)
let pinchStartDist = null;
let pinchStartCellSize = null;
const EDITOR_ZOOM_MIN = 14;
const EDITOR_ZOOM_MAX = 110;

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
  [T.ICE]:       { name: '氷の床',   icon: '🧊', desc: '乗れる床。ただし一度乗って離れると砕けて消える' },
  [T.GOAL]:      { name: 'ゴール',   icon: '⭐', desc: '鍵を持った状態で触れるとステージクリア' },
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
  
  // タッチ対応（1本指で描画、2本指でピンチズーム）
  cv.addEventListener('touchstart', handleEditorTouchStart, {passive:false});
  cv.addEventListener('touchmove', handleEditorTouchMove, {passive:false});
  cv.addEventListener('touchend', handleEditorTouchEnd);
  cv.addEventListener('touchcancel', handleEditorTouchEnd);

  // PC: マウスホイールでズーム
  cv.removeEventListener('wheel', handleEditorWheelZoom);
  cv.addEventListener('wheel', handleEditorWheelZoom, {passive:false});

  // UI要素のイベント登録
  document.getElementById('inputCols').onchange = resizeGrid;
  document.getElementById('inputRows').onchange = resizeGrid;
  document.getElementById('selectTheme').onchange = changeTheme;
  document.getElementById('exportBtn').onclick = exportStage;
  document.getElementById('importBtn').onclick = importStage;
  document.getElementById('testPlayBtn').onclick = startTestPlay;
  document.getElementById('editorCloseBtn').onclick = closeEditorAndReturnTitle;
  document.getElementById('editPanelToggleBtn').onclick = toggleEditPanel;
  document.getElementById('saveMyStageBtn').onclick = saveMyStage;
  renderMyStagesList();
  
  // テストプレイHUDの「エディットに戻る」ボタン
  document.getElementById('exitTestBtn').onclick = stopTestPlay;

  // ステージ作成中は移動用のタッチコントロールは不要なので隠す
  document.getElementById('touchControls').classList.add('hidden');

  // パネルを開いた状態で表示
  document.getElementById('editPanel').classList.remove('hidden');
  document.getElementById('editPanelToggleBtn').classList.remove('hidden');
  document.getElementById('editPanelToggleBtn').classList.add('panel-open');
  document.getElementById('editPanelToggleBtn').textContent = '✕';
}

// エディタの左パネルを開閉する（編集モードのまま、キャンバスを広く使いたい時用）
function toggleEditPanel() {
  const panel = document.getElementById('editPanel');
  const toggleBtn = document.getElementById('editPanelToggleBtn');
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !willOpen);
  toggleBtn.classList.toggle('panel-open', willOpen);
  toggleBtn.textContent = willOpen ? '✕' : '☰';
  if (state.isEditorMode && !state.isTestPlay) {
    refreshEditorCanvas();
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
  editorZoomCellSize = null;
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
  editorZoomCellSize = null;
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

// 画面サイズ・パネル開閉状態に応じて自動フィットするか、
// ユーザー指定のズーム(editorZoomCellSize)を使うかをまとめて反映する
function refreshEditorCanvas() {
  if (editorZoomCellSize !== null) {
    applyEditorZoom(editorZoomCellSize, true);
  } else {
    fitCanvasForEditor();
  }
}

// 指定したセルサイズ(px)でキャンバスを再配置する（ズーム用）
function applyEditorZoom(cellSize, keepCentered) {
  const cols = editGrid[0].length;
  const rows = editGrid.length;
  const clamped = Math.max(EDITOR_ZOOM_MIN, Math.min(EDITOR_ZOOM_MAX, cellSize));
  editorZoomCellSize = clamped;
  state.cellSize = clamped;

  const w = cols * clamped;
  const h = rows * clamped;
  canvas.width = w;
  canvas.height = h;
  state.cols = cols;
  state.rows = rows;

  const panel = document.getElementById('editPanel');
  const panelOpen = !panel.classList.contains('hidden');
  const sideWidth = panelOpen ? panel.getBoundingClientRect().width : 0;
  const availW = window.innerWidth - sideWidth - 40;
  const availH = window.innerHeight - 80;

  const leftOffset = sideWidth + 20 + Math.max(0, Math.floor((availW - w) / 2));
  const topOffset = Math.max(40, Math.floor((window.innerHeight - h) / 2));

  canvas.style.left = leftOffset + 'px';
  canvas.style.top = topOffset + 'px';
  canvas.style.position = 'fixed';
}

// ── 2本指ピンチでズーム（モバイル） ──
function getTouchDist(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handleEditorTouchStart(e) {
  if (!state.isEditorMode || state.isTestPlay) return;
  if (e.touches.length === 2) {
    e.preventDefault();
    isDrawing = false;
    pinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
    pinchStartCellSize = state.cellSize;
  } else if (e.touches.length === 1) {
    startDraw(e.touches[0]);
  }
}

function handleEditorTouchMove(e) {
  if (!state.isEditorMode || state.isTestPlay) return;
  if (e.touches.length === 2 && pinchStartDist) {
    e.preventDefault();
    const dist = getTouchDist(e.touches[0], e.touches[1]);
    const scale = dist / pinchStartDist;
    applyEditorZoom(pinchStartCellSize * scale);
  } else if (e.touches.length === 1) {
    e.preventDefault();
    doDraw(e.touches[0]);
  }
}

function handleEditorTouchEnd(e) {
  if (e.touches.length < 2) pinchStartDist = null;
  if (e.touches.length === 0) endDraw();
}

// ── マウスホイールでズーム（PC） ──
function handleEditorWheelZoom(e) {
  if (!state.isEditorMode || state.isTestPlay) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
  applyEditorZoom((editorZoomCellSize !== null ? editorZoomCellSize : state.cellSize) * factor);
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
  const etb = document.getElementById('exitTestBtn');
  etb.textContent = '🛠️ エディットに戻る';
  etb.onclick = stopTestPlay;
  etb.classList.remove('hidden');
  document.getElementById('titleBtn').classList.add('hidden');
  document.getElementById('touchControls').classList.remove('hidden');

  state.isTestPlay = true;
  state.isOnlinePlay = false;
  state.gameStarted = true;
  
  // テストプレイ用の仮ステージ情報を初期化
  const theme = THEMES_INTEGRATED[currentThemeIdx];
  
  state.grid = sanitizeGrid(deepCopy(editGrid));
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
  state.standingIce = getStandingIce();
  
  // CUSTOM_STAGE_DATA に保持し、STAGES配列自体は汚染しない
  // （汚染すると「全クリア」判定やエピローグ演出が壊れるため）
  CUSTOM_STAGE_DATA = {
    name: 'テストステージ',
    subtitle: 'Custom Stage',
    icon: '🧪',
    palette: theme.palette,
    grid: editGrid,
    doorTarget: (doors.length > 0) ? doors[0] : null
  };
  
  state.stage = TEST_STAGE_INDEX;
  
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
  refreshEditorCanvas();
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
  // クリップボードAPIはHTTPS外や一部モバイルで失敗するためフォールバックを用意
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showOverlay('📋 コピー完了', 'ステージコードをクリップボードにコピーしました。', 'OK', () => {});
    }).catch(() => {
      showOverlay('📋 コード生成完了', 'コピーに失敗しました。\n下のテキスト欄から手動でコピーしてください。', 'OK', () => {});
    });
  } else {
    showOverlay('📋 コード生成完了', '下のテキスト欄からコードをコピーしてください。', 'OK', () => {});
  }
}

// ================================================================
//  マイステージ（ローカル保存 & 一覧からの再プレイ）
// ================================================================
const MY_STAGES_KEY = 'grimm_my_stages';

function loadMyStages() {
  try {
    const raw = localStorage.getItem(MY_STAGES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function persistMyStages(arr) {
  try {
    localStorage.setItem(MY_STAGES_KEY, JSON.stringify(arr));
    return true;
  } catch (e) {
    showOverlay('❌ 保存エラー', 'ステージを保存できませんでした。\nブラウザの保存容量を確認してください。', 'OK', () => {});
    return false;
  }
}

// 廃止されたタイル(キノコ等)を含む古いステージデータを掃除する
function sanitizeGrid(grid) {
  return grid.map(row => row.map(t => (t === T.MUSHROOM ? T.EMPTY : t)));
}

// 重複しないステージ名を生成する（"名前 (2)" 形式で連番付与）
function uniqueStageName(baseName, stages) {
  const names = new Set(stages.map(s => s.name));
  if (!names.has(baseName)) return baseName;
  let n = 2;
  while (names.has(`${baseName} (${n})`)) n++;
  return `${baseName} (${n})`;
}

function saveMyStage() {
  const nameInput = document.getElementById('myStageName');
  const stages = loadMyStages();
  let name = nameInput.value.trim();
  if (!name) name = 'マイステージ' + (stages.length + 1);
  name = uniqueStageName(name, stages); // 常に新規保存（同名は連番で回避）

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    theme: currentThemeIdx,
    grid: deepCopy(editGrid),
    updatedAt: Date.now(),
  };
  stages.push(entry);

  if (persistMyStages(stages)) {
    nameInput.value = '';
    renderMyStagesList();
    showOverlay('💾 保存完了', `「${name}」を新規保存しました。\n名前を変えるには一覧のステージ名をタップしてください。`, 'OK', () => {});
  }
}

function renameMyStage(id) {
  const stages = loadMyStages();
  const s = stages.find(x => x.id === id);
  if (!s) return;
  const newName = prompt('新しいステージ名を入力してください', s.name);
  if (newName === null) return; // キャンセル
  const trimmed = newName.trim();
  if (!trimmed || trimmed === s.name) return;
  s.name = uniqueStageName(trimmed, stages.filter(x => x.id !== id));
  s.updatedAt = Date.now();
  if (persistMyStages(stages)) renderMyStagesList();
}

function renderMyStagesList() {
  const listDiv = document.getElementById('myStagesList');
  const stages = loadMyStages().sort((a, b) => b.updatedAt - a.updatedAt);
  listDiv.innerHTML = '';
  if (stages.length === 0) {
    listDiv.innerHTML = '<div class="my-stage-empty">保存したステージはまだありません</div>';
    return;
  }
  for (const s of stages) {
    const row = document.createElement('div');
    row.className = 'my-stage-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'my-stage-name';
    nameSpan.textContent = s.name;
    nameSpan.title = 'タップで名前を変更';
    nameSpan.onclick = () => renameMyStage(s.id);

    const playBtn = document.createElement('button');
    playBtn.textContent = '▶';
    playBtn.title = 'プレイ';
    playBtn.onclick = () => playMyStage(s.id);

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.title = 'エディタに読み込む';
    editBtn.onclick = () => loadMyStageIntoEditor(s.id);

    const publishBtn = document.createElement('button');
    publishBtn.textContent = '🌐';
    publishBtn.title = 'オンラインに公開';
    publishBtn.onclick = () => publishStageOnline(s.id);

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.title = '削除';
    delBtn.onclick = () => deleteMyStage(s.id);

    row.appendChild(nameSpan);
    row.appendChild(playBtn);
    row.appendChild(editBtn);
    row.appendChild(publishBtn);
    row.appendChild(delBtn);
    listDiv.appendChild(row);
  }
  const hint = document.createElement('div');
  hint.className = 'my-stage-hint';
  hint.textContent = '💡 ステージ名をタップすると名前を変更できます';
  listDiv.appendChild(hint);
}

function findMyStage(id) {
  return loadMyStages().find(s => s.id === id) || null;
}

function loadMyStageIntoEditor(id) {
  const s = findMyStage(id);
  if (!s) return;
  currentThemeIdx = s.theme || 0;
  document.getElementById('selectTheme').value = currentThemeIdx;
  state.stage = currentThemeIdx;
  editGrid = sanitizeGrid(deepCopy(s.grid));
  document.getElementById('inputCols').value = editGrid[0].length;
  document.getElementById('inputRows').value = editGrid.length;
  editorZoomCellSize = null;
  fitCanvasForEditor();
}

function playMyStage(id) {
  const s = findMyStage(id);
  if (!s) return;
  loadMyStageIntoEditor(id);
  startTestPlay();
}

function deleteMyStage(id) {
  const s = findMyStage(id);
  if (!s) return;
  if (!confirm(`「${s.name}」を削除しますか？`)) return;
  const stages = loadMyStages().filter(x => x.id !== id);
  persistMyStages(stages);
  renderMyStagesList();
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
      editGrid = sanitizeGrid(stageData.grid);
      
      const c = editGrid[0].length;
      const r = editGrid.length;
      document.getElementById('inputCols').value = c;
      document.getElementById('inputRows').value = r;
      
      editorZoomCellSize = null;
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