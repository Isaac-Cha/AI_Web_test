# 办二 Show Thumb - UI 重构 & 修复 V2 - 产品需求文档

## Overview
- **Summary**: 对办二游戏进行一轮 UI 布局重构 + 3 项功能修复 + 2 项功能新增。核心：以「牌桌」为基础容器，所有牌局相关内容（名字、牌数、4 家面板、出牌区、操作按钮、手牌）均收进牌桌内部；桌面外只保留 3 项全局控件（大厅 / 房间号 / 轮次描述）。解决浏览器缩放 67% 才能看全的问题。
- **Purpose**: 1）解决当前 1280×800 笔记本电脑需手动缩到 67% 才能看到全部组件的严重挤压，手机端同步；2）修复上供阶段的可见性 Bug（非庄家看不到"庄家收到 N 张"的背面占位 + 上供完成后手数仍 12 张）；3）补上 lastMode 显示时间太短的问题；4）修复 drawing 阶段无 2 还显示办二按钮的空显示；5）把 StatusBar 轮次 10 条文案抽成可编辑源码文件给用户直接改；6）结算后加入全员准备按钮再开新局。
- **Target Users**: 电脑端 1280/1366/1920 宽屏用户 + 手机横屏 667×375 竖屏 375×667 用户（真人 4 人 + AI 陪练混合）。

## Goals
- G1：**80% 的主流 1366×768 笔记本在默认 100% 浏览器缩放下可见所有组件，不需要纵向滚动即可覆盖所有牌局内容（大厅/房间号/轮次 + 牌桌 + 手牌）**。
- G2：**所有可见性 Bug 清零**——上供分配后手数立刻更新 + 非庄家也能看到庄/对家位置的 N 张上供牌背面占位。
- G3：**lastMode 可见 ≥ 1.5 秒**，给玩家看清上轮 4 家出了什么。
- G4：**drawing 阶段手牌无 2 时不显示办二按钮**。
- G5：**结算后给「准备」按钮，全员真人准备完（AI 自动 ready）再进入下一局**。
- G6：**把 Phase 10 条文案抽成独立文件**，用户可直接打开编辑不用进 React 组件。

## Non-Goals
- NG1：不改引擎规则（胜负、上供表、甩牌杀判定、主牌大小）——只修 mask 可见性 & hand_count，不动 engine 主流程。
- NG2：不改 WebSocket 协议路由前缀、Nginx 配置、三隔离架构。
- NG3：不引入新的 state 持久化（V1.0 继续 `try_persist_round` 空钩子）。
- NG4：不改成 PWA / 离线可用。
- NG5：不做手机竖屏的"完美对齐"——竖屏允许纵向滚动，能完整看到牌桌+手牌即可；优化优先横屏（用户偏好：手机横屏适配）。

