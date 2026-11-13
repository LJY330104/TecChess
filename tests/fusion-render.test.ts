import { Chessground } from '../src/chessground';

describe('fused piece rendering', () => {
  test('renders the primary role and a fused badge class', () => {
    const el = document.createElement('div');
    el.style.width = '400px';
    el.style.height = '400px';
    document.body.appendChild(el);

    const cg = Chessground(el, {
      fen: '4k3/8/8/8/8/8/8/K+R7 w - - 0 1',
      animation: { enabled: false },
    });

    const piece = el.querySelector<HTMLElement>('piece.king.fused-rook.white');
    expect(piece).toBeTruthy();
    expect(cg.getFen()).toEqual('4k3/8/8/8/8/8/8/K+R7');

    cg.destroy();
    el.remove();
  });
});
