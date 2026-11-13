#!/usr/bin/env bash
# 生成可部署的纯静态站点到 site/。
#
#   ./build-site.sh
#
# 产物：
#   site/index.html   科技象棋演示
#   site/app.js       打包后的应用
#   site/assets/*.css 棋盘与棋子样式
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "错误：找不到 node，请先安装 Node.js（建议 20+）。" >&2
  exit 1
fi

if [ ! -x node_modules/.bin/esbuild ]; then
  echo "安装依赖..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
  elif command -v npm >/dev/null 2>&1; then
    npm install
  else
    echo "错误：node_modules 不存在，且找不到 pnpm / npm。" >&2
    exit 1
  fi
fi

echo "打包静态站点到 site/ ..."
rm -rf site
mkdir -p site/assets

node_modules/.bin/esbuild src/fusion-demo.ts \
  --bundle \
  --format=esm \
  --target=es2020 \
  --minify \
  --outfile=site/app.js

cp assets/chessground.base.css \
  assets/chessground.brown.css \
  assets/chessground.cburnett.css \
  assets/chessground.fusion.css \
  site/assets/

# 本地 index.html 使用 tsc 产出的 dist/ 模块；静态站点使用单文件 bundle。
sed 's#src="\./dist/fusion-demo\.js"#src="./app.js"#' index.html > site/index.html
cp fusion.html site/fusion.html
touch site/.nojekyll

echo "完成：site/index.html"
