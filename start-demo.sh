#!/usr/bin/env bash
# 一键编译并启动科技象棋演示。
#
#   ./start-demo.sh
#   PORT=8080 ./start-demo.sh
#   OPEN=0 ./start-demo.sh     # 不自动打开浏览器
#
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}/index.html"

if ! command -v node >/dev/null 2>&1; then
  echo "错误：找不到 node，请先安装 Node.js（建议 20+）。" >&2
  exit 1
fi

if [ ! -x node_modules/.bin/tsc ]; then
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

echo "编译 TypeScript..."
node_modules/.bin/tsc --sourceMap --declaration

if ! command -v python3 >/dev/null 2>&1; then
  echo "错误：找不到 python3，无法启动静态文件服务器。" >&2
  exit 1
fi

python3 -m http.server "$PORT" --bind "$HOST" &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 0.5
if [ "${OPEN:-1}" != "0" ] && command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
fi

echo ""
echo "科技象棋演示已启动：${URL}"
echo "按 Ctrl+C 停止服务器。"
echo ""

wait "$SERVER_PID"
