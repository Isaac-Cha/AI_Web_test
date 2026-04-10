# VPS（SSH）部署说明

目标：把仓库里的 `deploy-test/` 目录发布到你的 VPS 上的 Web 根目录下，以便通过浏览器访问 `.../deploy-test/`。

## CentOS 8 Stream 最快可用部署（Nginx）

如果你是干净系统、从未安装过任何软件，按下面命令执行即可把网页跑起来。

1) 安装并启动 Nginx：

```bash
dnf -y update
dnf -y install nginx
systemctl enable --now nginx
```

2) 放行 80 端口（如果启用了防火墙 firewalld）：

```bash
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```

3) 把部署目录设为 Nginx 默认站点目录（推荐）：

- Nginx 默认 Web 根目录通常是：`/usr/share/nginx/html`
- 因此建议把 GitHub Secrets `VPS_TARGET_DIR` 设置为：`/usr/share/nginx/html/deploy-test`

4) 访问验证：

```text
http://103.143.81.115/deploy-test/
```

如果还是打不开，先看 Nginx 状态与日志：

```bash
systemctl status nginx --no-pager
journalctl -u nginx -n 200 --no-pager
```

## 宝塔面板（BT）+ Nginx：出现“没有找到站点”说明什么

你现在看到的“没有找到站点”，通常表示：

- Nginx 已经在工作，但当前请求没有命中你创建的站点配置（命中了宝塔的默认站点）；或
- 站点配置没有生效（Nginx 未重载/配置测试不通过）；或
- 域名解析没指到这台服务器（但你这里域名访问也看到同样页面，说明大概率已指向）。

在宝塔面板里按这个顺序检查：

1) 网站 → 选择你的站点 → 设置 → 域名管理
- 确认同时添加：`cg-fintech.com` 和 `www.cg-fintech.com`（很多人漏了 `www`）
- 确认端口是 `80`

2) 网站 → 设置 → 配置文件
- 确认里面有 `server_name cg-fintech.com www.cg-fintech.com;`

3) 软件商店 → Nginx → 设置
- 点“重载配置/重启”
- 或在 SSH 上执行：

```bash
nginx -t
systemctl reload nginx
```

4) 用命令强制带 Host 头验证是否命中站点（最可靠）：

```bash
curl -I http://127.0.0.1/ -H 'Host: cg-fintech.com'
curl -I http://127.0.0.1/deploy-test/ -H 'Host: cg-fintech.com'
```

如果第 4 步返回的还是“没有找到站点”，说明站点配置确实没命中，需要回到第 1/2/3 步继续排查。

## 访问出现 500 Privoxy Error 的处理

你访问 `http://<IP>/...` 返回 “Privoxy 500”，通常表示：

- 80 端口被 `privoxy`（或类似代理软件）占用了；或
- 上游/系统里有一个代理服务在拦截请求；而你的 VPS 还没有正确对外提供 Web 服务。

先在 VPS 上确认到底是谁在监听 80：

```bash
ss -lntp | grep ':80'
```

如果看到 `privoxy`：

```bash
systemctl status privoxy --no-pager
systemctl stop privoxy
systemctl disable privoxy
```

然后确保 Nginx 正在监听 80：

```bash
systemctl enable --now nginx
ss -lntp | grep ':80'
curl -I http://127.0.0.1/
```

