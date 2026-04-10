# cPanel（HostSilo）部署说明

目标：把仓库里的 `deploy-test/` 目录部署到你的站点目录（通常是 `public_html/deploy-test/`），用于验证自动部署是否生效。

## 方式 A：GitHub Actions（FTP 推送）

适合：你希望“推代码到 GitHub 就自动发布到服务器”。

1. 在 GitHub 仓库设置里添加 Actions Secrets（Settings → Secrets and variables → Actions → New repository secret）：
   - `CPANEL_FTP_SERVER`：例如 `cp1.hostsilo.com`
   - `CPANEL_FTP_USERNAME`：你的主机账号
   - `CPANEL_FTP_PASSWORD`：你的主机密码

2. 确保默认分支是 `main`（或把工作流里分支名改成你的实际分支）。

3. 推送代码后，GitHub Actions 会把 `deploy-test/` 上传到服务器的 `public_html/deploy-test/`。

访问验证：
- `https://你的域名/deploy-test/`
- 或 `https://你的域名/deploy-test/index.html`

## 方式 B：cPanel 自带 Git 部署（从 cPanel 拉取）

适合：你希望“在 cPanel 里配置一次，之后每次拉取就发布”。不同主机面板细节可能略有差异。

常见路径：cPanel → Git Version Control → Create。

建议配置：
- Repo：选择/创建仓库（可用 GitHub 地址）。
- Clone Path：例如 `~/repositories/deploy-test`
- Deployment：设置发布路径为 `public_html/deploy-test`

完成后，更新仓库并触发 Deploy。

## 手动上传（兜底）

如果你只想先验证服务器目录没问题：
- cPanel → File Manager → 进入 `public_html` → 新建 `deploy-test` 文件夹 → 上传 `deploy-test/` 内所有文件。