## Background & Context
- 当前布局结构（[GameRoom.jsx:L188-L316](file:///d:/Aiproject1/EA/website/game/frontend/src/pages/GameRoom.jsx#L188-L316)）：最外层 `<header>` 装大厅/StatusBar/房间号 → 行 TOP 对家 → 行 LEFT+CEN+PlayArea/Tribute/Deck+RIGHT → 行 BOTTOM 庄面板/按钮/手牌。**多个 grid 12 列嵌套，每个子组件都有 panel p-2 md:p-3 padding 叠加**，纵向自然太高。
- StatusBar 里 Phase 文案硬编码在组件内（[StatusBar.jsx:L62-L73](file:///d:/Aiproject1/EA/website/game/frontend/src/components/StatusBar.jsx#L62-L73)），用户改文案需要 dig into React component，不直观。
- mask_state_for_viewer 上供阶段可见性（[game_engine.py:L880-L904](file:///d:/Aiproject1/EA/website/game/backend/game_engine.py#L880-L904)）：tribute_distribute 只给庄家可见 `tribute_cards` / tribute_return 给双方都不公开对方面板给"非庄家 3 视角"空面板；同时引擎在分配完上供 + 还牌后，`hand_count` 没同步加/减，导致 UI 上永远显示 12 张（这一点要在 engine `do_tribute_distribute` + `settle_tribute_return` 两个动作末尾同步 hand_count）。
- lastMode 当前（[PlayArea.jsx:L14-L19](file:///d:/Aiproject1/EA/website/game/frontend/src/components/PlayArea.jsx#L14-L19)）：只要 `current_trick.cards_played` 有一张落位就立即切新轮，用户往往来不及看上一轮的 4 张。
- 新增准备按钮：GameState 里加 `ready_seats: Set[int] = set()` + phase 在 settlement → waiting_next_round 子状态（或 settlement 下扩展），收到 ready 动作后检查真人全部 ready→自动 do_next_round。

## Functional Requirements
- **FR-1 (牌桌容器化)**: 所有与"牌局过程"相关的内容（4 家对手面板/办二、PlayArea、DeckArea/TributeArea、办二庄面板、ActionButtons、手牌 HandCards）全部收纳进一个带**圆角渐变背景、桌布感**的 `<PokerTable>` 容器内；桌面外部仅保留三项：① `大厅` Home 按钮 ② `房间 xxxx · WebSocket ✅/连接中/❌` chip ③ 轮次描述文案 chip（StatusBar 的第 1 段 + 主花色 + 庄家/对家/副家分 这些综合文本的**横向一条信息条**，不拆多 chip）。
- **FR-2 (lastMode 1.5s 叠层淡入淡出)**: 当 `state.tricks_history` 长度增加了 1（即 4 家都出完上一手，最后一手赢家已裁决，新的 current_trick.play_order.length=0 且 新 history 写入）之后：在 PlayArea 上层叠加一层**完全独立的 lastTrickOverlay（0.85 透明度、z-index 比新牌高 1）**，显示上一轮 4 张牌（按 4 位置绝对定位）。叠层从 opacity 1 → 0 线性淡去，持续时间**严格 1.5 秒（含首帧停留 ≥1.0s 再开始 fade 0.5s）**。期间新牌正常落位（不阻塞动作），只是在视觉上层叠。
- **FR-3 (上供 Bug 双修复)**:
  - FR-3.1：tribute_distribute 阶段**非庄家也能看到「庄家收到」「对家收到」两个子面板内的 N 张牌——牌面显示背面（faceDown=true）**，张数必须等于实际分配数；如果还在未分配则显示"？×未分配张数"。
  - FR-3.2：tribute_return 阶段完成（即 `return_from_banker` 和 `return_from_banker_partner` 都确认后引擎进入 playing）之前，**同步刷新 banker_seat / banker_partner_seat / tribute_giver_seat 三人的 hand_count**——公式：`banker_seat 手数 = 原 12 张 + (上供自留张数) - (还牌 N 张)`；`partner_seat 手数 = 原 12 张 + (上供分给对家张数) - (还牌 N 张)`；`giver_seat 手数 = 原 12 张 - (上供出的 N 张) + (庄和对家还的 N 张)`。
- **FR-4 (手牌无 2 → 不显示办二按钮)**: drawing 阶段，当 viewerHand 中 rank="2" 且非 joker 的牌数量 === 0 时，**ActionButtons 组件完全不 render「办二」按钮的 DOM**（不只是 disabled，是连位置都不占）。
- **FR-5 (Phase 文案抽独立文件)**: 把 StatusBar.jsx 内 `PHASE_ZH`（10 条阶段→文案的映射）从组件 JSX 内移到独立源码文件 `game/frontend/src/config/phases.js`，文件开头带注释 `// 办二游戏各阶段显示文案 —— 可直接在此文件修改，保存后前端 HMR 立即生效。`，导出默认 `export default PHASE_ZH`。
- **FR-6 (结算后准备按钮机制)**:
  - FR-6.1：settlement 阶段**不再**直接给「下一局」按钮；替换为「准备」按钮（每个真人玩家可点）。
  - FR-6.2：后端 GameState 新增 `ready_seats: set[int] = set()` 字段。每个 seat 收到 ready 动作后加入该集合。
  - FR-6.3：**条件**：所有非 AI 玩家 seat（即 `is_ai == False` 的 seat）都 ∈ ready_seats 后，服务端**自动**调用 do_next_round 开新局；AI 玩家无需 ready，视为 auto-ready。
  - FR-6.4：前端显示已准备人数 chip 如 `2/3 已准备（AI 已自动准备）`，房间全部真人 ready 时按钮变为灰态 disabled，显示"等待服务器开新局…"。
  - FR-6.5：新局（do_next_round）开始时，`ready_seats` 自动清空。
- **FR-7 (缩放/尺寸基线校准)**: 以 1366×768 为笔记本基线，**牌桌高度 ≤ 580 px**（不包含顶栏 3 项 & 下方 ResultModal overlay）；PlayingCard sm 尺寸在桌面端高 ≤ 68 px（原 72 px 缩到 68 px）、手牌 xs/sm 统一按比例；手机横屏（landscape ≤ 900 px）牌桌占屏幕高度 ≤ 85%，PlayingCard sm 高 ≤ 60 px；手机竖屏允许纵向滚动不设上限，但所有组件出现不被裁。

## Non-Functional Requirements
- **NFR-1 (响应式适配)**：
  - Rule：在 Chrome DevTools 模拟 4 档 viewport（① 1366×768 笔记本 / ② 1920×1080 桌面 / ③ 667×375 iPhone SE landscape / ④ 375×667 iPhone SE portrait），**所有牌局内容均不被右侧截断（横向 ≤ viewport.width - 滚动条宽度），纵向（笔记本）无需滚动条即可看全顶栏+牌桌+手牌**。
  - Rubric：缩放适配灵活度 1-5（1=某一档内容截断严重；3=手机端需要滚动但不截断；5=4 档都完美符合 Rule），通过阈值 ≥4。
- **NFR-2 (构建 & 冒烟测试)**：每轮实现完成后，`npx craco build` exit 0，且 `python game/test_smoke.py` exit 0（**4 AI 自玩至少走 1 局完整 settlement → ready → next_round → 新局摸牌 ≥ 3 张**）。
- **NFR-3 (协议兼容)**：WebSocket 现有动作接口（playCards/declareBan2/selectTribute/...）不删、不改入参；新增 ready 一条动作，不影响老 client 连接老 server（保持向下兼容：没有 ready 时，等待 30 秒超时自动开新局作为兜底）。
- **NFR-4 (代码改动可追溯)**：Phase 文案文件 `config/phases.js` 必须**独立、无 import 依赖、纯数据文件**（不 import React/组件，这样用户打开改不会破坏语法）。

## Constraints
- **Technical**:
  - C1：React 组件继续用 CRA + craco + Tailwind；不加新依赖（lastMode 1.5s 用 React `useState + useEffect + setTimeout + opacity transition` 实现；PokerTable 用渐变/阴影 CSS，不用 image）。
  - C2：后端改动手_count 的位置必须在 `do_tribute_distribute` 和 `settle_tribute_return`（或等价的动作末尾），**不能提前**；不能影响 AI 启发式手牌判断（AI 仍然根据 state.players[seat].hand 的实际内容判断，不依赖 hand_count 字段）。
  - C3：mask_state_for_viewer 改动 **FR-3.1** 时不能泄露牌面 rank/suit——只能把背面（faceDown=true）暴露给非庄家。
- **Business**:
  - C4：原 EA 主站零侵入（三隔离仍保持；不改 cg-fintech.com Nginx；不改 `/www/wwwroot/cg-fintech.com/` 下的任何非 game/ 文件）。
  - C5：所有 UI 文本均简体中文（不引入中英混排，除了 P{seat} 和 AI emoji，这些保留）。
- **Dependencies**:
  - C6：依赖现有的 `isScore` / `cardScore` / `SUIT_SYMBOL` / `getBestTributeCardIds` 工具函数（不动它们）。
  - C7：依赖 routes_ws.py 新增一条 ready 动作；HTTP 路由不动。

## Assumptions
- A1：「桌面以外保留 3 项」指 DOM 层级在 PokerTable 之上/之外，不是视觉上必须跑到 table 外面（视觉上可以贴紧 table 顶部对齐）。
- A2：FR-6.3 判定"AI 玩家自动 ready"用 `p.is_ai == True` 过滤；如果 room 里 4 个全是 AI（test_smoke 场景）→ ready_seats 恒为空，所以走**兜底超时**：settlement 后 5 秒自动开新局（这样 self-play smoke 不卡在等待 ready）。
- A3：lastMode 1.5s 的"叠加层"可以用绝对定位 relative 套 PlayArea，加一个内部 `lastTrickOverlay` div；4 张牌的布局和 PlayArea 完全一致（dp 映射/absolute position 复用），z-index 设为 10。
- A4：用户说的"轮次描述文案——转出源码文件，我来优化"意味着 FR-5 文件格式必须足够简单易改：纯 `key: string` 映射，文件保存后 HMR 立刻生效，不需要改 import 路径。

## Acceptance Criteria

### AC-1: 牌桌容器化 + 桌面外仅 3 项（rule）
- **Type**: `rule`
- **Given**: 用户在浏览器打开 `/game/play/xxx` 且 WS 已连接，`phase === "playing"`
- **When**: 用 DevTools querySelector 找 `body > div#root > *`（最顶层直接子节点）
- **Then**: PokerTable 容器是唯一内容容器，其内部必须包含 OpponentPanel(4 家)、PlayArea、DeckArea/TributeArea、ActionButtons、HandCards；PokerTable 之外的直接子节点只允许：
  1. "大厅" Home 按钮（或其外层行容器）
  2. "房间 xxxx · WS …" chip（或同一行容器）
  3. 轮次描述信息条（综合 Phase / 主 / 庄 / 对家 / 副家分 一行）
- **Pass Condition**: 桌面外除上述 3 项外不存在任何"牌局相关组件"（如 办二按钮、手牌、对手面板、Deck 等）
- **Evidence**: Integrated Browser `browser_evaluate` 查询 `document.querySelector('.poker-table').querySelectorAll('.opponent-panel, .play-area, .deck-area, .tribute-area, .action-buttons, .hand-cards').length >= 7` 且 poker-table 外 document 找不到这些 class 的元素。

### AC-2: 纵向可见 1366×768（rule）
- **Type**: `rule`
- **Given**: 模拟 viewport 1366×768，phase="playing" 12 张手牌齐
- **When**: 页面加载完成 2 秒后（动画稳定）
- **Then**: body 纵向 scrollHeight ≤ viewport.height = 768（不出现纵向滚动条）
- **Pass Condition**: `document.documentElement.scrollHeight <= document.documentElement.clientHeight`
- **Evidence**: browser_evaluate 读取 scrollHeight 对比 clientHeight。

### AC-3: lastMode 叠层显示时长 ≥ 1.5s（rule）
- **Type**: `rule`
- **Given**: 4 家出完一手，服务端裁决完上一轮（tricks_history 新增 1 条 + current_trick 清空）
- **When**: tricks_history 变化时间戳 T0 记录 → 1.5 秒后 T1 = T0 + 1500ms
- **Then**: 在 [T0, T0 + 1000ms] 区间内 `.last-trick-overlay` 始终存在且 opacity ≥ 0.9；在 T1 时点或之后 `.last-trick-overlay` 已从 DOM 移除或 opacity ≤ 0.01
- **Pass Condition**: browser_evaluate 挂 MutationObserver 监控 last-trick-overlay 显示持续时间，误差 ±200ms 内算过
- **Evidence**: 自写 evaluate 脚本，测 3 轮 trick 取均值满足。

### AC-4: 上供非庄家可见背面占位（rule）
- **Type**: `rule`
- **Given**: phase="tribute_distribute"，viewerSeat ≠ banker_seat 且 ≠ banker_partner_seat（即下家/副家视角）
- **When**: 庄家已分配 2 张自留 + 1 张对家（共 N=3）
- **Then**: TributeArea 中「庄家收到」子面板内有 2 张 PlayingCard faceDown，「对家收到」有 1 张 faceDown（没有正面 rank/suit 泄露）
- **Pass Condition**: Grep `faceDown=true` 的节点在两面板 count 匹配分配数；且 `node.innerText` 不出现 rank/suit 字符 (2-9, JQKA, ♠♥♦♣)
- **Evidence**: browser_evaluate 在 tribute_distribute 快照统计 faceDown 数量。

### AC-5: 上供后手数立即更新（rule）
- **Type**: `rule`
- **Given**: 4 人局 N=2 上供，banker_seat=1，partner_seat=3；banker 自留 1 张，对家 1 张；庄/对家各还 2 张给 giver seat=0
- **When**: settle_tribute_return 完成 phase → "playing" 的瞬间
- **Then**: `seat=0(供家)` hand_count = 12 - 2 + 2 + 2 = 14；`seat=1(庄)` = 12 + 1 - 2 = 11；`seat=3(对家)` = 12 + 1 - 2 = 11；`seat=2(闲家)` = 12
- **Pass Condition**: test_smoke 加一个 N=2 完整局后断言（或 smoke 的 final phase 读取 4 人 hand_count，对照公式不等即 fail）
- **Evidence**: 改 test_smoke 输出 settlement→next_round 后的 hand_count，exit 0 通过。

### AC-6: 无 2 时办二按钮不渲染（rule）
- **Type**: `rule`
- **Given**: phase="drawing"，viewerHand 12 张内 rank==='2' 且 is_joker=false 的数量为 0
- **When**: 检查 ActionButtons 的 DOM
- **Then**: document 内找不到任何包含"办二"文本且 role=button 的元素（不只是 disabled，是根本不存在）
- **Pass Condition**: browser_evaluate `Array.from(document.querySelectorAll('button')).every(b => !b.textContent.includes('办二'))`
- **Evidence**: 一手自造模拟 viewerHand=12 张全非2，跑 evaluate 检查。

### AC-7: Phase 文案抽独立文件（rule）
- **Type**: `rule`
- **Given**: 构建环境 ready
- **When**: 读 `game/frontend/src/config/phases.js`
- **Then**: ① 文件存在；② 首 3 行内有注释"办二游戏各阶段显示文案"；③ 文件不 import react 或任何组件；④ 导出 `export default { waiting: ..., drawing: ..., ..., settlement }` 共 10 条；⑤ StatusBar.jsx 从这个文件 `import PHASE_ZH from "@/config/phases"` 引用（不再硬编码 PHASE_ZH 在组件里）
- **Pass Condition**: Grep `src/config/phases.js` 文件头注释 + import 链验证；craco build exit 0
- **Evidence**: Grep + build 输出。

### AC-8: 准备按钮——全员真人准备才开新局（rule）
- **Type**: `rule`
- **Given**: 房间 2 真人 + 2 AI，settlement 阶段
- **When**: 真人 P1 点准备；真人 P3 不点
- **Then**: 10 秒后新局仍没开始；P3 点准备后 ≤ 1 秒内 do_next_round 被服务端触发
- **Pass Condition**: 全程加 logs 监控 ready_seats 集合 + do_next_round 调用时机；另 test_smoke（4 AI）在 settlement 后 ≤ 6 秒自动开新局（兜底超时 5s 生效）
- **Evidence**: Integrated Browser 模拟 2 真人 2 AI 流程 + test_smoke exit 0。

### AC-9: AI 自玩至少 1 局 settlement → next_round → 新局（rule）
- **Type**: `rule`
- **Given**: 跑 `python game/test_smoke.py` 新改的版本（加了 ready 超时兜底）
- **When**: 执行完毕
- **Then**: exit 0；日志中出现 "Round 1 RESULT" 后又出现 "Round 2 Start: drawing"（或等价的 round_number==2 drawing 日志）
- **Pass Condition**: test_smoke 退出 0 且 grep 日志有 Round 2 / round_number=2
- **Evidence**: PowerShell `$LASTEXITCODE -eq 0` + 日志关键字。

### AC-10: 协议兼容（新增 ready 不破坏老动作）（rule）
- **Type**: `rule`
- **Given**: 老 client 连接新 server（不发 ready 消息）
- **When**: settlement 后等待
- **Then**: 30 秒兜底超时后服务端仍然 do_next_round 进入新局（不会死锁在 settlement 永远等）
- **Pass Condition**: 改 test_engine_direct 模拟 settlement 后客户端静默 31 秒，engine 自动进入下一轮 drawing
- **Evidence**: engine_direct 脚本 assert next phase==drawing and round_number==2。

### AC-11: 手机横屏 667×375 无横向截断（rule）
- **Type**: `rule`
- **Given**: DevTools 模拟 iPhone SE landscape 667×375
- **When**: phase=playing 12 张手牌齐
- **Then**: 所有可见组件右边缘坐标 <= 667（横向不出现滚动条）
- **Pass Condition**: 遍历所有可见 `getBoundingClientRect().right` 最大 <= viewport.width + 2 (考虑 2px 误差)
- **Evidence**: browser_evaluate 遍历节点 rects max right。

### AC-12: 缩放适配 rubric（rubric）
- **Type**: `rubric`
- **Dimension**: 4 档 viewport 无截断 + 笔记本不用滚动
- **Scale**: 1-5
- **Anchors**: 1 = 有 2 档以上截断严重（> 50px 出屏）或笔记本滚动手动 > 50 px 才能看到手牌；3 = 手机端出现 1 档轻微截断（< 20 px）、笔记本不滚动；5 = 4 档全部符合 Rule 不截断且笔记本不滚动
- **Pass Threshold**: >= 4
- **Evidence**: 4 档 viewport 跑 browser_evaluate 的 scroll/truncation 脚本。

### AC-13: 手机竖屏 375×667 组件完整（rule）
- **Type**: `rule`
- **Given**: DevTools 模拟 iPhone SE portrait 375×667
- **When**: 页面任何 phase（包括 drawing 12 张手牌 + 办二按钮）
- **Then**: 所有组件的 `getBoundingClientRect().top` 的最小值 ≥ 0（顶不截），且滚动后所有组件 `.bottom` 至少有一次能达到 <= 667（即通过纵向滚动可以看到每个组件）
- **Pass Condition**: evaluate 脚本滚动 + 检查每个组件在滚动过程被完整看到
- **Evidence**: browser_evaluate 滚动测试。

### AC-14: 上供背面不泄露牌面（rule）
- **Type**: `rule`
- **Given**: FR-3.1 修复后，非庄家看 tribute_distribute
- **When**: 检查「庄家收到」面板下所有 PlayingCard 的 innerText / img src / data 属性
- **Then**: 不出现 rank（2-9,10,J,Q,K,A）和 suit 字符（♠♥♦♣ 或 spade/heart 等英文字样），card 节点 class 名里也不含 `rank-` + suit 字符串（如果有的话）
- **Pass Condition**: 字符串匹配 0 hits，否则 fail
- **Evidence**: browser_evaluate 正则搜索 innerText + outerHTML。

## Open Questions
- [x] Q1（用户自选）：lastMode 呈现方式 → **叠层淡入淡出（1.5s：首 1.0s 停留，后 0.5s 线性 fade）**
- [x] Q2：上供 Bug 修复范围 → **两者都修（可见性+手数）**
- [x] Q3：Phase 文案改法 → **转出源码文件 `src/config/phases.js`，用户自行优化**
- [x] Q4（用户追加）：结算后直接开始 / 准备按钮 → **全员真人准备按钮，AI 自动 ready，30 秒兜底超时自动开新局**
- [ ] Q5：牌桌视觉样式（桌布颜色/渐变）——留 Implement 用一套合理的默认翡翠绿渐变，后续若用户要改再调。