如果 `curl -I http://127.0.0.1/` 正常，但外网仍不通，多半是防火墙/安全组没放行：

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```

## 你需要先确认的两件事

1. 你的 VPS 上是否已安装并运行 Web 服务器（Nginx 或 Apache）。
2. 站点根目录在哪里：
   - Nginx/Apache 常见为：`/var/www/html`

说明：对 Nginx 来说更常见的是 `/usr/share/nginx/html`，本文后续示例也以它为优先。

如果你不确定根目录，建议先在 VPS 上执行：

```bash
ls -la /var/www/html
```

## 方式 A：GitHub Actions 自动部署（SCP）

工作流文件：`.github/workflows/deploy-vps-ssh.yml`

站点发布工作流（构建 Vite 产物并发布到站点根目录）：`.github/workflows/deploy-site-vps.yml`

在 GitHub 仓库中添加 Actions Secrets：

- `VPS_HOST`：服务器 IP 或域名（例如 `103.143.81.115`）
- `VPS_PORT`：SSH 端口（例如 `43621`）
- `VPS_USER`：SSH 用户（例如 `root`）
- `VPS_PASSWORD`：SSH 密码
- `VPS_TARGET_DIR`：远端目标目录（推荐设置为 Web 根目录下的发布目录）
  - 示例（Nginx 常见）：`/usr/share/nginx/html/deploy-test`
  - 示例（Apache 常见）：`/var/www/html/deploy-test`
  - 示例（宝塔常见）：`/www/wwwroot/你的站点目录/deploy-test`

如果你要发布整个网站（React/Vite 构建产物），再新增一个 Secret：
- `VPS_SITE_TARGET_DIR`：站点根目录（宝塔常见：`/www/wwwroot/cg-fintech.com/`）

说明：
- `deploy-vps-ssh.yml` 负责上传 `deploy-test/`（用于自动部署测试页）
- `deploy-site-vps.yml` 负责 `npm ci && npm run build`，然后上传 `dist/` 到 `VPS_SITE_TARGET_DIR`

你截图里的宝塔站点根目录分别是：
- `cg-fintech.com`：`/www/wwwroot/cg-fintech.com`
- `www.cg-fintech.com`：`/www/wwwroot/wwwcg-fintech.com`

如果你只想先验证自动部署，建议先选一个主域名站点作为发布目标，例如设置：
- `VPS_TARGET_DIR`：`/www/wwwroot/cg-fintech.com/deploy-test`

推送到 `main` 分支后，会自动把 `deploy-test/` 上传到 `VPS_TARGET_DIR`。

如果你不熟悉 Git，也可以在 GitHub 仓库的 Actions 页面手动点击运行该工作流（已支持手动触发）。

### 如果部署成功但访问仍然 404

最常见原因是：文件没有落在你期望的目录。

在宝塔面板验证路径：
- 文件 → 进入：`/www/wwwroot/cg-fintech.com/deploy-test/`
- 你应该能看到：`index.html`、`health.txt`、`assets/`

如果你看到的是：`/www/wwwroot/cg-fintech.com/deploy-test/deploy-test/index.html`（多了一层 `deploy-test`），那就会导致访问 `.../deploy-test/` 仍然 404。

此时做法：
- 修改工作流上传规则（已在本仓库修复为去掉多余目录层级），或
- 临时手动把内层 `deploy-test/` 里的文件移动到上一层目录。

### 单页应用（多路由）刷新 404 的处理

如果你的网站使用前端路由（例如 `/platform`、`/ea` 等），部署后首页可打开但刷新子路径出现 404，需要在宝塔 Nginx 的站点配置里加一条回退到 `index.html` 的规则：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

访问验证（示例）：
- `http://<你的IP或域名>/deploy-test/`

## 方式 B：本地手动上传（SCP）

在你的电脑上执行（示例路径）：

```bash
scp -P 43621 -r deploy-test root@103.143.81.115:/var/www/html/
```

如果你是 Nginx 默认目录，也可以传到：

```bash
scp -P 43621 -r deploy-test root@103.143.81.115:/usr/share/nginx/html/
```

然后访问：
- `http://103.143.81.115/deploy-test/`

## 安全建议（强烈）

- 不建议长期使用 `root + 密码` 进行自动部署。
- 建议改为 SSH Key：创建一个专用部署用户，限制权限只写入站点目录。
- 至少确保 SSH 禁止密码登录或开启 Fail2ban，并开启防火墙只放行必要端口。
