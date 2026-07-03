// ================================================================
//  online.js — 「🌐 みんなのステージ」オンライン共有機能
//  依存: levels.js, logic.js, editor.js, firebase-config.js
//        (Firebase compat SDK: app / auth / firestore)
// ================================================================

const ONLINE_AUTHOR_NAME_KEY = 'grimm_author_name';
const ONLINE_LIKED_KEY = 'grimm_liked_stage_ids';
const ONLINE_PAGE_SIZE = 12;

let onlineSortMode = 'new';   // 'new' | 'popular'
let onlineLastDoc = null;
let onlineDocsById = {};      // 現在表示中カードの元データ（id -> doc）
let onlineAuthUid = null;
let onlineReady = false;      // 匿名認証が完了し、投稿・いいねが可能な状態か

// ── Firebase設定が入力済みかどうか ──
function isFirebaseConfigured() {
  return typeof firebaseConfig !== 'undefined'
    && !!firebaseConfig.apiKey
    && !firebaseConfig.apiKey.startsWith('YOUR_');
}

// ── 初期化（ページ読み込み時に一度だけ呼ばれる） ──
function initOnlineFeature() {
  const nameInput = document.getElementById('onlineAuthorName');
  if (nameInput) {
    nameInput.value = localStorage.getItem(ONLINE_AUTHOR_NAME_KEY) || '';
    nameInput.onchange = () => {
      localStorage.setItem(ONLINE_AUTHOR_NAME_KEY, nameInput.value.trim().slice(0, 16));
    };
  }

  document.getElementById('onlineBtn').onclick = openOnlineScreen;
  document.getElementById('onlineCloseBtn').onclick = closeOnlineScreen;
  document.getElementById('onlineTabNew').onclick = () => switchOnlineTab('new');
  document.getElementById('onlineTabPopular').onclick = () => switchOnlineTab('popular');
  document.getElementById('onlineLoadMoreBtn').onclick = () => loadOnlineStages(false);

  if (!isFirebaseConfigured()) return;

  try {
    firebase.initializeApp(firebaseConfig);
    firebase.auth().signInAnonymously()
      .then(cred => {
        onlineAuthUid = cred.user.uid;
        onlineReady = true;
      })
      .catch(err => {
        console.error('Firebaseの匿名認証に失敗しました:', err);
      });
  } catch (err) {
    console.error('Firebaseの初期化に失敗しました:', err);
  }
}

function getAuthorName() {
  const nameInput = document.getElementById('onlineAuthorName');
  const v = nameInput ? nameInput.value.trim() : '';
  return v.slice(0, 16);
}

// ================================================================
//  一覧画面
// ================================================================
function openOnlineScreen() {
  document.getElementById('onlineScreen').classList.remove('hidden');
  loadOnlineStages(true);
}

function closeOnlineScreen() {
  document.getElementById('onlineScreen').classList.add('hidden');
}

function switchOnlineTab(mode) {
  if (onlineSortMode === mode) return;
  onlineSortMode = mode;
  document.getElementById('onlineTabNew').classList.toggle('active', mode === 'new');
  document.getElementById('onlineTabPopular').classList.toggle('active', mode === 'popular');
  loadOnlineStages(true);
}

function setOnlineStatus(msg) {
  document.getElementById('onlineStatus').textContent = msg || '';
}

async function loadOnlineStages(reset) {
  const grid = document.getElementById('onlineGrid');
  const loadMoreBtn = document.getElementById('onlineLoadMoreBtn');

  if (!isFirebaseConfigured()) {
    grid.innerHTML = '';
    loadMoreBtn.classList.add('hidden');
    setOnlineStatus('⚠️ オンライン機能は未設定です。\nfirebase-config.js に自分のFirebaseプロジェクトの設定を入力してください。');
    return;
  }

  if (reset) {
    onlineDocsById = {};
    onlineLastDoc = null;
    grid.innerHTML = '';
  }
  setOnlineStatus('読み込み中…');
  loadMoreBtn.classList.add('hidden');

  try {
    const db = firebase.firestore();
    const orderField = onlineSortMode === 'popular' ? 'likes' : 'createdAt';
    let q = db.collection('stages').orderBy(orderField, 'desc').limit(ONLINE_PAGE_SIZE);
    if (onlineLastDoc) q = q.startAfter(onlineLastDoc);
    const snap = await q.get();

    if (snap.empty && reset) {
      setOnlineStatus('まだ公開されているステージがありません。\n最初の投稿者になろう！');
    } else {
      setOnlineStatus('');
    }

    snap.docs.forEach(doc => {
      onlineDocsById[doc.id] = doc;
      renderOnlineStageCard(doc);
    });

    if (snap.docs.length > 0) onlineLastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length === ONLINE_PAGE_SIZE) loadMoreBtn.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    setOnlineStatus('❌ 読み込みに失敗しました。通信環境を確認してください。');
  }
}

