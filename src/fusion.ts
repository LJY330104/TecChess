import type * as cg from './types.js';
import { key2pos, opposite, pos2key, squaresBetween } from './util.js';

/**
 * Fusion variant rules.
 *
 * Five pairs of same-coloured pieces may fuse when one of them moves onto the
 * other's square:
 *
 *   king + rook, king + bishop, king + knight, knight + bishop, knight + rook
 *
 * A fused piece is stored as a normal `cg.Piece` whose `fusion` field holds
 * the second role. It moves and captures as either of its roles. A move can
 * also move only one of the two roles, leaving the other one behind on the
 * origin square (a split).
 *
 * The module is UI independent: it only works on a {@link FusionGame}. The
 * board component can render the resulting pieces (the `fusion` field is
 * supported by `fen.ts` and `render.ts`).
 */

export type FusedRole = 'king' | 'rook' | 'bishop' | 'knight';

export type FusionPair = readonly [FusedRole, FusedRole];

/** The only pairs that may fuse. */
export const fusionPairs: readonly FusionPair[] = [
  ['king', 'rook'],
  ['king', 'bishop'],
  ['king', 'knight'],
  ['knight', 'bishop'],
  ['knight', 'rook'],
];

export type FusionMode = 'whole' | cg.Role;

export interface FusionGame {
  pieces: cg.Pieces;
  turn: cg.Color;
  /** Square that can be captured en passant, if any. */
  enPassant?: cg.Key;
  lastMove?: cg.Key[];
}

export interface AppliedMove {
  game: FusionGame;
  /** Piece removed by the move, if any. */
  captured?: cg.Piece;
  /** True when the move merged two pieces. */
  fused: boolean;
  /** True when only one part of a fused piece moved. */
  split: boolean;
}

