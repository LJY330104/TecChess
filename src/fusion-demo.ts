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
import { detectLanguage, isLanguage, type Language, languageInfo, type MessageKey, t } from './i18n.js';
import type * as cg from './types.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
/** Compact position where all five fusion pairs can be demonstrated quickly. */
const LAB = '4k3/8/8/3NB3/3RK3/5N1R/8/8 w - - 0 1';

type UiMode = 'whole' | 'split';
type Theme = 'light' | 'dark';

interface LogEntry {
  color: cg.Color;
  piece: cg.Piece;
  orig: cg.Key;
  dest: cg.Key;
  captured?: cg.Piece;
  fused: boolean;
  split: boolean;
  splitRole?: cg.Role;
}

const roleLabel = (role: cg.Role, language: Language): string => t(language, `piece.${role}` as MessageKey);

const pieceLabel = (piece: cg.Piece, language: Language): string =>
  piece.fusion
    ? `${roleLabel(piece.role, language)}+${roleLabel(piece.fusion, language)}`
    : roleLabel(piece.role, language);

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
const themeToggle = $<HTMLButtonElement>('theme-toggle');
const languageButton = $<HTMLButtonElement>('language-button');
const languageCurrent = $('language-current');
const languageMenu = $('language-menu');
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]')!;

let lang: Language = detectLanguage();
let game = gameFromFen(LAB);
let selected: cg.Key | undefined;
let mode: UiMode = 'whole';
/** 1 = first click (fused move), 2 = second click (split move). */
let fusedClicks = 0;
let history: { game: FusionGame; log: LogEntry[] }[] = [];
let log: LogEntry[] = [];

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

const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function updateThemeButton(): void {
  const key = currentTheme() === 'dark' ? 'theme.toLight' : 'theme.toDark';
  const label = t(lang, key);
  themeToggle.setAttribute('aria-label', label);
  themeToggle.setAttribute('title', label);
}

function setTheme(theme: Theme, persist = true): void {
  document.documentElement.dataset.theme = theme;
  themeColor.content = theme === 'dark' ? '#141218' : '#fef7ff';
  if (persist) {
    try {
      localStorage.setItem('tecchess-theme', theme);
    } catch {
      // localStorage may be unavailable in privacy modes.
    }
  }
  updateThemeButton();
}

function applyStaticTranslations(): void {
  const info = languageInfo(lang);
  document.documentElement.lang = info.htmlLang;
  document.title = t(lang, 'document.title');
  metaDescription.content = t(lang, 'meta.description');
  languageMenu.setAttribute('aria-label', t(lang, 'language.toggle'));

  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    element.textContent = t(lang, element.dataset.i18n as MessageKey);
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
    element.innerHTML = t(lang, element.dataset.i18nHtml as MessageKey);
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    element.setAttribute('aria-label', t(lang, element.dataset.i18nAriaLabel as MessageKey));
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    element.setAttribute('title', t(lang, element.dataset.i18nTitle as MessageKey));
  }
  updateThemeButton();
}

function updateLanguageUI(): void {
  languageCurrent.textContent = languageInfo(lang).short;
  for (const item of languageMenu.querySelectorAll<HTMLElement>('[data-lang]')) {
    const active = item.dataset.lang === lang;
    item.classList.toggle('active', active);
    item.setAttribute('aria-checked', String(active));
  }
}

function setLanguageMenu(open: boolean): void {
  languageMenu.hidden = !open;
  languageButton.setAttribute('aria-expanded', String(open));
}

function setLanguage(next: Language, persist = true): void {
  lang = next;
  if (persist) {
    try {
      localStorage.setItem('tecchess-lang', next);
    } catch {
      // localStorage may be unavailable in privacy modes.
    }
  }
  applyStaticTranslations();
  updateLanguageUI();
  renderPanel();
}

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
    log.push({
      color: game.turn,
      piece: mover,
      orig,
      dest,
      captured: applied.captured,
      fused: applied.fused,
      split: applied.split,
      splitRole: applied.split && appliedMode && appliedMode !== 'whole' ? appliedMode : undefined,
    });
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

