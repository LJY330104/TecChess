import type { Api } from './api.js';
import { Chessground } from './chessground.js';
import { read as readFen, write as writeFen } from './fen.js';
import {
  applyMove,
  type FusionGame,
  type FusionMode,
  status as fusionStatus,
  type FusionStatus,
  legalDests,
} from './fusion.js';
import type * as cg from './types.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
/** Compact position where all five fusion pairs can be demonstrated quickly. */
const LAB = '4k3/8/8/3NB3/3RK3/5N1R/8/8 w - - 0 1';

const roleLabels: Record<cg.Role, string> = {
  pawn: '兵',
  knight: '马',
  bishop: '象',
  rook: '车',
  queen: '后',
  king: '王',
};

const pieceLabel = (piece: cg.Piece): string =>
  piece.fusion ? `${roleLabels[piece.role]}+${roleLabels[piece.fusion]}` : roleLabels[piece.role];

const gameFromFen = (fen: string): FusionGame => {
  const fields = fen.split(' ');
  const enPassant = fields[3] && fields[3] !== '-' ? (fields[3] as cg.Key) : undefined;
  return {
    pieces: readFen(fen),
    turn: fields[1] === 'b' ? 'black' : 'white',
    enPassant,
  };
};

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const boardEl = $('board');
const turnEl = $('turn');
const statusEl = $('status');
const selectionEl = $('selection');
const modesEl = $('modes');
const logEl = $('log');
const undoBtn = $<HTMLButtonElement>('undo');

type UiMode = 'whole' | 'split';

let game = gameFromFen(LAB);
let selected: cg.Key | undefined;
let mode: UiMode = 'whole';
/** 1 = first click (fused move), 2 = second click (split move). */
let fusedClicks = 0;
let history: { game: FusionGame; log: string[] }[] = [];
let log: string[] = [];

const board: Api = Chessground(boardEl, {
  fen: LAB,
  orientation: 'white',
  turnColor: 'white',
  autoCastle: false,
  coordinates: true,
  draggable: {
    enabled: false,
  },
  movable: {
    free: false,
    color: 'white',
    showDests: true,
    dests: new Map(),
    events: {
      after: onAfter,
    },
  },
  premovable: {
    enabled: false,
  },
  highlight: {
    lastMove: true,
    check: true,
  },
  events: {
    select: onSelect,
  },
});

function buildDests(): cg.Dests {
  const dests: cg.Dests = new Map();
  for (const [key, piece] of game.pieces) {
    if (piece.color !== game.turn) continue;
    const keys = new Set<cg.Key>();
    if (selected === key && piece.fusion) {
      if (mode === 'split') {
        // Show the whole fused trajectory; the target square decides which
        // part actually moves.
        for (const role of [piece.role, piece.fusion]) {
          for (const dest of legalDests(game, key, role)) keys.add(dest);
        }
      } else {
        for (const dest of legalDests(game, key, 'whole')) keys.add(dest);
      }
    } else {
      for (const dest of legalDests(game, key, 'whole')) keys.add(dest);
    }
    if (keys.size) dests.set(key, [...keys]);
  }
  return dests;
}

function refreshDests(): void {
  board.set({ movable: { dests: buildDests() } });
}

function destinationKeysForSelection(): cg.Key[] {
  const piece = selected ? game.pieces.get(selected) : undefined;
  if (!piece || !selected) return [];
  const modes: FusionMode[] = mode === 'split' && piece.fusion ? [piece.role, piece.fusion] : ['whole'];
  const keys = new Set<cg.Key>();
  for (const m of modes) {
    for (const dest of legalDests(game, selected, m)) keys.add(dest);
  }
  return [...keys];
}

function resetSelection(): void {
  selected = undefined;
  mode = 'whole';
  fusedClicks = 0;
}

function onSelect(key: cg.Key): void {
  // Clicking a highlighted destination is a move, not a new selection.
  if (selected && destinationKeysForSelection().includes(key)) return;

  // Chessground deselects when the selected non-fused piece is clicked again
  // (dragging is disabled in this demo).
  if (selected === key) {
    resetSelection();
    renderPanel();
    refreshDests();
    return;
  }

  const piece = game.pieces.get(key);
  if (piece && piece.color === game.turn) {
    selected = key;
    mode = 'whole';
    fusedClicks = piece.fusion ? 1 : 0;
  } else {
    resetSelection();
  }
  renderPanel();
  refreshDests();
}

/** Pick the part that actually moves for a split, based on the target. */
function resolveSplitRole(piece: cg.Piece, orig: cg.Key, dest: cg.Key): cg.Role | undefined {
  if (!piece.fusion) return undefined;
  return [piece.role, piece.fusion].find(role => legalDests(game, orig, role).includes(dest));
}

function onAfter(orig: cg.Key, dest: cg.Key): void {
  const mover = game.pieces.get(orig);
  const appliedMode: FusionMode | undefined =
    mode === 'split' ? (mover ? resolveSplitRole(mover, orig, dest) : undefined) : mode;
  const applied = mover && appliedMode ? applyMove(game, orig, dest, appliedMode) : undefined;
  if (applied && mover) {
    history.push({ game, log: [...log] });
    const moverColor = game.turn;
    const text =
      `${moverColor === 'white' ? '白' : '黑'} ${pieceLabel(mover)} ${orig}` +
      `${applied.captured ? '×' : '–'}${dest}` +
      (applied.fused ? ' · 融合' : '') +
      (applied.split && appliedMode && appliedMode !== 'whole'
        ? ` · 分裂（只动${roleLabels[appliedMode]}）`
        : '') +
      (applied.captured ? `（吃${roleLabels[applied.captured.role]}）` : '');
    log.push(text);
    game = applied.game;
  }
  resetSelection();
  sync();
}

