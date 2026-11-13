# 后端部署速查（FastAPI + MongoDB + Nginx）

> 适用于当前生产服务器：野草云香港 VPS / CentOS Stream 8。
> 换服务器时，按本文从上到下执行即可。

## 一、架构链路

```
浏览器 https://cg-fintech.com/api/...
        ↓
宝塔 Nginx（80/443，SSL）—— location ^~ /api/ 反向代理
        ↓
127.0.0.1:8000  FastAPI（uvicorn）
        ↓
MongoDB 127.0.0.1:27017  数据库 emergent
```

前端为纯静态文件，由 Nginx 直接从站点根目录提供。后端只监听本机 8000，不直接对外暴露。

## 二、环境与路径速查

| 项 | 值 |
|---|---|
| 服务器 IP | `68.64.181.140` |
| SSH 端口 | `36461` |
| 系统 | CentOS Stream 8（x86_64） |
| 域名 | `cg-fintech.com` + `www.cg-fintech.com` |
| 仓库 | `git@github.com:Isaac-Cha/AI_Web_test.git` |
| 代码目录（仓库根） | `/opt/emergent/Emergent` |
| 后端目录 | `/opt/emergent/Emergent/Emergent/backend` |
| 虚拟环境 | `/opt/emergent/Emergent/Emergent/backend/.venv` |
| 环境变量文件 | `/opt/emergent/Emergent/Emergent/backend/.env` |
| systemd 服务 | `/etc/systemd/system/emergent-api.service` |
| 站点根目录 | `/www/wwwroot/cg-fintech.com` |
| Nginx | 宝塔安装，`/www/server/nginx/`，版本 1.26.x |
| MongoDB | 7.x，配置文件 `/etc/mongod.conf`，监听 `127.0.0.1:27017` |

> 注意目录有三层嵌套：`/opt/emergent/Emergent`（clone 出来的仓库根）→ `Emergent/`（项目根）→ `backend/`。

## 三、环境变量 `.env`

路径：`/opt/emergent/Emergent/Emergent/backend/.env`

```ini
MONGO_URL=mongodb://127.0.0.1:27017
DB_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=emergent
DB_NAME=emergent
ADMIN_TOKEN=<后台登录令牌>
COS_BUCKET=<你的 bucket 名>
COS_REGION=<如 ap-chengdu>
COS_SECRET_ID=<腾讯云 SecretId>
COS_SECRET_KEY=<腾讯云 SecretKey>
COS_PREFIX=images
```

要点：

- **必须同时保留两套 Mongo 变量名**：`server.py` 读 `MONGO_URL` / `DB_NAME`；`tools/seed_content.py` 优先读 `DB_URI` / `DB_NAME`，其次 `MONGO_URL`，但**不接受 `MONGO_DB_NAME`**，所以 `DB_NAME` 不能省。
- `.env` 的值**不要加引号、不要留行尾空格**，否则 systemd 注入后会带进不可见字符导致鉴权失败。
- `ADMIN_TOKEN` 就是网站后台 `/admin` 的登录令牌，也是所有 `/api/admin/*` 接口的鉴权凭证。
- 改完 `.env` 必须重启后端：`systemctl restart emergent-api`。

权限收紧：

```bash
chmod 600 /opt/emergent/Emergent/Emergent/backend/.env
```

## 四、systemd 服务

文件：`/etc/systemd/system/emergent-api.service`

```ini
[Unit]
Description=Emergent FastAPI
After=network.target mongod.service

[Service]
Type=simple
WorkingDirectory=/opt/emergent/Emergent/Emergent/backend
EnvironmentFile=/opt/emergent/Emergent/Emergent/backend/.env
ExecStart=/opt/emergent/Emergent/Emergent/backend/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=2
User=root

[Install]
WantedBy=multi-user.target
```

启用：

```bash
systemctl daemon-reload
systemctl enable --now emergent-api
systemctl status emergent-api --no-pager
```

## 五、Nginx 站点配置

宝塔 → 网站 → `cg-fintech.com` → 设置 → 配置文件，`server {}` 内需要有：

```nginx
# SPA 回退：让 /admin、/ea/xxx 等前端路由刷新不 404
location / {
  try_files $uri $uri/ /index.html;
}

# 后端反代：proxy_pass 末尾不能加 '/'，否则 /api 前缀会被剥离
location ^~ /api/ {
  proxy_pass http://127.0.0.1:8000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

改完检查并重载：

```bash
nginx -t && systemctl reload nginx
```

## 六、从零部署步骤（换新服务器时照做）

### 1) 系统基础

```bash
# 修复镜像源与 DNS（CentOS 8 常见问题）
cat > /etc/resolv.conf <<'EOF'
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 223.5.5.5
EOF

dnf config-manager --set-disabled extras-common
dnf makecache

# 基础软件
dnf install -y git python3.11 python3.11-devel python3-pip
```

> 若出现 `BDB0091 DB_VERSION_MISMATCH` 或 `Waiting for process with pid ...`：先 `cd /root`，再清理 rpmdb 锁文件后 `rpm --rebuilddb`。

### 2) 宝塔面板 + Nginx

宝塔安装完成后，软件商店只装 **Nginx**（不要装 LNMP/LAMP 一键包，避免和系统包冲突）。

### 3) MongoDB 7

```bash
cat > /etc/yum.repos.d/mongodb-org-7.0.repo <<'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

