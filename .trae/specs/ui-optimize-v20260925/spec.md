# 办二（Show Thumb）V1.0 UI 优化规范 v2026-09-25

## 1. 问题概述 & 用户角色

办二游戏已在真实 VPS（`https://cg-fintech.com/game/`）上线并跑通三链路（HTTP + WebSocket + 静态 SPA）。本轮优化聚焦用户报告的 5 个真实操作痛点 / 显示不合理点，目标是达到「斗地主 / 麻将类主流游戏」的 UI 熟悉度与操作效率。

**用户（人类 P1）**：办二玩家，典型操作路径：进大厅 → +3 AI → 选主花色 → 办二 → 扣底 → 上供/回牌 → 12 轮出牌 → 结算；期望「本人永远下、对手围绕四周」的直觉布局、选中反馈清晰、上轮出牌保留直到新一轮。

**用户（3 AI）**：不直接与 UI 交互，只通过后端状态更新 UI 显示。

## 2. 本轮目标（Goals）

| # | 目标 | 对应需求 |
|---|------|---------|
| G1 | 办二声明后，办二牌固定展示在庄家面前，直到本局结束（类似「主牌/级牌」声明） | 需求 1 |
| G2 | 出牌成功后，当前选中卡牌立即清空（已选计数归零），第二轮可重新选牌无叠加 | 需求 2 |
| G3 | 得分牌与扣底牌合为一行，简洁展示：得分牌显示花面（角标），扣底牌庄家看正面、其他人看背面 | 需求 3（显示部分） |
| G4 | 整体布局对齐斗地主/麻将主流：**本人永远在下方，对手在上/左/右**，手牌横向平行堆叠，不再扇形 | 需求 3（布局部分） |
| G5 | 选中牌外框换一种辨识度更高的颜色（与主牌金、副牌默认色区分） | 需求 4 |
| G6 | 一轮出牌结束后，4 家的本轮出牌不消失；直到下一轮「有人领出新牌」时才清空当前牌池 | 需求 5 |

## 3. 本轮 Non-Goals（明确不做）

- ❌ 不引入新的后端 FSM 阶段（只改前端渲染 + 已有 WebSocket 状态）
- ❌ 不做真实玩家间 IM 聊天 / 表情
- ❌ 不增加 MongoDB 对局历史持久化（V1.1）
- ❌ 不做移动端竖屏专属布局（仅 1280px 宽以上桌面版；移动端保持当前 GameRoom 的 md 断点降级）
- ❌ 不调整扑克规则引擎（只改显示）

## 4. 功能需求（Functional Requirements）

### FR1. 办二展示
- 状态判断：当 `state.banker_seat !== null && state.banker_declared_rank === "2"`（或等价字段 `state.banker_declaration.rank === "2"`）时，把该 2 牌渲染在 **庄家玩家面板的副栏**（庄家是本人→显示在下方手牌区的上方；庄家是对手→对手面板内）
- 显示内容：**1 张牌的花面正面**（rank=2，suit 由 `banker_declaration.suit` 决定），附标签「办二」
- 展示时机：从 `drawing` 阶段办二成功后立即显示，直到本局 `settlement` 后 `round_number+1` 的新 `drawing` 开始前消失
- 隐私：所有座位都能看到「庄家办的是哪张 2」（规则公开信息）

### FR2. 出牌后立即清空选中
- 触发：任何操作按钮（出牌/扣底/办二/选供/还供/回牌）成功发送后（不等待后端回包），**乐观地清空** `selectedIds`（=[]）和对应的「已选 N」chip
- 回滚：如果后端返回 `action_result.success=false`，保留最后一次选中（不做额外重置叠加）
- 覆盖范围：**所有使用 `selectedIds` 的阶段**（drawing 办二选 2、discard_bottom 扣底 6、tribute_select 选 N 张、tribute_return 还 N 张、playing 跟牌 N 张）
- 关键约束：playing 阶段，当状态从 playing→settlement（round 切换）→新 drawing，`useEffect([phase,round_number])` 仍保持原有清空逻辑（双保险）；只有「同 phase 同 round 连续出牌」需要本轮修

