// ================================================================
//  story.js — ストーリーデータ（カットシーン定義）
//  依存: なし（logic.js から参照される）
// ================================================================
//
//  各シーンは「セリフの配列」で構成される。
//  1セリフ = { speaker, icon, text, side } のオブジェクト。
//  side: 'left' | 'right' | 'center'（立ち絵の位置。centerはナレーション風）
//
// ================================================================

// ── 登場キャラクター定義（共通） ──
const CHARACTERS = {
  HERO:    { name: 'ノア',         icon: '🧙', color: '#f0abfc' }, // 主人公：魔法使い見習い
  NARRATOR:{ name: '',             icon: '📖', color: '#a78bfa' },
  RIDING:  { name: '赤ずきん',     icon: '🐺', color: '#86efac' },
  WITCH1:  { name: '森の魔女',     icon: '🧹', color: '#4ade80' },
  RAPUNZEL:{ name: 'ラプンツェル', icon: '👸', color: '#f0abfc' },
  WITCH2:  { name: '塔の魔女',     icon: '🔮', color: '#e879f9' },
  HANSEL:  { name: 'ヘンゼル',     icon: '🧒', color: '#fbbf24' },
  WITCH3:  { name: '菓子の魔女',   icon: '🍭', color: '#fb923c' },
  CINDER:  { name: 'シンデレラ',   icon: '👠', color: '#93c5fd' },
  STEPMOM: { name: '継母',         icon: '👑', color: '#60a5fa' },
  SNOWQ:   { name: '雪の女王',     icon: '❄️', color: '#bae6fd' },
};

// ================================================================
//  プロローグ（タイトル → ステージ1の間に1度だけ再生）
// ================================================================
const PROLOGUE_SCENE = [
  { speaker: null, icon: '📖', text: '王立魔法学校の片隅、誰も寄り付かない古い図書室。', side: 'center' },
  { speaker: null, icon: '📖', text: 'ノアは見習い魔法使い。今日もこっそり禁書の棚を覗いていた。', side: 'center' },
  { speaker: CHARACTERS.HERO, text: 'あれ……こんな本、見たことないぞ。\nタイトルもない、ただ古いだけの本……', side: 'left' },
  { speaker: CHARACTERS.HERO, text: 'うわっ、ページが勝手に開いて……\n光って——', side: 'left' },
  { speaker: null, icon: '📖', text: '次の瞬間、ノアの体は本のページに吸い込まれていった。', side: 'center' },
  { speaker: null, icon: '📖', text: '気がつくとそこは——深い森の中。\nこれは、グリム兄弟が書き残した物語の世界だった。', side: 'center' },
  { speaker: CHARACTERS.HERO, text: 'ここは……物語の中？\nとにかく、元の世界に戻る方法を探さないと。', side: 'left' },
  { speaker: null, icon: '📖', text: 'しかし物語の中では、魔女の呪いで重力すら歪んでいた。\n出口を見つけるには、その力を使いこなすしかない。', side: 'center' },
];

