# 科技象棋（Fusion Chess）

这是构建在 Chessground 上的一个科技象棋变体实现。演示页面：[index.html](index.html)，一键启动脚本：[start-demo.sh](start-demo.sh)。

## 规则

同色的以下两子走到同一格时融合成一枚融合后的棋子：

- 王 + 车
- 王 + 象
- 王 + 马
- 马 + 象
- 马 + 车

融合后的棋子可以用两个原棋子中任意一个的走法移动和吃子。融合后的棋子还可以**分裂**：只移动其中一个子，另一个留在原格。

- 融合后的棋子不能再与第三枚棋子融合（不支持三合一）。
- 兵、后不参与融合。
- 融合后的棋子中的王仍然受将军规则约束。
- 不支持王车易位；兵到达底线自动升变为后。
- 支持吃过路兵。

## 数据表示

融合后的棋子仍然是一个普通的 `cg.Piece`，额外的角色放在 `fusion` 字段：

```ts
{ color: 'white', role: 'king', fusion: 'rook' }
```

`role` 是主角色，渲染时作为主图标；`fusion` 是副角色，渲染成右下角的小徽章。

FEN 里用 `+` 连接两个角色字母表示融合后的棋子，例如白方王车：

```
4k3/8/8/8/8/8/8/K+R7 w - - 0 1
```

## 规则 API

`src/fusion.ts` 是与 DOM 无关的规则模块：

```ts
import { applyMove, legalDests, moveModes, status, type FusionGame } from './fusion.js';

const game: FusionGame = {
  pieces: new Map([['a1', { color: 'white', role: 'king', fusion: 'rook' }]]),
  turn: 'white',
};

moveModes(game.pieces.get('a1')!); // ['whole', 'king', 'rook']
legalDests(game, 'a1', 'rook'); // 只动车（分裂）的合法目标格
applyMove(game, 'a1', 'a8', 'rook'); // 王留在 a1，车走到 a8
```

`FusionMode` 为 `'whole' | cg.Role`。`'whole'` 表示整体移动；传入 `'king'`、`'rook'` 等表示只移动该角色并分裂。

## 渲染

- `src/fen.ts` 支持读写融合后的棋子的 FEN。
- `src/render.ts` / `src/drag.ts` 会给融合后的棋子加上 `fused fused-<role>` class。
- `assets/chessground.fusion.css` 用 cburnett 棋子图给副角色加圆形徽章。页面中要在 `chessground.cburnett.css` 之后加载它。

## 与 Chessground 集成

科技象棋演示使用 `Chessground` 的 `movable.dests` 来提供合法目标格。接入时建议：

- `autoCastle: false`：变体不支持王车易位，否则普通王走到普通车旁边可能会触发 Chessground 的自动易位动画。
- `premovable: { enabled: false }`：Chessground 内置的 premove 计算不认识融合后的棋子。
- 在 `movable.events.after` 里用 `fusion.applyMove(...)` 更新你的游戏状态，再通过 `board.set({ fen, turnColor, lastMove, check, movable: { dests } })` 同步棋盘。
- 演示页用连点切换整体/分裂；引擎 API 仍然需要显式传入 `'whole'` 或具体角色。

## 静态部署

生成纯静态站点：

```sh
./build-site.sh
```

产物在 `site/`，可以直接拖到 Netlify Drop、对象存储或任意静态托管。`site/` 已加入 `.gitignore`。

仓库自带两种部署配置：

- GitHub Pages：`.github/workflows/pages.yml`，push 到 `master` 后自动构建并发布到 `https://<用户名>.github.io/TecChess/`。首次需要在仓库 Settings → Pages 里允许 GitHub Actions（工作流也尝试用 `configure-pages` 自动开启）。
- Netlify：`netlify.toml` 已配置 `bash build-site.sh` 和发布目录 `site`。

## 运行演示

```sh
./start-demo.sh
```

脚本会自动安装缺失依赖、编译 TypeScript、在 `127.0.0.1:8000` 启动静态服务器并打开浏览器。
按 `Ctrl+C` 停止。

可选环境变量：

```sh
PORT=8080 ./start-demo.sh   # 换端口
OPEN=0 ./start-demo.sh      # 不自动打开浏览器
```

也可以手动运行：

```sh
pnpm install
pnpm compile
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000/index.html`。

演示页默认加载“融合实验室”局面，直接可以演示五种融合：

- 王 e4 + 车 d4
- 王 e4 + 象 e5
- 王 e4 + 马 d5
- 象 g4 + 马 f3
- 车 h3 + 马 f3

把可融合的友方棋子点到另一枚棋子上即可融合。演示页只使用点击操作：第 1 下点融合后的棋子 = 融合走子（两子一起走），第 2 下 = 分裂走子（显示两部分全部融合轨迹，走子后按目标格决定只动哪个），第 3 下 = 取消选择。若两个子都能到达目标格，优先移动主角色（王车/王象中的王，马象/马车中的马）。
