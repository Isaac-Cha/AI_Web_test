# 留言表单安全升级

本次检查发现后台列表和详情已使用 React 文本插值，未发现留言字段的直接 HTML 渲染。收到脚本标签是一次注入探测，不能据此认定脚本已经执行。

## 已增加的防护

- 服务端统一限制姓名 100、联系方式 200、邮箱 254、留言 5000 字符；必填字段去除首尾空白，邮箱可留空，非空时验证格式。
- 只接收纯文本。拒绝 HTML 标签、实体编码后的 HTML、控制字符及未知字段；`meta` 限制为 4096 字节和有限嵌套，并检查键和值。普通中文、引号、`风险 < 2%` 等表达仍可提交。此校验是附加防护，不能替代输出转义。
- 在 JSON 解析前限制 `POST /api/submissions` 请求体为 32 KiB，包含未发送 Content-Length 的分块请求；不影响后台图片上传。
- 校验失败返回 422，超限返回 413，错误响应不回显用户输入。留言读写响应增加 `no-store` 和 `nosniff`。
- 留言列表仍需要管理员凭据，查询数量限制为 1–1000，类型限定为已知类型。
- 三个前端表单同步限制输入长度。历史记录仍保留原文，以 React 文本方式显示；不自动解析 HTML、反解实体或将链接转为可点击内容。
- `npm run build` 自动为静态首页插入 CSP，禁止任意外域脚本、内联事件、eval、插件和 base 标签。现有 JSON-LD 使用内容哈希放行；开发模式不应用此策略。Google 字体、HTTPS 图片和配置的 API 源仍可加载。CSP 是附加防护，不等于所有 XSS 都已排除。

## 验证

后端回归测试使用模拟数据库，不连接线上数据库：

```powershell
python -m pip install -r Emergent/backend/tests/requirements-security.txt
python -m pytest Emergent/backend/tests/test_submission_security.py -q
cd Emergent/frontend
npm ci
npm run test:security-policy
npm test -- --watchAll=false --runInBand
npm run build
```

前端测试向列表和详情注入历史脚本/图片事件/编码标签，确认没有生成对应脚本或图片节点。

可选的真实 Chromium 验证（所有 API 都模拟，不访问线上或探测域名）：

```powershell
python -m pip install playwright
python -m playwright install chromium
python Emergent/frontend/scripts/verify-security-browser.py
```

此测试加载生产构建，验证历史留言渲染，并检查 CSP 实际阻止外域脚本、内联脚本及图片事件处理器。

## 发布与验收

仓库现有 `Deploy site to VPS (build + SSH)` 工作流在前端改动推送到 main 时自动构建、上传静态文件。CSP 随 `build/index.html` 一同发布；需检查 Actions 成功，并在实际返回的 HTML 中确认策略存在。

**现有工作流不部署 Python 后端。** 服务器还必须同步 `Emergent/backend/server.py` 和新增的 `Emergent/backend/submission_security.py`，在现有虚拟环境安装后端依赖，按实际服务管理方式重启 API。此仓库没有可靠的后端服务路径和重启配置，因此不自动猜测或重启线上服务。

部署后通过正常页面提交一条测试留言并在后台检查；在受控环境使用 `probe.invalid`（保留的无效域名）回归测试，不访问原留言携带的外部脚本地址。已有恶意记录无需为显示安全而删除；如需调查，先保全数据库记录和服务器日志。

对高频垃圾提交，可在实际反向代理增加限速；必须确认真实客户端 IP 的可信代理配置，不能直接信任外部提供的 X-Forwarded-For。当前版本没有验证码或分布式限速，不声称能阻止全部扫描或垃圾留言。

参考：[OWASP XSS 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)、[MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)。