function formatMove(entry: LogEntry): string {
  const color = t(lang, entry.color === 'white' ? 'color.white' : 'color.black');
  const splitRole = entry.splitRole ? roleLabel(entry.splitRole, lang) : undefined;
  let text = `${color} ${pieceLabel(entry.piece, lang)} ${entry.orig}${
    entry.captured ? '×' : '–'
  }${entry.dest}`;
  if (entry.fused) text += ` · ${t(lang, 'log.fused')}`;
  if (entry.split) {
    text += ` · ${splitRole ? t(lang, 'log.splitOnly', { role: splitRole }) : t(lang, 'log.split')}`;
  }
  if (entry.captured) text += t(lang, 'log.capture', { role: roleLabel(entry.captured.role, lang) });
  return text;
}

function renderPanel(st: FusionStatus = fusionStatus(game)): void {
  turnEl.textContent = t(lang, game.turn === 'white' ? 'turn.white' : 'turn.black');
  turnEl.className = `turn ${game.turn}`;

  const winner = t(lang, game.turn === 'white' ? 'color.black' : 'color.white');
  if (st.checkmate) {
    statusEl.textContent = t(lang, 'status.checkmate', { winner });
    statusEl.className = 'state checkmate';
  } else if (st.stalemate) {
    statusEl.textContent = t(lang, 'status.stalemate');
    statusEl.className = 'state stalemate';
  } else if (st.inCheck) {
    statusEl.textContent = t(lang, 'status.check');
    statusEl.className = 'state check';
  } else {
    statusEl.textContent = t(lang, 'status.playing');
    statusEl.className = 'state';
  }

  const piece = selected ? game.pieces.get(selected) : undefined;
  if (piece && selected) {
    const color = t(lang, game.turn === 'white' ? 'color.white' : 'color.black');
    let hint = t(lang, 'selection.hintTarget');
    if (piece.fusion) {
      hint = fusedClicks === 1 ? t(lang, 'selection.hintFused1') : t(lang, 'selection.hintFused2');
    }
    selectionEl.textContent =
      t(lang, 'selection.selected', {
        square: selected,
        color,
        piece: pieceLabel(piece, lang),
      }) + hint;
  } else {
    selectionEl.textContent = t(lang, 'selection.empty');
  }

  modesEl.innerHTML = '';
  if (piece?.fusion) {
    const steps: [string, string, boolean][] = [
      ['1', t(lang, 'mode.step1'), fusedClicks === 1],
      ['2', t(lang, 'mode.step2'), fusedClicks === 2],
      ['3', t(lang, 'mode.step3'), false],
    ];
    for (const [num, label, active] of steps) {
      const step = document.createElement('div');
      step.className = active ? 'mode active' : 'mode';
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
    empty.textContent = t(lang, 'moves.empty');
    logEl.appendChild(empty);
  } else {
    for (const entry of log) {
      const item = document.createElement('li');
      item.textContent = formatMove(entry);
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

let themeAnimationTimer: number | undefined;
themeToggle.addEventListener('click', () => {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  themeToggle.classList.remove('theme-animating');
  // Restart the CSS animation on every click, even before the previous one ends.
  void themeToggle.offsetWidth;
  themeToggle.classList.add('theme-animating');
  window.clearTimeout(themeAnimationTimer);
  themeAnimationTimer = window.setTimeout(() => {
    themeToggle.classList.remove('theme-animating');
  }, 520);
});

languageButton.addEventListener('click', event => {
  event.stopPropagation();
  setLanguageMenu(languageMenu.hidden !== false);
});
languageMenu.addEventListener('click', event => {
  event.stopPropagation();
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-lang]');
  const value = target?.dataset.lang ?? null;
  if (isLanguage(value)) setLanguage(value);
  setLanguageMenu(false);
  languageButton.focus();
});
document.addEventListener('click', () => setLanguageMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !languageMenu.hidden) {
    setLanguageMenu(false);
    languageButton.focus();
  }
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

applyStaticTranslations();
updateLanguageUI();
setTheme(currentTheme(), false);
loadPosition(LAB);