### FR3. 得分牌 + 扣底牌，合一行、简洁显示
- 显示位置：StatusBar 下一行，或 DeckArea 合并区（最终实现为 DeckArea 的同一行 2 列，左列「得分牌展示」、右列「扣底牌」）
- 得分牌展示：显示所有「5/10/K 且为本轮 / 历史累计得分」的缩略花面（正面），每张牌附角标分数（5/10/10），数量多可省略 12 张以上时加 "…+X"
- 扣底牌展示（**右列**）：
  - 庄家座位：扣底 6 张 **正面花面展示**；原底 4 张 + 扣底后底分：`底分=原底+扣底` 标签
  - 非庄家座位（1/2/3 其他家）：扣底 6 张 **全部背面堆叠**，只显示数量 + 底分数字，不看内容
  - `phase === "settlement"` 时：所有座位 **都看扣底 6 张正面**（规则公开）
- 合一行：「得分牌缩略区 + 扣底缩略区」**同一 flex 行**，间距 16px，得分牌左对齐、扣底右对齐，一行内自适应

### FR4. 整体布局对齐「斗地主 / 麻将主流」
- **本人永远在下方**：`mySeat`（viewer_seat）渲染在 Grid 的最下一行（row-3），手牌区「平行堆叠」（扇形弃用）
- **对手方向**：根据 viewer_seat 动态旋转座位映射：
  - 固定显示位置：`TOP(对家) / LEFT(右家) / RIGHT(左家) / BOTTOM(我)`
  - 数学：`display_position = (seat - viewer_seat + 4) % 4`
    - `= 0` → BOTTOM（我）
    - `= 2` → TOP（对家）
    - `= 1` → RIGHT（上家）
    - `= 3` → LEFT（下家）
- PlayArea 四角落出牌区映射同样做 `(seat - viewer_seat) mod 4` 旋转，保证「我出的牌在下方、对家的在上方」
- 手牌平行堆叠：
  - 弃用 HandCards 的扇形 sin translateY 计算
  - 改为：每张牌 `left = idx * overlapStep px`，固定高度，轻微 z-index 递增（右侧盖左侧），overlapStep 约 `cardWidth * 0.32`
  - 最多显示手牌数：12 张（办二最大手牌 = 18-6扣底=12）
  - 选中时：外框变色（FR5）+ 上移 20px（不旋转、不改变左右位置）
- 对手 OpponentHandStack：保持当前堆叠，只同步方向映射（TOP 牌堆在顶部，LEFT/RIGHT 在两侧）

### FR5. 选中牌外框颜色切换
- 当前色：紫色 `#a855f7`（与部分 UI 标签色冲突）
- 新目标色：**品牌绿 `#10b981`**（Tailwind `emerald-500`），**内描边 3px**，同时保留 **上浮 + 深阴影**
- 规则：只有选中（selected=true）才用绿；主牌标记继续用金色 `#f59e0b`；副牌默认无描边；三者优先级：选中绿 > 主牌金 > 默认
- CSS 类：修改 `.card-selected`，不要新增 `.card-selected-new`（避免 class 分叉）

### FR6. 上轮出牌保留直到新轮领出
- 状态：前端本地新增一个 `lastTrickCards: {[seat]: Card[]}`（或直接读 `state.tricks_history[state.tricks_history.length-1]`）
- 显示策略：
  - 如果 `state.current_trick.cards_by_seat` 非空 → 显示 `current_trick`（本轮进行中）
  - 否则 → 若 `tricks_history.length > 0` → 显示 `lastTrick = tricks_history.last`，附淡标签「上一轮」
  - 清空时机：当下一轮「有人出第 1 张牌」= `current_trick.cards_by_seat.length` 从 0 → ≥1 时，清空「上一轮」显示、切换为 `current_trick`
- 视觉：上一轮牌整体降透明度 0.6 + 灰 10%（与当前进行中轮区分）；新轮 current_trick 正常显示
- 约束：不保留 N 轮历史（只保留「上一轮」vs「当前轮」）；不新增 PlayArea 外的历史区

## 5. 非功能需求（Non-Functional Requirements）

### NFR1. 性能
- FR4 布局变化后，React 渲染帧率在开发模式下 ≥ 30fps（生产 ≥ 50fps）
- 新增 `lastTrick` 不引入每帧 useMemo 重计算开销：使用 `tricks_history.length` 做依赖，不深比较
- 12 张手牌平行堆叠 + 选中状态切换：点击到视觉反馈 < 80ms（Chrome DevTools Performance 面板单帧 < 16ms）

### NFR2. 兼容性
- 不破坏后端 GameState schema（只做显示层读取 + 可选新增本地 useState）
- 桌面 Chrome / Edge / Safari 最新两版：所有需求 1–6 视觉一致
- `npx craco build` 仍 exit 0，无 webpack 编译错误或警告新增