// ================================================================
//  各ステージ「開始前」カットシーン
// ================================================================
const STAGE_INTRO_SCENES = [
  // ── Chapter 1: 赤ずきんの森 ──
  [
    { speaker: null, icon: '📖', text: '深い森の奥から、すすり泣く声が聞こえる。', side: 'center' },
    { speaker: CHARACTERS.RIDING, text: 'う……ぐすっ……\n誰か、助けて……', side: 'right' },
    { speaker: CHARACTERS.HERO, text: '大丈夫？ 何があったの？', side: 'left' },
    { speaker: CHARACTERS.RIDING, text: '森の魔女が、わたしの足元の地面を\n捻じ曲げてしまったの……\n鍵を見つけないと、おばあさんの家に帰れない……', side: 'right' },
    { speaker: CHARACTERS.WITCH1, text: 'くくく……この森から出たくば、\n重力の迷路を抜けてみせるがいい。', side: 'right' },
    { speaker: CHARACTERS.HERO, text: '……仕方ない。\nこの不思議な力、試してみよう。', side: 'left' },
  ],
  // ── Chapter 2: ラプンツェルの塔 ──
  [
    { speaker: null, icon: '📖', text: '森を抜けると、雲を貫くほど高い塔が現れた。', side: 'center' },
    { speaker: CHARACTERS.RAPUNZEL, text: 'あなたが噂の旅人ね。\nわたしもこの塔の魔女に\n閉じ込められて何年も経つわ……', side: 'right' },
    { speaker: CHARACTERS.WITCH2, text: 'ほう、また侵入者か。\nならばこの塔ごと、\n重力で引き裂いてやろう。', side: 'right' },
    { speaker: CHARACTERS.HERO, text: '上も下もない塔……？\nなら、自分から重力を操って\n登ってやる。', side: 'left' },
    { speaker: CHARACTERS.RAPUNZEL, text: '気をつけて。\n鍵は塔のどこかに隠されているはず……', side: 'right' },
  ],
  // ── Chapter 3: 菓子の家の迷宮 ──
  [
    { speaker: null, icon: '📖', text: '甘い匂いに誘われて辿り着いたのは、お菓子で出来た家。', side: 'center' },
    { speaker: CHARACTERS.HANSEL, text: 'お、おい！ 食べちゃダメだ！\nこの家、罠だらけなんだよ！', side: 'right' },
    { speaker: CHARACTERS.HERO, text: '床が氷みたいに滑る……\nこれも魔女の仕業？', side: 'left' },
    { speaker: CHARACTERS.WITCH3, text: 'ふふふ、迷い込んだ子は\nみんな私のごちそうになるのさ。\n滑って、転んで、トゲに刺されるがいい！', side: 'right' },
    { speaker: CHARACTERS.HANSEL, text: '頼む、妹を助けるための鍵を\n先に見つけてくれ……！', side: 'right' },
  ],
  // ── Chapter 4: シンデレラの牢獄 ──
  [
    { speaker: null, icon: '📖', text: '舞踏会の喧騒が遠くに聞こえる、冷たい地下牢。', side: 'center' },
    { speaker: CHARACTERS.CINDER, text: 'お願い……午前0時までに\nここを出ないと、\n全部が水の泡になってしまうの。', side: 'right' },
    { speaker: CHARACTERS.STEPMOM, text: 'おやおや、余計な助っ人かしら。\nならば箱という箱で、\n通り道を塞いでさしあげるわ。', side: 'right' },
    { speaker: CHARACTERS.HERO, text: '木箱が行く手を阻んでいる……\n重力の向きを変えて、\n道を切り開かないと。', side: 'left' },
    { speaker: CHARACTERS.CINDER, text: 'ガラスの靴は片方しかないけれど……\n今は、自由になることだけを考えるわ。', side: 'right' },
  ],
  // ── Final Chapter: 雪の女王の宮殿 ──
  [
    { speaker: null, icon: '📖', text: 'すべての物語の果てに、純白の宮殿がそびえていた。', side: 'center' },
    { speaker: CHARACTERS.SNOWQ, text: 'よくぞここまで辿り着いた、\n小さな魔法使いよ。', side: 'right' },
    { speaker: CHARACTERS.HERO, text: 'あなたが、この世界を\n歪ませている張本人……？', side: 'left' },
    { speaker: CHARACTERS.SNOWQ, text: '違うわ。わたしもまた、\n誰かが書いた物語に\n閉じ込められた一人にすぎない。', side: 'right' },
    { speaker: CHARACTERS.SNOWQ, text: 'もしお前が本当に物語の外から来たのなら……\n最後の試練を超え、\n証明してみせるがいい。', side: 'right' },
    { speaker: CHARACTERS.HERO, text: 'わかった。\nこれを乗り越えたら——\n僕は必ず、元の世界に帰る。', side: 'left' },
  ],
];

// ================================================================
//  各ステージ「クリア後」一言（カットシーンより軽量、台詞1〜2個）
// ================================================================
const STAGE_OUTRO_SCENES = [
  [
    { speaker: CHARACTERS.RIDING, text: 'ありがとう！ おかげで\nおばあさんの家に帰れる……\n旅人さん、あなたもどうか気をつけて。', side: 'right' },
  ],
  [
    { speaker: CHARACTERS.RAPUNZEL, text: '塔を抜け出せたのね……！\nこの恩は忘れないわ。\nあなたの旅にも、光がありますように。', side: 'right' },
  ],
  [
    { speaker: CHARACTERS.HANSEL, text: 'やった……！\nこれで妹を助けに行ける。\n本当にありがとう、旅人さん！', side: 'right' },
  ],
  [
    { speaker: CHARACTERS.CINDER, text: '時計の針が止まって見える……\n自由って、こんなに\n眩しいものだったのね。', side: 'right' },
  ],
  // Final Chapterのクリア後はエピローグに直結するため省略
  [],
];

// ================================================================
//  エピローグ（全ステージクリア後）
// ================================================================
const EPILOGUE_SCENE = [
  { speaker: null, icon: '📖', text: '雪の女王の試練を超えた瞬間、\n本のページがまばゆく輝き出した。', side: 'center' },
  { speaker: CHARACTERS.SNOWQ, text: '見事だ、小さな魔法使いよ。\nお前は確かに、物語の外側の力を\n証明してみせた。', side: 'right' },
  { speaker: CHARACTERS.HERO, text: 'みんな……ありがとう。\nこの世界で出会った全員のことを、\n僕は忘れない。', side: 'left' },
  { speaker: null, icon: '📖', text: '光が辺りを包み込み、\nノアの体は再びページの中へと吸い込まれていく。', side: 'center' },
  { speaker: null, icon: '📖', text: '気がつくと、そこは見慣れた図書室。\n手の中には、もう何も書かれていない\n一冊の本だけが残っていた。', side: 'center' },
  { speaker: CHARACTERS.HERO, text: 'あれは夢……？\nいや、違う。\nこの手にはまだ、重力を操った感触が残っている。', side: 'left' },
  { speaker: CHARACTERS.HERO, text: 'いつかまた、この本が\n誰かを呼ぶのかもしれない。\nその時は——僕がきっと、力になろう。', side: 'left' },
  { speaker: null, icon: '📖', text: '— おわり —', side: 'center' },
];