dnf install -y mongodb-org
systemctl enable --now mongod

# 验证
mongosh --host 127.0.0.1 --port 27017 --eval "db.runCommand({ping:1})"
```

`/etc/mongod.conf` 确认只监听本机：

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
```

### 4) 拉代码

```bash
mkdir -p /opt/emergent && cd /opt/emergent
git clone git@github.com:Isaac-Cha/AI_Web_test.git Emergent
cd /opt/emergent/Emergent/Emergent/backend
```

### 5) venv 与依赖

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

依赖清单见 `Emergent/backend/requirements.txt`（含 `fastapi==0.110.1`、`uvicorn==0.25.0`、`motor==3.3.1`、`pymongo==4.5.0`、`cos-python-sdk-v5>=1.9.30` 等）。

### 6) 写 `.env`

按第三节内容创建，然后 `chmod 600 .env`。

### 7) 初始化数据（种子）

```bash
cd /opt/emergent/Emergent/Emergent/backend
source .venv/bin/activate

DB_URI='mongodb://127.0.0.1:27017' \
DB_NAME='emergent' \
MONGO_URL='mongodb://127.0.0.1:27017' \
python tools/seed_content.py
```

正常输出形如：

```
{'eas': 2, 'indicators': 3, 'tutorials': 2, 'articles': N}
```

种子文件：`Emergent/backend/seed/seed_eas.json`、`seed_indicators.json`、`seed_tutorials.json`、`seed_articles.json`。

### 8) 常驻后端

按第四节创建 systemd 服务并 `enable --now`。

### 9) 宝塔建站点 + SSL

- 添加站点，域名同时绑 `cg-fintech.com` 和 `www.cg-fintech.com`，根目录 `/www/wwwroot/cg-fintech.com`，PHP 选「纯静态」
- SSL 申请 Let's Encrypt，成功后开启「强制 HTTPS」
- 按第五节写入 SPA + 反代配置

### 10) 云厂商安全组 / 防火墙

入站放行：`80`、`443`（全网）、SSH 端口（建议限制来源 IP）、宝塔面板端口 `8888`（建议只放自己公网 IP）。

## 七、日常运维命令

```bash
# 后端状态与日志
systemctl status emergent-api --no-pager
journalctl -u emergent-api -n 100 --no-pager

# 重启后端（改完 .env 必须做）
systemctl restart emergent-api

# 本机自测（不经 Nginx）
curl -sS http://127.0.0.1:8000/api/health

# 经 Nginx 自测
curl -k -sS https://127.0.0.1/api/health -H 'Host: cg-fintech.com'

# 数据库
systemctl status mongod --no-pager
mongosh --host 127.0.0.1 --port 27017 --eval "db.getSiblingDB('emergent').eas.countDocuments()"

# Nginx
nginx -t && systemctl reload nginx

# 查看后台令牌（只打印值）
grep '^ADMIN_TOKEN=' /opt/emergent/Emergent/Emergent/backend/.env | cut -d= -f2-
```

## 八、更新后端代码

```bash
cd /opt/emergent/Emergent
git pull
cd Emergent/backend
source .venv/bin/activate
pip install -r requirements.txt      # 仅在依赖有变化时需要
systemctl restart emergent-api
curl -sS http://127.0.0.1:8000/api/health
```

前端更新不需要登录服务器：push 到 `main` 后由 GitHub Actions 工作流 `deploy-site-vps.yml` 构建并 SCP 覆盖站点目录。所需 Secrets：

- `VPS_HOST`、`VPS_PORT`、`VPS_USER`、`VPS_PASSWORD`
- `VPS_SITE_TARGET_DIR` = `/www/wwwroot/cg-fintech.com`

## 九、常见问题排查

| 现象 | 原因 | 处理 |
|---|---|---|
| `KeyError: 'DB_NAME'` | `.env` 缺 `DB_NAME`（只写了 `MONGO_DB_NAME`） | 补 `DB_NAME=emergent` 后重启 |
| `ADMIN_TOKEN is not configured` | `.env` 未设或值为空 | 设置后重启 |
| 后端启动即退出 | `.env` 值带引号/空格，或路径不对 | `cat -A .env` 检查行尾，`journalctl` 看真实报错 |
| `address already in use` | 8000 被旧进程或 systemd 占用 | `ss -lntp \| grep ':8000'` 查 PID，`systemctl restart emergent-api` |
| 站点刷新子路由 404 | 缺 SPA `try_files` | 补 `location /` 规则 |
| `/api` 返回 404 且后端正常 | `proxy_pass` 末尾多了 `/` 导致路径剥离 | 去掉末尾 `/` |
| 接口 401 | Token 不匹配（含首尾空格） | 重新从 `.env` 复制，或重置 Token |
| `Updating the path 'created_at' would create a conflict` | seed 脚本 `$set` 与 `$setOnInsert` 同时写 `created_at` | 已在 `tools/seed_content.py` 修复为 `{'$set': doc}` |

## 十、待补强项

- **数据库备份**：目前无自动备份。建议用宝塔「计划任务」定期 `mongodump` 并打包回传腾讯云 COS。
- **健康监控**：可加一条 crontab，每 5 分钟探测 `/api/health`，失败自动 `systemctl restart emergent-api`。
- **安全**：建议把 SSH 改为密钥登录；宝塔面板端口限制来源 IP；后端已只监听本机，无需额外改动。