function sync(): void {
  if (board.state.selected) board.selectSquare(null);
  const st = fusionStatus(game);
  board.set({
    fen: writeFen(game.pieces),
    turnColor: game.turn,
    lastMove: game.lastMove,
    check: st.inCheck ? game.turn : false,
    movable: {
      color: game.turn,
      dests: buildDests(),
    },
  });
  renderPanel(st);
}

function renderPanel(st: FusionStatus = fusionStatus(game)): void {
  turnEl.textContent = `轮到${game.turn === 'white' ? '白方' : '黑方'}`;
  turnEl.className = `turn ${game.turn}`;

  if (st.checkmate) {
    statusEl.textContent = `将死 · ${game.turn === 'white' ? '黑方' : '白方'}胜`;
    statusEl.className = 'status checkmate';
  } else if (st.stalemate) {
    statusEl.textContent = '逼和 · 和棋';
    statusEl.className = 'status stalemate';
  } else if (st.inCheck) {
    statusEl.textContent = '将军！';
    statusEl.className = 'status check';
  } else {
    statusEl.textContent = '对局进行中';
    statusEl.className = 'status';
  }

  const piece = selected ? game.pieces.get(selected) : undefined;
  if (piece && selected) {
    let hint = '：点目标格走子';
    if (piece.fusion) {
      hint =
        fusedClicks === 1
          ? '：第 1 下 · 融合走子（两子一起走）；再点棋子切换分裂，第三下取消'
          : '：第 2 下 · 分裂走子（按目标格决定只动哪个）；再点棋子取消';
    }
    selectionEl.textContent =
      `已选择 ${selected} · ${game.turn === 'white' ? '白' : '黑'}${pieceLabel(piece)}` + hint;
  } else {
    selectionEl.textContent = '点击自己的棋子开始走子；融合后的棋子连点切换走法';
  }

  modesEl.innerHTML = '';
  if (piece?.fusion) {
    const steps: [string, string, boolean][] = [
      ['1', '融合走子（两子一起走）', fusedClicks === 1],
      ['2', '分裂走子（按目标格决定只动哪个）', fusedClicks === 2],
      ['3', '取消选择', false],
    ];
    for (const [num, label, active] of steps) {
      const step = document.createElement('div');
      step.className = active ? 'mode hint active' : 'mode hint';
      const number = document.createElement('b');
      number.textContent = num;
      step.append(number, label);
      modesEl.appendChild(step);
    }
  }

  logEl.innerHTML = '';
  if (!log.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = '还没有走子';
    logEl.appendChild(empty);
  } else {
    for (const line of log) {
      const item = document.createElement('li');
      item.textContent = line;
      logEl.appendChild(item);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }
  undoBtn.disabled = !history.length;
}

function loadPosition(fen: string): void {
  game = gameFromFen(fen);
  resetSelection();
  history = [];
  log = [];
  sync();
}

$('standard').addEventListener('click', () => loadPosition(START));
$('lab').addEventListener('click', () => loadPosition(LAB));
undoBtn.addEventListener('click', () => {
  const previous = history.pop();
  if (!previous) return;
  game = previous.game;
  log = previous.log;
  resetSelection();
  sync();
});

/** Clicking a fused piece cycles: whole move, split move, cancel. */
function handleFusedClick(key: cg.Key): void {
  if (selected !== key) {
    selected = key;
    fusedClicks = 1;
  } else if (fusedClicks === 1) {
    fusedClicks = 2;
  } else if (fusedClicks === 2) {
    fusedClicks = 3;
  } else {
    fusedClicks = 1;
  }

  if (fusedClicks === 3) {
    resetSelection();
    board.selectSquare(null);
    renderPanel();
    refreshDests();
    return;
  }

  mode = fusedClicks === 2 ? 'split' : 'whole';
  // Select the fused square without going through Chessground's click logic,
  // which would interpret a repeated click as a deselect.
  board.state.selected = key;
  renderPanel();
  refreshDests();
}

function onFusedPointerDown(event: MouseEvent | TouchEvent): void {
  if (event instanceof MouseEvent && (event.button !== 0 || event.shiftKey)) return;

  const point = 'touches' in event ? event.touches[0] : event;
  if (!point) return;
  const key = board.getKeyAtDomPos([point.clientX, point.clientY]);
  if (!key) return;
  const piece = game.pieces.get(key);
  if (!piece || !piece.fusion || piece.color !== game.turn) return;

  // A fused piece can also be the target of the currently selected piece
  // (a fusion move); let Chessground handle that case.
  if (selected && destinationKeysForSelection().includes(key)) return;

  event.preventDefault();
  event.stopPropagation();
  handleFusedClick(key);
}

boardEl.addEventListener('mousedown', onFusedPointerDown, true);
boardEl.addEventListener('touchstart', onFusedPointerDown, { capture: true, passive: false });

loadPosition(LAB);
