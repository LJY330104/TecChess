import * as cg from './types.js';
import { invRanks, pos2key } from './util.js';

export const initial: cg.FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const roles: Record<string, cg.Role> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

const letters: Record<cg.Role, string> = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k',
};

export function read(fen: cg.FEN): cg.Pieces {
  if (fen === 'start') fen = initial;
  const pieces: cg.Pieces = new Map();
  let row = 7,
    col = 0;
  for (let i = 0; i < fen.length; ++i) {
    const c = fen[i];
    switch (c) {
      case ' ':
      case '[':
        return pieces;
      case '/':
        --row;
        if (row < 0) return pieces;
        col = 0;
        break;
      case '~': {
        const k = pos2key([col - 1, row]);
        const piece = k && pieces.get(k);
        if (piece) piece.promoted = true;
        break;
      }
      default: {
        const nb = c.charCodeAt(0);
        if (nb < 57) col += nb - 48;
        else {
          const role = c.toLowerCase();
          const pieceRole = roles[role];
          if (!pieceRole) {
            ++col;
            break;
          }
          const piece: cg.Piece = {
            role: pieceRole,
            color: c === role ? 'black' : 'white',
          };
          // A fused piece is written as two role letters joined by '+' in the
          // board field, e.g. `K+R` for a white king-rook.
          if (fen[i + 1] === '+') {
            const fusedRole = roles[fen[i + 2]?.toLowerCase()];
            if (fusedRole) {
              piece.fusion = fusedRole;
              i += 2;
            }
          }
          const key = pos2key([col, row]);
          if (key) pieces.set(key, piece);
          ++col;
        }
      }
    }
  }
  return pieces;
}

export function write(pieces: cg.Pieces): cg.FEN {
  return invRanks
    .map(y =>
      cg.files
        .map(x => {
          const piece = pieces.get((x + y) as cg.Key);
          if (piece) {
            let p = letters[piece.role];
            if (piece.fusion) p += '+' + letters[piece.fusion];
            if (piece.color === 'white') p = p.toUpperCase();
            if (piece.promoted) p += '~';
            return p;
          } else return '1';
        })
        .join(''),
    )
    .join('/')
    .replace(/1{2,}/g, s => s.length.toString());
}