### NFR3. 可访问性 & 一致性
- 选中状态（FR5）在色盲用户下仍能与主牌区分：**绿 vs 金** 色相差 + 同时保留上浮位移（非纯颜色编码）
- 斗地主/麻将参考布局：本人在下、平行手牌——用户 10s 内可熟悉（测试：不看说明，10s 内能点中自己的"出牌按钮"并出 1 张正确跟牌）

### NFR4. 回归
- 后端 3 条测试：`python game/test_smoke.py`、`python game/test_engine_direct.py`（连续 3 局）、`game/test_ws.py` 全部 PASS（exit 0）
- 前端 build PASS

## 6. 约束 / 依赖 / 假设

- **约束**：座位映射（viewer_seat 旋转）只改前端显示坐标，后端 GameState 中 seat / banker_seat 仍为 0-3 原始编号，绝不改 `seat_meta.banker_seat` 的含义
- **依赖**：
  - 后端需要 `banker_declaration: {rank, suit}` 字段序列化（查 [models.py](file:///d:/Aiproject1/EA/website/game/backend/models.py)：如果不存在则需要补 `GameState.banker_declared_suit / banker_declared_rank` 两个字段，V1.0 目前字段名是 `trump_suit + declared_by_seat`，可能需要补 `declared_rank`；若引擎已有，则只改前端读
  - `tricks_history` 字段已存在（后端模型确认）
- **假设**：桌面端 ≥ 1280px 宽占访问量 90% 以上，移动端降级不精修
- **假设**：当前 viewer_seat = 0 占 100%（+3 AI 模式），但实现要验证 viewer_seat=1/2/3 时旋转仍然正确（用 +3 AI 创建后手动刷新不同 seat 视角）

## 7. 开放问题（Open Questions）

| # | 问题 | 建议默认值 | 状态 |
|---|------|-----------|------|
| O1 | 「得分牌」指历史所有得分牌缩略？还是只当前局累计？ | 当前局累计（5/10/K 全部赢家吃墩的牌，按队分组显示缩略） | 默认采纳，若用户反对再改 |
| O2 | 平行堆叠 overlap 比例（0.32 vs 0.28 vs 0.35） | 0.32（12 张总宽 = 3.5 张牌，约在 1280 宽下占 70%） | 默认采纳 |
| O3 | 选中新色 emerald-500 #10b981 vs cyan-500 #06b6d4 vs sky-600 | #10b981（与金色主牌色差最大，绿色最符合「出牌就绪=GO」直觉） | 默认采纳 |
| O4 | 上轮牌降低透明度 + 灰色 10% 是否足够区分？ | 足够；不做额外浮层遮挡 | 默认采纳 |
| O5 | 办二展示位置：庄家面板副栏 vs 固定在 StatusBar 右侧？ | 庄家面板副栏（与"庄家 Pn"标签并列），更符合"声明归属"直觉 | 默认采纳 |

> 以上 5 条默认值用户无反对即生效。

## 8. 验收标准（Acceptance Criteria）

### 规则类（rule）——必须二元通过

| ID | 类型 | 描述 | 证据来源 |
|----|------|------|---------|
| AC1 | rule | 办二声明后，在庄家面板上能看到 rank=2 suit 正确的 1 张正面牌 +「办二」标签，本局 settlement 前一直存在 | Integrated Browser snapshot + 人工观察 |
| AC2 | rule | playing 阶段出 1 张牌后，立即观察手牌右上角「已选 N」chip = 0；无旧选中上浮残留 | DevTools Console 输出 `selectedIds.length` 点击出牌后立即为 0 |
| AC3 | rule | discard_bottom 扣底选 6 张 → 点确认扣底 → `selectedIds.length === 0` 立即为 0 | 同上 |
| AC4 | rule | tribute_return 还 N 张 → 点确认 → `selectedIds.length === 0` | 同上 |
| AC5 | rule | 桌面端 ≥ 1280px，自己的手牌位于屏幕最下一行居中；对手三方向 TOP（对家）/ LEFT（下家）/ RIGHT（上家） | 人工观察 + PlayArea 四角落 seat 旋转映射对号 |
| AC6 | rule | PlayArea 对家（TOP 位置）= 当前 viewer_seat + 2 mod 4；LEFT / RIGHT 分别 = 3 / 1 mod 旋转 | 代码断言：对 4 个 viewer_seat 值分别做映射校验（写单测或 Console 打印 display_position 表） |
| AC7 | rule | 选中 2 张手牌后，外框是品牌绿 `#10b981` 3px 内描边（不是紫），且主牌仍保留金内描边（选中绿优先叠加在金之上） | DevTools Elements → computed box-shadow 值验证包含 `rgb(16, 185, 129)` |
| AC8 | rule | 当前轮 4 家出完牌 → `current_trick.cards_by_seat` 被后端置空 → 前端 PlayArea 继续显示上一轮牌（非空），直到下一个玩家出第 1 张新牌 | Integrated Browser 等待 WS state_update 后截图：出完第 1 墩 → 牌不消失 → 出第 2 墩第 1 张 → 切换为新牌 |
| AC9 | rule | 庄家看扣底 6 张为正面花面；其他 3 家为背面（含 AI 视角，刷新成其他 seat 后查看）；settlement 时所有人都能看正面 | 2 个 viewer_seat（banker vs 非 banker）浏览器 tab 对照截图 |
| AC10 | rule | 得分牌与扣底牌同一 flex 行（左右列），得分牌显示 5/10/K 花面缩略 + 角标分数 | snapshot 同一行 DOM 结构 `.row > .col-score + .col-bottom` 且 margin 相邻 |
| AC11 | rule | 12 张手牌改为「平行堆叠」：同 translateY 仅 translateX 步进 = overlapStep 恒定 ±2px | DevTools computed left 值检查：差在 overlapStep ±2px |
| AC12 | rule | `npx craco build` exit 0；python test_smoke.py / test_engine_direct.py exit 0；python -m 执行无 ImportError | PowerShell / CMD 命令执行记录 |

### 量规类（rubric）——按 0/1/2 打分

| ID | 维度 | 0 分 | 1 分 | 2 分（通过阈值 ≥1.5） | 证据来源 |
|----|------|------|------|----------------------|---------|
| AC13 | rubric：主流游戏布局熟悉度（FR4） | 本人仍在左上等非下方，用户困惑 | 本人在下但对手映射错 1 人 / 手牌仍扇形 | 本人在下方 + 上对左右三家映射正确 + 手牌平行堆叠无扇形；10 秒新用户可找到"自己的牌"并"点按钮出牌" | 人工体验 + 10s 操作用户计时录像或自评 |
| AC14 | rubric：选中与主牌区分度（FR5） | 仍紫色或与金色冲突 | 改了颜色但 3 种状态仍混淆 | 选中（绿）、主牌（金）、默认（无）三色一眼区分；色盲用户仍能通过位移+内描边粗度区分 | 人工截图对照 + 色盲模拟（Chrome DevTools Vision Deficiencies → Deuteranopia） |
| AC15 | rubric：出牌后操作顺滑度（FR2） | 选中不清零导致第二轮带旧牌出错 | 第一轮不清零但第二轮手动取消仍可用 | 出牌后立即清零；连续 3 轮出牌（每轮不同 N 张）不出现"旧选中叠加"错误；人工点击 3 次连出都无异常 | 人工连续 3 轮操作录像或日志 |
| AC16 | rubric：办二位置直觉度（FR1） | 办二牌显示在无人认领区域（如中间） | 位置正确但 label 无/错或只庄家能看 | 在庄家面板副栏、附「办二」标签、所有座位可见、从 drawing→settlement 全程稳定不消失；新用户 3s 内理解"谁办了什么" | 人工截图 + 3s 识别计时 |
| AC17 | rubric：扣底+得分显示简洁度（FR3） | 得分 / 扣底仍两行或信息溢出 | 同一行但信息拥挤或角标缺 | 一行两列左得分（花面+角标）右扣底（庄正他背）、信息不溢出 1 行、底分数字清晰 <1s 可读 | 人工截图 + 1s 可读性自评 |
| AC18 | rubric：上轮保留清晰度（FR6） | 上轮牌立即消失或保留 3 轮混乱 | 保留但与当前轮视觉无区分 | 只保留 1 轮"上轮" + 0.6 透明灰色；新一轮第 1 张牌出现后立即切换为当前轮（完全不透明正常色）；无用户混淆"这是哪一轮" | 人工截图 2 张（上轮静止 / 新一轮第 1 张）+ 自评"哪一轮"选择题正确率 100% |

---

_本规范 18 条 AC（12 rule + 6 rubric）全部达标才算本轮 UI 优化通过；缺任何 1 条 rule = 实现回修；rubric 总分 ≥ 6 × 1.5 = 9 分通过（单项 < 1.0 分的项要回修到 ≥ 1.0）。_