export interface FusionStatus {
  inCheck: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

const priority: Record<FusedRole, number> = {
  king: 0,
  rook: 1,
  bishop: 2,
  knight: 3,
};

const isFusableRole = (role: cg.Role): role is FusedRole => role in priority;

const pairKey = (a: cg.Role, b: cg.Role): string => (a < b ? `${a}:${b}` : `${b}:${a}`);

const allowedPairs = new Set(fusionPairs.map(([a, b]) => pairKey(a, b)));

/** The roles a piece moves as. Fused pieces have two roles. */
export const rolesOf = (piece: cg.Piece): cg.Role[] =>
  piece.fusion ? [piece.role, piece.fusion] : [piece.role];

export const isFused = (piece: cg.Piece): piece is cg.Piece & { fusion: cg.Role } => !!piece.fusion;

export const hasRole = (piece: cg.Piece, role: cg.Role): boolean =>
  piece.role === role || piece.fusion === role;

/** True when both pieces are original (not fused yet) and their pair may fuse. */
export function canFuse(a: cg.Piece, b: cg.Piece): boolean {
  return (
    a.color === b.color &&
    !a.fusion &&
    !b.fusion &&
    a.role !== b.role &&
    isFusableRole(a.role) &&
    isFusableRole(b.role) &&
    allowedPairs.has(pairKey(a.role, b.role))
  );
}

/** Merge two pieces, or return undefined when they may not fuse. */
export function fusePieces(a: cg.Piece, b: cg.Piece): cg.Piece | undefined {
  if (!canFuse(a, b)) return undefined;
  const [primary, secondary] =
    priority[a.role as FusedRole] <= priority[b.role as FusedRole] ? [a, b] : [b, a];
  return {
    color: a.color,
    role: primary.role,
    fusion: secondary.role,
  };
}

/** Modes available for a piece: move it whole, or move one of its parts. */
export function moveModes(piece: cg.Piece): FusionMode[] {
  return piece.fusion ? ['whole', piece.role, piece.fusion] : ['whole'];
}

export const kingSquare = (pieces: cg.Pieces, color: cg.Color): cg.Key | undefined => {
  for (const [key, piece] of pieces) {
    if (piece.color === color && hasRole(piece, 'king')) return key;
  }
  return undefined;
};

const knightDeltas: readonly cg.Pos[] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const kingDeltas: readonly cg.Pos[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const rookDirs: readonly cg.Pos[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const bishopDirs: readonly cg.Pos[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const lastRank = (color: cg.Color, rank: number): boolean => (color === 'white' ? rank === 7 : rank === 0);

/**
 * Raw destinations of one role. `allowFusion` decides whether a friendly
 * occupied square is a legal destination (which merges the two pieces).
 */
function movesForRole(
  game: FusionGame,
  orig: cg.Key,
  role: cg.Role,
  allowFusion: (friend: cg.Piece) => boolean,
): cg.Key[] {
  const piece = game.pieces.get(orig);
  if (!piece) return [];
  if (role === 'pawn') return pawnMoves(game, orig, piece.color, allowFusion);

  const [x, y] = key2pos(orig);
  const pieces = game.pieces;
  const color = piece.color;
  const dests: cg.Key[] = [];

  const add = (nx: number, ny: number): boolean => {
    const key = pos2key([nx, ny]);
    if (!key) return false;
    const target = pieces.get(key);
    if (!target) {
      dests.push(key);
      return true;
    }
    if (target.color !== color || allowFusion(target)) dests.push(key);
    return false;
  };

  switch (role) {
    case 'knight':
      for (const [dx, dy] of knightDeltas) add(x + dx, y + dy);
      break;
    case 'king':
      for (const [dx, dy] of kingDeltas) add(x + dx, y + dy);
      break;
    case 'bishop':
      for (const [dx, dy] of bishopDirs) {
        for (let nx = x + dx, ny = y + dy; add(nx, ny); nx += dx, ny += dy);
      }
      break;
    case 'rook':
      for (const [dx, dy] of rookDirs) {
        for (let nx = x + dx, ny = y + dy; add(nx, ny); nx += dx, ny += dy);
      }
      break;
    case 'queen':
      for (const [dx, dy] of [...rookDirs, ...bishopDirs]) {
        for (let nx = x + dx, ny = y + dy; add(nx, ny); nx += dx, ny += dy);
      }
      break;
    default:
      break;
  }
  return dests;
}

function pawnMoves(
  game: FusionGame,
  orig: cg.Key,
  color: cg.Color,
  allowFusion: (friend: cg.Piece) => boolean,
): cg.Key[] {
  const [x, y] = key2pos(orig);
  const step = color === 'white' ? 1 : -1;
  const pieces = game.pieces;
  const dests: cg.Key[] = [];

  const one = pos2key([x, y + step]);
  if (one && !pieces.has(one)) {
    dests.push(one);
    const two = pos2key([x, y + step * 2]);
    const startRank = color === 'white' ? 1 : 6;
    if (y === startRank && two && !pieces.has(two)) dests.push(two);
  }

  for (const dx of [-1, 1]) {
    const dest = pos2key([x + dx, y + step]);
    if (!dest) continue;
    const target = pieces.get(dest);
    if (target) {
      if (target.color !== color || allowFusion(target)) dests.push(dest);
    } else if (game.enPassant === dest) {
      const capturedKey = pos2key([x + dx, y]);
      const captured = capturedKey && pieces.get(capturedKey);
      if (captured && captured.color !== color && captured.role === 'pawn') dests.push(dest);
    }
  }
  return dests;
}

/** All destinations of a move mode, ignoring king safety. */
export function rawDests(game: FusionGame, orig: cg.Key, mode: FusionMode): cg.Key[] {
  const piece = game.pieces.get(orig);
  if (!piece || piece.color !== game.turn) return [];

  const modes = rolesOf(piece);
  const roles: cg.Role[] = mode === 'whole' ? modes : modes.includes(mode) ? [mode] : [];
  if (!roles.length) return [];

  if (roles.length > 1) {
    // A whole fused piece can never merge with a third piece.
    return [...new Set(roles.flatMap(role => movesForRole(game, orig, role, () => false)))];
  }

  const moving: cg.Piece = { role: roles[0], color: piece.color };
  return movesForRole(game, orig, roles[0], friend => canFuse(moving, friend));
}

/** True when `key` is attacked by any piece of `byColor`. */
export function isAttacked(pieces: cg.Pieces, key: cg.Key, byColor: cg.Color): boolean {
  const [tx, ty] = key2pos(key);
  for (const [from, piece] of pieces) {
    if (piece.color !== byColor) continue;
    for (const role of rolesOf(piece)) {
      if (attacks(from, role, tx, ty, pieces)) return true;
    }
  }
  return false;
}

function attacks(from: cg.Key, role: cg.Role, tx: number, ty: number, pieces: cg.Pieces): boolean {
  const [fx, fy] = key2pos(from);
  switch (role) {
    case 'pawn': {
      const step = pieces.get(from)?.color === 'white' ? 1 : -1;
      return Math.abs(tx - fx) === 1 && ty === fy + step;
    }
    case 'knight':
      return knightDeltas.some(([dx, dy]) => fx + dx === tx && fy + dy === ty);
    case 'king':
      return kingDeltas.some(([dx, dy]) => fx + dx === tx && fy + dy === ty);
    case 'bishop':
      return (
        Math.abs(tx - fx) === Math.abs(ty - fy) &&
        tx !== fx &&
        squaresBetween(fx, fy, tx, ty).every(k => !pieces.has(k))
      );
    case 'rook':
      return (fx === tx) !== (fy === ty) && squaresBetween(fx, fy, tx, ty).every(k => !pieces.has(k));
    case 'queen':
      return (
        ((fx === tx) !== (fy === ty) || (Math.abs(tx - fx) === Math.abs(ty - fy) && tx !== fx)) &&
        squaresBetween(fx, fy, tx, ty).every(k => !pieces.has(k))
      );
  }
}

/** True when `color`'s king (or fused king) is attacked. */
export function isInCheck(game: FusionGame, color: cg.Color = game.turn): boolean {
  const king = kingSquare(game.pieces, color);
  return !!king && isAttacked(game.pieces, king, opposite(color));
}

/**
 * Apply a move. Returns undefined when the move is not a legal fusion-variant
 * move (including moves that leave the mover's king in check).
 */
export function applyMove(
  game: FusionGame,
  orig: cg.Key,
  dest: cg.Key,
  mode: FusionMode = 'whole',
): AppliedMove | undefined {
  if (orig === dest) return undefined;
  if (!rawDests(game, orig, mode).includes(dest)) return undefined;

  const piece = game.pieces.get(orig);
  if (!piece) return undefined;
  const destPiece = game.pieces.get(dest);
  if (destPiece && destPiece.color !== piece.color && hasRole(destPiece, 'king')) return undefined;

  const [ox, oy] = key2pos(orig);
  const [dx, dy] = key2pos(dest);
  const whole = mode === 'whole' || !piece.fusion;
  const split = !!piece.fusion && !whole;

  let placed: cg.Piece;
  let leftover: cg.Piece | undefined;
  if (whole) {
    placed = { ...piece };
    if (piece.role === 'pawn' && lastRank(piece.color, dy)) placed = { ...piece, role: 'queen' };
  } else {
    placed = { color: piece.color, role: mode };
    if (piece.fusion) {
      const otherRole = piece.role === mode ? piece.fusion : piece.role;
      leftover = { color: piece.color, role: otherRole };
    }
  }

  let captured: cg.Piece | undefined;
  let fused = false;
  if (destPiece) {
    if (destPiece.color === piece.color) {
      const merged = fusePieces(placed, destPiece);
      if (!merged) return undefined;
      placed = merged;
      fused = true;
    } else {
      captured = destPiece;
    }
  }

  const next = new Map(game.pieces);
  // En passant only concerns a whole pawn moving diagonally to an empty square.
  if (!captured && piece.role === 'pawn' && whole && ox !== dx && !destPiece) {
    if (game.enPassant !== dest) return undefined;
    const capturedKey = pos2key([dx, oy]);
    const enPassantPiece = capturedKey && next.get(capturedKey);
    if (!enPassantPiece || enPassantPiece.color === piece.color || enPassantPiece.role !== 'pawn')
      return undefined;
    next.delete(capturedKey);
    captured = enPassantPiece;
  }

  next.delete(orig);
  if (leftover) next.set(orig, leftover);
  next.set(dest, placed);

  const enPassant =
    piece.role === 'pawn' && whole && Math.abs(dy - oy) === 2 ? pos2key([ox, (oy + dy) / 2]) : undefined;

  return {
    game: {
      pieces: next,
      turn: opposite(game.turn),
      enPassant,
      lastMove: [orig, dest],
    },
    captured,
    fused,
    split,
  };
}

/** True when the move is legal, i.e. it does not leave the mover's king in check. */
export function isLegalMove(
  game: FusionGame,
  orig: cg.Key,
  dest: cg.Key,
  mode: FusionMode = 'whole',
): boolean {
  const piece = game.pieces.get(orig);
  if (!piece) return false;
  const applied = applyMove(game, orig, dest, mode);
  if (!applied) return false;
  const king = kingSquare(applied.game.pieces, piece.color);
  return !!king && !isAttacked(applied.game.pieces, king, opposite(piece.color));
}

/** Legal destinations for one move mode. */
export function legalDests(game: FusionGame, orig: cg.Key, mode: FusionMode = 'whole'): cg.Key[] {
  return rawDests(game, orig, mode).filter(dest => isLegalMove(game, orig, dest, mode));
}

/** Legal destinations for every mode of a piece. */
export function allLegalDests(game: FusionGame, orig: cg.Key): Map<FusionMode, cg.Key[]> {
  const piece = game.pieces.get(orig);
  if (!piece) return new Map();
  return new Map(moveModes(piece).map(mode => [mode, legalDests(game, orig, mode)]));
}

export function hasAnyLegalMove(game: FusionGame, color: cg.Color = game.turn): boolean {
  if (color !== game.turn) return false;
  for (const [orig, piece] of game.pieces) {
    if (piece.color !== color) continue;
    for (const mode of moveModes(piece)) {
      if (legalDests(game, orig, mode).length) return true;
    }
  }
  return false;
}

export function status(game: FusionGame): FusionStatus {
  const inCheck = isInCheck(game);
  const hasMove = hasAnyLegalMove(game);
  return {
    inCheck,
    checkmate: inCheck && !hasMove,
    stalemate: !inCheck && !hasMove,
  };
}
