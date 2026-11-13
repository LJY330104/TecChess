import { read, write } from '../src/fen';
import {
  applyMove,
  canFuse,
  fusePieces,
  type FusionGame,
  fusionPairs,
  isInCheck,
  isLegalMove,
  legalDests,
  rawDests,
} from '../src/fusion';
import type * as cg from '../src/types';

const game = (fen: string, turn: cg.Color = 'white'): FusionGame => ({
  pieces: read(fen),
  turn,
});

describe('fusion FEN', () => {
  test('reads and writes a fused piece', () => {
    const pieces = read('4k3/8/8/8/8/8/8/K+R7 w - - 0 1');
    expect(pieces.get('a1')).toEqual({ color: 'white', role: 'king', fusion: 'rook' });
    expect(write(pieces)).toEqual('4k3/8/8/8/8/8/8/K+R7');
  });

  test('keeps promotion and fusion markers', () => {
    const pieces = read('4k3/8/8/8/8/8/8/K+N7 w - - 0 1');
    const piece = pieces.get('a1')!;
    piece.promoted = true;
    expect(write(pieces)).toEqual('4k3/8/8/8/8/8/8/K+N~7');
    expect(read(write(pieces)).get('a1')).toEqual(piece);
  });
});

describe('fusion pairs', () => {
  test.each(fusionPairs)('%s + %s can fuse in both orders', (a, b) => {
    const first: cg.Piece = { color: 'white', role: a };
    const second: cg.Piece = { color: 'white', role: b };
    expect(canFuse(first, second)).toBe(true);
    expect(canFuse(second, first)).toBe(true);
    expect(fusePieces(first, second)?.fusion).toBeDefined();
  });

  test('unlisted pairs and different colours do not fuse', () => {
    expect(canFuse({ color: 'white', role: 'king' }, { color: 'white', role: 'queen' })).toBe(false);
    expect(canFuse({ color: 'white', role: 'bishop' }, { color: 'white', role: 'rook' })).toBe(false);
    expect(canFuse({ color: 'white', role: 'king' }, { color: 'black', role: 'rook' })).toBe(false);
  });

  test('a fused piece cannot fuse again', () => {
    expect(
      canFuse({ color: 'white', role: 'king', fusion: 'rook' }, { color: 'white', role: 'knight' }),
    ).toBe(false);
  });
});

describe('fused movement', () => {
  test('moves as either role', () => {
    const g = game('7k/8/8/8/8/8/8/K+R7 w - - 0 1');
    const whole = rawDests(g, 'a1', 'whole');
    expect(whole).toContain('a8'); // rook move
    expect(whole).toContain('b2'); // king move
    expect(whole).toContain('h1'); // rook move
    expect(whole).not.toContain('b3'); // neither king nor rook
  });

  test('fuses by moving onto a compatible friendly piece', () => {
    const g = game('4k3/8/8/8/8/8/8/4KR2 w - - 0 1');
    expect(legalDests(g, 'e1', 'whole')).toContain('f1');
    const applied = applyMove(g, 'e1', 'f1', 'whole')!;
    expect(applied.fused).toBe(true);
    expect(applied.game.pieces.get('f1')).toEqual({
      color: 'white',
      role: 'king',
      fusion: 'rook',
    });
    expect(applied.game.pieces.has('e1')).toBe(false);
  });

  test('cannot land whole on a friendly piece', () => {
    const g = game('7k/8/8/8/8/8/8/K+RR6 w - - 0 1');
    expect(rawDests(g, 'a1', 'whole')).not.toContain('b1');
    expect(applyMove(g, 'a1', 'b1', 'whole')).toBeUndefined();
  });

  test('splits by moving one role only', () => {
    const g = game('7k/8/8/8/8/8/8/K+R7 w - - 0 1');
    const applied = applyMove(g, 'a1', 'a8', 'rook')!;
    expect(applied.split).toBe(true);
    expect(applied.game.pieces.get('a1')).toEqual({ color: 'white', role: 'king' });
    expect(applied.game.pieces.get('a8')).toEqual({ color: 'white', role: 'rook' });

    const kingMove = applyMove(g, 'a1', 'b2', 'king')!;
    expect(kingMove.game.pieces.get('a1')).toEqual({ color: 'white', role: 'rook' });
    expect(kingMove.game.pieces.get('b2')).toEqual({ color: 'white', role: 'king' });
  });

  test('captures with either role', () => {
    const g = game('r6k/8/8/8/8/8/8/K+R7 w - - 0 1');
    const whole = applyMove(g, 'a1', 'a8', 'whole')!;
    expect(whole.captured).toEqual({ color: 'black', role: 'rook' });
    expect(whole.game.pieces.get('a8')?.fusion).toBe('rook');

    const split = applyMove(g, 'a1', 'a8', 'rook')!;
    expect(split.captured).toEqual({ color: 'black', role: 'rook' });
    expect(split.game.pieces.get('a1')).toEqual({ color: 'white', role: 'king' });
    expect(split.game.pieces.get('a8')).toEqual({ color: 'white', role: 'rook' });
  });
});

describe('king safety', () => {
  test('attacks are detected through both roles', () => {
    const g = game('k7/8/8/8/8/2n+b5/8/4K3 w - - 0 1');
    // The black knight+bishop on c3 does not attack e1, but its bishop part
    // attacks e1 through d2. (White king on e1 is in check.)
    expect(isInCheck(g, 'white')).toBe(true);
  });

  test('a split may not leave the fused king in check', () => {
    const g = game('k3r3/8/8/8/8/8/4K+R3/8 w - - 0 1');
    expect(isInCheck(g, 'white')).toBe(true);
    expect(isLegalMove(g, 'e2', 'a2', 'rook')).toBe(false); // king stays on e2
    expect(isLegalMove(g, 'e2', 'e8', 'rook')).toBe(true); // capture the rook, king stays
    expect(isLegalMove(g, 'e2', 'f1', 'king')).toBe(true); // king escapes, rook stays
  });

  test('a fused king moves like its other role and may not land in check', () => {
    const g = game('k3r3/8/8/8/8/8/4K+R3/8 w - - 0 1');
    expect(isLegalMove(g, 'e2', 'e8', 'whole')).toBe(true); // capture the checking rook
    expect(isLegalMove(g, 'e2', 'e1', 'whole')).toBe(false); // still on the rook's file
    expect(isLegalMove(g, 'e2', 'd2', 'whole')).toBe(true);
  });
});

describe('normal movement still works', () => {
  test('pawns move and promote', () => {
    const g = game('7k/P7/8/8/8/8/8/7K w - - 0 1');
    expect(legalDests(g, 'a7', 'whole')).toContain('a8');
    const applied = applyMove(g, 'a7', 'a8', 'whole')!;
    expect(applied.game.pieces.get('a8')).toEqual({ color: 'white', role: 'queen' });
  });
});