function getLikedIds() {
  try {
    const arr = JSON.parse(localStorage.getItem(ONLINE_LIKED_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function addLikedId(id) {
  const ids = getLikedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(ONLINE_LIKED_KEY, JSON.stringify(ids));
  }
}

// カードはユーザー入力(ステージ名・投稿者名)を含むため、
// innerHTMLではなくDOM APIで安全に組み立てる
function renderOnlineStageCard(doc) {
  const data = doc.data();
  const grid = document.getElementById('onlineGrid');
  const theme = THEMES_INTEGRATED[data.theme] || THEMES_INTEGRATED[0];
  const likedIds = getLikedIds();

  const card = document.createElement('div');
  card.className = 'online-stage-card';
  card.dataset.stageId = doc.id;

  const themeBand = document.createElement('div');
  themeBand.className = 'online-stage-theme';
  themeBand.style.background = `linear-gradient(135deg, ${theme.palette.wall}, ${theme.palette.dark})`;
  themeBand.textContent = theme.name;

  const body = document.createElement('div');
  body.className = 'online-stage-body';

  const nameEl = document.createElement('div');
  nameEl.className = 'online-stage-name';
  nameEl.textContent = data.name || 'ステージ';

  const metaEl = document.createElement('div');
  metaEl.className = 'online-stage-meta';
  metaEl.textContent = `👤 ${data.authorName || '名無し'} ・ ${data.cols || '?'}×${data.rows || '?'}`;

  const statsEl = document.createElement('div');
  statsEl.className = 'online-stage-stats';
  statsEl.textContent = `▶ ${data.plays || 0}  ・  ❤️ ${data.likes || 0}`;

  body.appendChild(nameEl);
  body.appendChild(metaEl);
  body.appendChild(statsEl);

  const actions = document.createElement('div');
  actions.className = 'online-stage-actions';

  const playBtn = document.createElement('button');
  playBtn.className = 'online-play-btn';
  playBtn.textContent = '▶ プレイ';
  playBtn.onclick = () => playOnlineStage(doc.id);

  const likeBtn = document.createElement('button');
  likeBtn.className = 'online-like-btn' + (likedIds.includes(doc.id) ? ' liked' : '');
  likeBtn.textContent = '❤️';
  likeBtn.title = 'いいね';
  likeBtn.onclick = () => likeOnlineStage(doc.id, likeBtn, statsEl);

  actions.appendChild(playBtn);
  actions.appendChild(likeBtn);

  if (onlineAuthUid && data.authorId === onlineAuthUid) {
    const delBtn = document.createElement('button');
    delBtn.className = 'online-del-btn';
    delBtn.textContent = '🗑️';
    delBtn.title = '公開を取り消す';
    delBtn.onclick = () => deleteOnlineStage(doc.id, card);
    actions.appendChild(delBtn);
  }

  card.appendChild(themeBand);
  card.appendChild(body);
  card.appendChild(actions);
  grid.appendChild(card);
}

async function likeOnlineStage(id, btnEl, statsEl) {
  if (!isFirebaseConfigured()) return;
  const likedIds = getLikedIds();
  if (likedIds.includes(id)) return; // 二重いいね防止（このブラウザ内のみ）
  btnEl.disabled = true;
  try {
    const db = firebase.firestore();
    await db.collection('stages').doc(id).update({
      likes: firebase.firestore.FieldValue.increment(1),
    });
    addLikedId(id);
    btnEl.classList.add('liked');
    const doc = onlineDocsById[id];
    const data = doc ? doc.data() : {};
    const newLikes = (data.likes || 0) + 1;
    if (statsEl) statsEl.textContent = `▶ ${data.plays || 0}  ・  ❤️ ${newLikes}`;
  } catch (err) {
    console.error(err);
    btnEl.disabled = false;
  }
}

async function deleteOnlineStage(id, cardEl) {
  if (!confirm('このステージの公開を取り消しますか？\n（この操作は取り消せません）')) return;
  try {
    const db = firebase.firestore();
    await db.collection('stages').doc(id).delete();
    delete onlineDocsById[id];
    cardEl.remove();
  } catch (err) {
    console.error(err);
    alert('削除に失敗しました。通信環境を確認してください。');
  }
}

// ================================================================
//  プレイ
// ================================================================
async function playOnlineStage(id) {
  const doc = onlineDocsById[id];
  if (!doc) return;
  const data = doc.data();

  let grid;
  try {
    grid = JSON.parse(data.gridData);
    if (!Array.isArray(grid) || !Array.isArray(grid[0])) throw new Error('invalid grid');
  } catch (e) {
    showOverlay('❌ エラー', 'このステージのデータを読み込めませんでした。', '閉じる', () => {});
    return;
  }

  const sanitized = sanitizeGrid(grid);
  const hasPlayer = findAll(sanitized, T.PLAYER).length > 0;
  const hasGoal = findAll(sanitized, T.GOAL).length > 0 || findAll(sanitized, T.DOOR).length > 0;
  if (!hasPlayer || !hasGoal) {
    showOverlay('❌ エラー', 'このステージは不完全なため、プレイできません。', '閉じる', () => {});
    return;
  }

  closeOnlineScreen();

  // プレイ数をインクリメント（失敗しても致命的ではないので結果は待たない）
  if (isFirebaseConfigured()) {
    firebase.firestore().collection('stages').doc(id).update({
      plays: firebase.firestore.FieldValue.increment(1),
    }).catch(err => console.error(err));
  }

  currentThemeIdx = data.theme || 0;
  editGrid = sanitized;

  const ts = document.getElementById('titleScreen');
  ts.classList.add('fade-out');
  setTimeout(() => { ts.style.display = 'none'; }, 500);

  startTestPlay();
  state.isOnlinePlay = true;

  const etb = document.getElementById('exitTestBtn');
  etb.textContent = '🏠 タイトルへ戻る';
  etb.onclick = stopOnlinePlay;

  if (typeof CUSTOM_STAGE_DATA === 'object' && CUSTOM_STAGE_DATA) {
    CUSTOM_STAGE_DATA.name = data.name || 'ステージ';
    CUSTOM_STAGE_DATA.subtitle = `by ${data.authorName || '名無し'}`;
    CUSTOM_STAGE_DATA.icon = '🌐';
    updateHUD();
  }
}

// オンラインプレイ終了 → タイトルへ（エディタには戻さない）
function stopOnlinePlay() {
  state.isTestPlay = false;
  state.isOnlinePlay = false;
  state.gameStarted = false;
  state.isEditorMode = false;
  goToTitle();
}

// ================================================================
//  公開（マイステージ一覧の🌐ボタンから呼ばれる）
// ================================================================
async function publishStageOnline(id) {
  if (!isFirebaseConfigured()) {
    showOverlay(
      '⚠️ 未設定',
      'オンライン共有機能はまだ設定されていません。\n(firebase-config.js を確認してください)',
      '閉じる',
      () => {}
    );
    return;
  }
  if (!onlineReady) {
    showOverlay('⏳ 準備中', 'オンライン機能の準備中です。少し待ってから再度お試しください。', '閉じる', () => {});
    return;
  }

  const s = findMyStage(id);
  if (!s) return;

  let authorName = getAuthorName();
  if (!authorName) {
    const entered = (prompt('公開する際に表示する投稿者名を入力してください（例: たろう）', '') || '').trim();
    authorName = entered.slice(0, 16) || '名無し';
    const nameInput = document.getElementById('onlineAuthorName');
    if (nameInput) nameInput.value = authorName;
    localStorage.setItem(ONLINE_AUTHOR_NAME_KEY, authorName);
  }

  if (!confirm(`「${s.name}」をオンラインに公開しますか？\n公開すると誰でもプレイできるようになります。`)) return;

  try {
    const db = firebase.firestore();
    await db.collection('stages').add({
      name: s.name.slice(0, 20),
      authorName: authorName,
      authorId: onlineAuthUid,
      theme: s.theme || 0,
      gridData: JSON.stringify(s.grid),
      cols: s.grid[0].length,
      rows: s.grid.length,
      plays: 0,
      likes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showOverlay(
      '🌐 公開完了',
      `「${s.name}」をオンラインに公開しました！\n「みんなのステージ」から誰でもプレイできます。`,
      'OK',
      () => {}
    );
  } catch (err) {
    console.error(err);
    showOverlay('❌ 公開失敗', '公開に失敗しました。通信環境を確認して、再度お試しください。', '閉じる', () => {});
  }
}

initOnlineFeature();