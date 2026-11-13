export const languageOptions = [
  { id: 'zh-CN', label: '简体中文', short: '简', htmlLang: 'zh-CN' },
  { id: 'zh-TW', label: '繁體中文', short: '繁', htmlLang: 'zh-TW' },
  { id: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  { id: 'ja', label: '日本語', short: '日', htmlLang: 'ja' },
] as const;

export type Language = (typeof languageOptions)[number]['id'];

const zhCN = {
  'document.title': '科技象棋 · TecChess',
  'meta.description':
    '在 Chessground 上实现的科技象棋变体：王车、王象、王马、马象、马车可以融合，也可以分裂走子。',
  'app.title': '科技象棋',
  hint: '科技象棋连点切换走法：第 1 下 = 融合走子（两子一起走），第 2 下 = 分裂走子（显示全部融合轨迹，按目标格决定只动哪个），第 3 下 = 取消选择。选好走法后点目标格即可走子。把可融合的友方棋子走到同一格即可融合。',
  'button.standard': '标准棋局',
  'button.lab': '融合实验室',
  'button.undo': '撤销',
  'turn.white': '轮到白方',
  'turn.black': '轮到黑方',
  'status.playing': '对局进行中',
  'status.check': '将军！',
  'status.checkmate': '将死 · {winner}胜',
  'status.stalemate': '逼和 · 和棋',
  'selection.empty': '点击自己的棋子开始走子；融合后的棋子连点切换走法',
  'selection.selected': '已选择 {square} · {color}{piece}',
  'selection.hintTarget': '：点目标格走子',
  'selection.hintFused1': '：第 1 下 · 融合走子（两子一起走）；再点棋子切换分裂，第三下取消',
  'selection.hintFused2': '：第 2 下 · 分裂走子（按目标格决定只动哪个）；再点棋子取消',
  'mode.step1': '融合走子（两子一起走）',
  'mode.step2': '分裂走子（按目标格决定只动哪个）',
  'mode.step3': '取消选择',
  'moves.title': '走子记录',
  'moves.empty': '还没有走子',
  'rules.title': '规则',
  'rules.lead':
    '<strong>可融合：</strong>王车、王象、王马、马象、马车（同色）。一个棋子走到另一个同色可融合的棋子的格子上时合并。',
  'rules.item1': '融合后的棋子可照两个原棋子的任意一种走法移动和吃子。',
  'rules.item2': '第 1 下点融合后的棋子：融合走子，两个子一起移动。',
  'rules.item3':
    '第 2 下点融合后的棋子：分裂走子，显示两部分全部轨迹，走子后按目标格决定只动哪个子，另一个留在原格；两个子都能到达目标格时优先动主角色。',
  'rules.item4': '第 3 下点融合后的棋子：取消选择。',
  'rules.item5': '融合后的棋子不能再与第三个子融合；兵、后不参与融合。',
  'rules.item6': '王的规则仍然生效：不能把王（包括融合后的棋子中的王）走进对方攻击格。',
  'color.white': '白方',
  'color.black': '黑方',
  'piece.pawn': '兵',
  'piece.knight': '马',
  'piece.bishop': '象',
  'piece.rook': '车',
  'piece.queen': '后',
  'piece.king': '王',
  'log.fused': '融合',
  'log.split': '分裂',
  'log.splitOnly': '分裂（只动{role}）',
  'log.capture': '（吃{role}）',
  'theme.toDark': '切换到暗色模式',
  'theme.toLight': '切换到亮色模式',
  'language.toggle': '选择语言',
} as const;

export type MessageKey = keyof typeof zhCN;
type Messages = Record<MessageKey, string>;

const zhTW: Messages = {
  'document.title': '科技象棋 · TecChess',
  'meta.description':
    '在 Chessground 上實現的科技象棋變體：王車、王象、王馬、馬象、馬車可以融合，也可以分裂走子。',
  'app.title': '科技象棋',
  hint: '科技象棋連點切換走法：第 1 下 = 融合走子（兩子一起走），第 2 下 = 分裂走子（顯示全部融合軌跡，按目標格決定只動哪個），第 3 下 = 取消選擇。選好走法後點目標格即可走子。把可融合的友方棋子走到同一格即可融合。',
  'button.standard': '標準棋局',
  'button.lab': '融合實驗室',
  'button.undo': '復原',
  'turn.white': '輪到白方',
  'turn.black': '輪到黑方',
  'status.playing': '對局進行中',
  'status.check': '將軍！',
  'status.checkmate': '將死 · {winner}勝',
  'status.stalemate': '逼和 · 和棋',
  'selection.empty': '點擊自己的棋子開始走子；融合後的棋子連點切換走法',
  'selection.selected': '已選擇 {square} · {color}{piece}',
  'selection.hintTarget': '：點目標格走子',
  'selection.hintFused1': '：第 1 下 · 融合走子（兩子一起走）；再點棋子切換分裂，第三下取消',
  'selection.hintFused2': '：第 2 下 · 分裂走子（按目標格決定只動哪個）；再點棋子取消',
  'mode.step1': '融合走子（兩子一起走）',
  'mode.step2': '分裂走子（按目標格決定只動哪個）',
  'mode.step3': '取消選擇',
  'moves.title': '走子記錄',
  'moves.empty': '還沒有走子',
  'rules.title': '規則',
  'rules.lead':
    '<strong>可融合：</strong>王車、王象、王馬、馬象、馬車（同色）。一個棋子走到另一個同色可融合的棋子的格子上時合併。',
  'rules.item1': '融合後的棋子可照兩個原棋子的任意一種走法移動和吃子。',
  'rules.item2': '第 1 下點融合後的棋子：融合走子，兩個子一起移動。',
  'rules.item3':
    '第 2 下點融合後的棋子：分裂走子，顯示兩部分全部軌跡，走子後按目標格決定只動哪個子，另一個留在原格；兩個子都能到達目標格時優先動主角色。',
  'rules.item4': '第 3 下點融合後的棋子：取消選擇。',
  'rules.item5': '融合後的棋子不能再與第三個子融合；兵、后不參與融合。',
  'rules.item6': '王的規則仍然生效：不能把王（包括融合後的棋子中的王）走進對方攻擊格。',
  'color.white': '白方',
  'color.black': '黑方',
  'piece.pawn': '兵',
  'piece.knight': '馬',
  'piece.bishop': '象',
  'piece.rook': '車',
  'piece.queen': '后',
  'piece.king': '王',
  'log.fused': '融合',
  'log.split': '分裂',
  'log.splitOnly': '分裂（只動{role}）',
  'log.capture': '（吃{role}）',
  'theme.toDark': '切換到暗色模式',
  'theme.toLight': '切換到亮色模式',
  'language.toggle': '選擇語言',
};

const en: Messages = {
  'document.title': 'Tech Chess · TecChess',
  'meta.description':
    'A fusion chess variant on Chessground: king + rook, king + bishop, king + knight, knight + bishop and knight + rook can fuse, and fused pieces can split.',
  'app.title': 'Tech Chess',
  hint: 'Click a fused piece repeatedly: 1st click = fused move (both parts move), 2nd click = split move (shows the full fused trajectory; the destination decides which part moves), 3rd click = cancel. Then click a destination. Move a piece onto a compatible friendly piece to fuse.',
  'button.standard': 'Standard game',
  'button.lab': 'Fusion lab',
  'button.undo': 'Undo',
  'turn.white': 'White to move',
  'turn.black': 'Black to move',
  'status.playing': 'In progress',
  'status.check': 'Check!',
  'status.checkmate': 'Checkmate · {winner} wins',
  'status.stalemate': 'Stalemate · Draw',
  'selection.empty': 'Click your own piece to start; click a fused piece repeatedly to switch modes',
  'selection.selected': 'Selected {square} · {color} {piece}',
  'selection.hintTarget': ': click a destination to move',
  'selection.hintFused1':
    ': 1st click · fused move (both parts move); click again to split, third click cancels',
  'selection.hintFused2':
    ': 2nd click · split move (the destination decides which part moves); click again to cancel',
  'mode.step1': 'Fused move (both parts move)',
  'mode.step2': 'Split move (destination decides which part moves)',
  'mode.step3': 'Cancel selection',
  'moves.title': 'Moves',
  'moves.empty': 'No moves yet',
  'rules.title': 'Rules',
  'rules.lead':
    '<strong>Fusable:</strong> king + rook, king + bishop, king + knight, knight + bishop, knight + rook (same colour). A piece fuses when it moves onto a compatible friendly piece.',
  'rules.item1': 'A fused piece moves and captures as either of its original pieces.',
  'rules.item2': '1st click on a fused piece: fused move, both parts move together.',
  'rules.item3':
    '2nd click: split move. All fused trajectories are shown; after choosing a destination, the destination decides which part moves and the other stays behind. If both can reach it, the primary role moves first.',
  'rules.item4': '3rd click: cancel the selection.',
  'rules.item5': 'A fused piece cannot fuse with a third piece; pawns and queens do not fuse.',
  'rules.item6':
    'King safety still applies: a king (including a king inside a fused piece) may not move into an attacked square.',
  'color.white': 'White',
  'color.black': 'Black',
  'piece.pawn': 'P',
  'piece.knight': 'N',
  'piece.bishop': 'B',
  'piece.rook': 'R',
  'piece.queen': 'Q',
  'piece.king': 'K',
  'log.fused': 'fused',
  'log.split': 'split',
  'log.splitOnly': 'split (only {role})',
  'log.capture': ' (takes {role})',
  'theme.toDark': 'Switch to dark mode',
  'theme.toLight': 'Switch to light mode',
  'language.toggle': 'Choose language',
};

const ja: Messages = {
  'document.title': 'テックチェス · TecChess',
  'meta.description':
    'Chessground で作られたテックチェス変体。キング＋ルーク、キング＋ビショップ、キング＋ナイト、ナイト＋ビショップ、ナイト＋ルークが融合でき、融合駒は分裂もできます。',
  'app.title': 'テックチェス',
  hint: '融合駒を連続でクリック：1回目＝融合移動（2駒が一緒に動く）、2回目＝分裂移動（融合駒の全軌跡を表示し、移動先でどちらが動くか決定）、3回目＝選択解除。その後、移動先をクリック。同じ色の融合可能な駒の上に移動すると融合します。',
  'button.standard': '標準対局',
  'button.lab': '融合ラボ',
  'button.undo': '元に戻す',
  'turn.white': '白番です',
  'turn.black': '黒番です',
  'status.playing': '対局中',
  'status.check': '王手！',
  'status.checkmate': '詰み · {winner}の勝ち',
  'status.stalemate': 'ステイルメイト · 引き分け',
  'selection.empty': '自分の駒をクリックして開始。融合駒は連続クリックで切り替え',
  'selection.selected': '{square} · {color}{piece} を選択中',
  'selection.hintTarget': '：移動先をクリック',
  'selection.hintFused1': '：1回目 · 融合移動（2駒が一緒に動く）。もう一度クリックで分裂、3回目でキャンセル',
  'selection.hintFused2': '：2回目 · 分裂移動（移動先で動く駒が決まる）。もう一度クリックでキャンセル',
  'mode.step1': '融合移動（2駒が一緒に動く）',
  'mode.step2': '分裂移動（移動先で動く駒を決定）',
  'mode.step3': '選択解除',
  'moves.title': '棋譜',
  'moves.empty': 'まだ指し手はありません',
  'rules.title': 'ルール',
  'rules.lead':
    '<strong>融合可能：</strong>キング＋ルーク、キング＋ビショップ、キング＋ナイト、ナイト＋ビショップ、ナイト＋ルーク（同色）。同じ色の融合可能な駒の上に移動すると融合します。',
  'rules.item1': '融合した駒は、元の2駒のどちらの動きでも移動・取子できます。',
  'rules.item2': '1回目のクリック：融合移動。2駒が一緒に動きます。',
  'rules.item3':
    '2回目のクリック：分裂移動。融合駒の全軌跡を表示し、移動先で動く駒を決定します。もう一方は元の位置に残ります。両方が到達できる場合はメインの役割を優先します。',
  'rules.item4': '3回目のクリック：選択解除。',
  'rules.item5': '融合した駒は3つ目の駒とは融合できません。ポーンとクイーンは融合しません。',
  'rules.item6': 'キングの安全は有効です。融合駒内のキングも、相手に攻撃されているマスへ移動できません。',
  'color.white': '白',
  'color.black': '黒',
  'piece.pawn': 'ポーン',
  'piece.knight': 'ナイト',
  'piece.bishop': 'ビショップ',
  'piece.rook': 'ルーク',
  'piece.queen': 'クイーン',
  'piece.king': 'キング',
  'log.fused': '融合',
  'log.split': '分裂',
  'log.splitOnly': '分裂（{role}のみ）',
  'log.capture': '（{role}を取る）',
  'theme.toDark': 'ダークモードに切り替え',
  'theme.toLight': 'ライトモードに切り替え',
  'language.toggle': '言語を選択',
};

export const messages: Record<Language, Messages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
};

export const isLanguage = (value: string | null): value is Language =>
  value !== null && languageOptions.some(option => option.id === value);

export const languageInfo = (language: Language) =>
  languageOptions.find(option => option.id === language) ?? languageOptions[0];

export function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem('tecchess-lang');
    if (isLanguage(stored)) return stored;
  } catch {
    // localStorage may be unavailable in privacy modes.
  }

  const candidates =
    typeof navigator !== 'undefined' && navigator.languages?.length
      ? navigator.languages
      : [typeof navigator !== 'undefined' ? navigator.language : 'zh-CN'];

  for (const raw of candidates) {
    const value = raw.toLowerCase();
    if (
      value.startsWith('zh-tw') ||
      value.startsWith('zh-hk') ||
      value.startsWith('zh-mo') ||
      value.startsWith('zh-hant')
    )
      return 'zh-TW';
    if (value.startsWith('zh')) return 'zh-CN';
    if (value.startsWith('ja')) return 'ja';
    if (value.startsWith('en')) return 'en';
  }
  return 'zh-CN';
}

export function t(language: Language, key: MessageKey, vars?: Record<string, string | number>): string {
  let text = messages[language][key] ?? messages['zh-CN'][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
