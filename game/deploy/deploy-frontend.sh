#!/usr/bin/env bash
# ============================================================
# deploy-frontend.sh: 办二游戏前端独立部署脚本（零侵入主站）
# 用法:
#   1. 在 VPS: cd /tmp && bash deploy-frontend.sh
#   2. 或在本地 build 完 scp 到 /www/wwwroot/cg-fintech.com/game/
# 流程:
#   clone / 拉最新仓库 → cd game/frontend → yarn install → yarn build
#   → rsync build/* 到 /www/wwwroot/cg-fintech.com/game/
#   → 不触碰任何 /www/wwwroot/cg-fintech.com 下除 game/ 之外的文件
# ============================================================
set -euo pipefail

SITE_ROOT="/www/wwwroot/cg-fintech.com"
GAME_WEB_ROOT="${SITE_ROOT}/game"
BACKEND_ROOT="${SITE_ROOT}/game-backend"
REPO_DIR="${REPO_DIR:-/opt/repos/Emergent}"   # 改成你真实仓库路径
FRONT_SRC="${REPO_DIR}/game/frontend"
BACK_SRC="${REPO_DIR}/game/backend"
NODE_VERSION="v20.11.0"                      # 如 nvm 则 nvm use

log() { echo -e "\033[36m[deploy-show-thumb]\033[0m $*"; }
step_ok() { echo -e "\033[32m OK\033[0m $*"; }
step_fail() { echo -e "\033[31m FAIL\033[0m $*"; exit 1; }

log "== Step 1: 站点目录确保存在 =="
mkdir -p "${GAME_WEB_ROOT}" "${BACKEND_ROOT}"
step_ok "GAME_WEB_ROOT=${GAME_WEB_ROOT}, BACKEND_ROOT=${BACKEND_ROOT}"

log "== Step 2: 更新 repo =="
if [ -d "${REPO_DIR}/.git" ]; then
  (cd "${REPO_DIR}" && git fetch --all --tags --prune && git reset --hard origin/main || git reset --hard origin/master)
else
  step_fail "REPO_DIR=${REPO_DIR} 不是 git 仓库，请先设置 REPO_DIR="
fi
step_ok "repo updated at $(cd ${REPO_DIR} && git rev-parse --short HEAD)"

log "== Step 3: 前端 build =="
(
  cd "${FRONT_SRC}"
  export NODE_OPTIONS="--max-old-space-size=4096"
  command -v yarn >/dev/null 2>&1 || npm i -g yarn
  # 允许借主站 node_modules（主站没装依赖的话，还是装一次）
  yarn install --frozen-lockfile || yarn install
  yarn build
)
step_ok "frontend build finished"

log "== Step 4: 发布前端到 /game/（仅 rsync build/ 内容，不碰其他目录） =="
rsync -av --delete "${FRONT_SRC}/build/" "${GAME_WEB_ROOT}/"
chown -R www:www "${GAME_WEB_ROOT}"
step_ok "published ${GAME_WEB_ROOT}"

log "== Step 5: 发布后端代码（不会重启服务；如需重启请手动 systemctl restart show-thumb-api） =="
rsync -av --delete "${BACK_SRC}/" "${BACKEND_ROOT}/backend/"
cp "${REPO_DIR}/game/test_smoke.py" "${BACKEND_ROOT}/test_smoke.py" 2>/dev/null || true
chown -R www:www "${BACKEND_ROOT}"
if [ -f "${BACKEND_ROOT}/backend/requirements.txt" ]; then
  (cd "${BACKEND_ROOT}" &&
    [ -d /opt/venvs/show-thumb ] || python3 -m venv /opt/venvs/show-thumb
    /opt/venvs/show-thumb/bin/pip install -U pip
    /opt/venvs/show-thumb/bin/pip install -r backend/requirements.txt
  )
  step_ok "backend deps installed"
fi

log "== Step 6: 可选 - Nginx 配置片段位置提示 =="
log "Nginx location 片段:  ${REPO_DIR}/game/deploy/nginx-game-route.conf"
log "systemd 服务文件:     ${REPO_DIR}/game/deploy/show-thumb-api.service"
log "部署后手动执行: "
log "  sudo nginx -t && sudo systemctl reload nginx"
log "  sudo systemctl daemon-reload && sudo systemctl restart show-thumb-api"
step_ok "全流程完成"
