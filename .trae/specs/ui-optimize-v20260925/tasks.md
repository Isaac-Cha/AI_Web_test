# UI 优化实现任务清单（tasks.md）

_依赖：[spec.md](./spec.md) 18 条 AC；按依赖顺序执行，优先高优先级任务。_

---

## Task 1：布局重构——本人永远下方 + 手牌平行堆叠（对应 AC5 / AC6 / AC11 / AC13）

**Priority**：high
**Dependencies**：无（基础结构，必须先做）
**修改边界（文件）**：
- `game/frontend/src/pages/GameRoom.jsx`：seatMeta 的 oppSeats/myMeta 物理→显示位置映射；Grid 布局从「左上/右上/左下/右下」改为「TOP/LEFT/RIGHT/BOTTOM」；PlayArea 四角落传入 display_position 而非物理 seat
- `game/frontend/src/components/PlayArea.jsx`：positions 按 display_position 0-3（BOTTOM/RIGHT/TOP/LEFT）映射，支持 viewer_seat 任意值旋转
- `game/frontend/src/components/HandCards.jsx`：弃用扇形 sin 弧度，改为平行堆叠 `left=idx*overlapStep`；选中仍 translateY(-20px) 但不旋转
- `game/frontend/src/components/OpponentHandStack.jsx`：按 display_position 改变对手牌方向（TOP 向下展开、LEFT/RIGHT 垂直堆叠等可选）

**本地测试要求（TR）**：

| TR ID | 类型 | 通过条件 | 证据 |
|-------|------|---------|------|
| T1-T1 | rule | viewer_seat=0/1/2/3 四个值下，`display_position(seat, viewer_seat) = (seat-viewer+4)%4`；`viewer_seat=0, seat=2 → TOP(2)`；`viewer_seat=0, seat=1 → RIGHT(1)`；`viewer_seat=0, seat=3 → LEFT(3)` | Console 打印 4x4 映射表 16 条全部断言通过 |
| T1-T2 | rule | 12 张手牌平行堆叠：`left[i+1] - left[i] = overlapStep ±2px`（恒定）；`top` 全部相等 ±2px（不扇形） | DevTools computed 12 张元素 left / top 值抽样 3 组相邻差验证 |
| T1-T3 | rule | ≥1280px 桌面宽：自己手牌在屏幕最下一行（`row-start-3` 或最后一个 Flex 行）；TOP 对手牌在屏幕最上（row-start-1）；LEFT / RIGHT 在 row-2 col-1 / col-3 | Integrated Browser snapshot DOM grid 位置断言 |
| T1-R1 | rubric | AC13 布局熟悉度（0/1/2），按 spec 打分标准 | 人工自评 + 截图保存 |

---

## Task 2：选中状态——出牌后立即清空 + 外框色改品牌绿（对应 AC2 / AC3 / AC4 / AC7 / AC14 / AC15）

**Priority**：high
**Dependencies**：无（与 Task 1 可并行，但都修改 GameRoom 状态，建议 Task1 后再做避免合并冲突）
**修改边界（文件）**：
- `game/frontend/src/pages/GameRoom.jsx`：新增 `actionsRef` 或在 `actions` 包装层，所有按钮回调（playCards / discardBottom / declareBan2 / tributeSelect / tributeReturn 等）成功发送后立即 `setSelectedIds([])`（乐观清空）；保留原 `useEffect([phase, round_number])` 双保险
- `game/frontend/src/components/ActionButtons.jsx`：按钮 onClick 调用 `actions.playCards(...)` 之后立刻 `onClearSelected?.()`——传 clearSelected 回调参数从 GameRoom 下发
- `game/frontend/src/index.css`：`.card-selected` box-shadow 从 `#a855f7` 紫 → `#10b981` 绿；inset 描边从 2px → 3px；保留上移 0.9rem 与深阴影
- `game/frontend/src/components/PlayingCard.jsx`：类名追加顺序 `selected ? card-selected` 最后，保证优先级正确

**本地测试要求（TR）**：

| TR ID | 类型 | 通过条件 | 证据 |
|-------|------|---------|------|
| T2-T1 | rule | playing 阶段选中 2 张 → Console 打印 `selectedIds.length===2` → 点击「出牌」→ 下一行 Console 立刻输出 `selectedIds.length===0`（不等待后端回包） | DevTools Console 时序日志截图 |
| T2-T2 | rule | discard_bottom 选 6 张 → 点「确认扣底」→ selectedIds 立即为 0；tribute_return 选 N → 点「确认还供」→ 立即为 0 | 同上，两个阶段各一次时序日志 |
| T2-T3 | rule | `.card-selected` computed box-shadow 字符串里包含 `rgb(16, 185, 129)`（绿）；不包含 `rgb(168, 85, 247)`（紫） | DevTools Elements → computed 检查 |
| T2-T4 | rule | 一张主牌 + 选中：DOM 类名同时包含 `card-trump` 和 `card-selected`；最终绿框可见（视觉上绿盖金） | DevTools computed 阴影层叠 + 人工截图 |
| T2-R1 | rubric | AC14 区分度（0/1/2）按 spec | 色盲模拟 Deuteranopia 截图自评 |
| T2-R2 | rubric | AC15 操作顺滑度（0/1/2）按 spec；连续 3 轮出牌不出错 | 人工 3 轮点击操作日志 |

---

## Task 3：办二展示——庄家面板上固定渲染办二牌花面（对应 AC1 / AC16）

**Priority**：medium
**Dependencies**：需先确认后端 GameState 是否有 `banker_declared_rank` 字段；若缺失需补后端 models + engine 的 declared_rank 记录（1 处文件变动）
**修改边界（文件）**：
- 后端（如果缺字段）：`game/backend/models.py` GameState 新增 `banker_declared_rank: Optional[str] = None` 和 `banker_declared_suit: Optional[Suit] = None`；`game/backend/game_engine.py` declare_ban2 动作赋值这两个字段
- 前端：`game/frontend/src/pages/GameRoom.jsx` OpponentPanel 组件 / 本人面板副栏中，若 `state.banker_declared_rank === "2"` → 渲染 `<PlayingCard rank="2" suit={state.banker_declared_suit} isTrump faceDown={false}>` + 右侧 chip 标签「办二」
- 显示位置：
  - 庄家是 viewer_seat（本人是庄）：在下方手牌上方 / ActionButtons 左侧显示
  - 庄家是对手：在 TOP/LEFT/RIGHT 对手面板标题下显示

**本地测试要求（TR）**：

| TR ID | 类型 | 通过条件 | 证据 |
|-------|------|---------|------|
| T3-T1 | rule | 新建 +3 AI 房间，AI 办二声明成功后（phase → discard_bottom 前），庄家面板存在 rank="2" 的 PlayingCard，suit 与 `state.banker_declared_suit` 一致；标签「办二」 | Integrated Browser snapshot 找到该 card DOM |
| T3-T2 | rule | 非庄家座位（另一 browser tab 手动刷新到 viewer_seat≠banker）同样能看到办二展示 | 2 个 tab 对照截图 |
| T3-T3 | rule | settlement 后新 round 开始（phase=drawing again），旧办二消失；下一局新办二声明后再出现 | 2 局连续观察日志 |
| T3-R1 | rubric | AC16 位置直觉度（0/1/2）按 spec；3s 内识别"谁办了什么" | 人工自评 + 3s 录像 |

---

## Task 4：得分牌 + 扣底牌同屏一行，庄正他背（对应 AC9 / AC10 / AC17）

**Priority**：medium
**Dependencies**：Task 1 完成（DeckArea 位置可能会变到 StatusBar 下一行；先做完布局再来放）
**修改边界（文件）**：
- `game/frontend/src/components/DeckArea.jsx`：重写组件结构为 `<div className="flex flex-row justify-between items-center gap-4 w-full">`，左列「得分牌缩略」、右列「扣底」
- 得分牌左列：取 `state.tricks_history` 中本方队吃墩的所有牌 + 过滤 isScore（5/10/K）→ 渲染 12 张以内的缩小版 PlayingCard（`size="sm"`，宽 40px / 原宽 80px），附分数角标；超过 12 张显示 chip「+N」
- 扣底右列：
  - `viewer_seat === banker_seat OR phase === "settlement"` → 扣底 6 张正面；否则背面
  - 原底 4 张同样庄正他背（非庄 phase<settlement 看背面；settlement 看正面）
  - 底分数字标签 `底分=totalBottom+discardTotal`
- `game/frontend/src/components/PlayingCard.jsx`：新增 `size` prop（`md` 默认 / `sm` 缩小版），`sm` 时宽 40px 高 56px，文字缩小 70%
- `game/frontend/src/pages/GameRoom.jsx`：把 DeckArea 移到 StatusBar 下方、PlayArea 上方（一行横跨整宽），与 FR3「同一行得分+扣底」预期对齐

**本地测试要求（TR）**：

| TR ID | 类型 | 通过条件 | 证据 |
|-------|------|---------|------|
| T4-T1 | rule | 得分牌容器 + 扣底容器 二者 DOM 是兄弟元素，且父元素 `display:flex; flex-direction:row`；在 1280px 宽下 **不换行**（`flex-wrap` 为 `nowrap` 或 实际 computed 中 top 值相同） | DevTools flex 布局 + 两容器 top 值相同 |
| T4-T2 | rule | 庄家 tab：扣底 6 张 PlayingCard faceDown=false（渲染 rank/suit 文字）；非庄家 tab 同一局：扣底 6 张 PlayingCard faceDown=true（背面图案无 rank） | 2 个 tab 对照截图 |
| T4-T3 | rule | settlement 阶段：**4 个 viewer_seat** 的扣底 6 张都能看到 rank/suit 花面 | 4 次手动刷新 seat 各截 1 张图 |
| T4-T4 | rule | 得分牌区的每张 PlayingCard 都是 isScore=true（5/10/K），附角标数字与 cardScore(card) 一致 | Console 过滤非 isScore 牌集合，断言为空 |
| T4-R1 | rubric | AC17 简洁度（0/1/2）按 spec；1s 内可读底分且无溢出 | 人工自评 + 1s 计时 |

---

## Task 5：上一轮出牌保留直到新轮领出（对应 AC8 / AC18）

**Priority**：medium
**Dependencies**：Task 1 完成（PlayArea 四角落映射重写后再叠加上轮显示逻辑）
**修改边界（文件）**：
- `game/frontend/src/components/PlayArea.jsx`：
  - 计算 `lastTrick = state.tricks_history && state.tricks_history[state.tricks_history.length-1]`
  - 计算 `currentHasCards = Object.values(state.current_trick?.cards_by_seat || {}).filter(Boolean).length > 0`
  - 渲染选择：`currentHasCards ? renderTrick(state.current_trick, "current") : (lastTrick ? renderTrick(lastTrick, "last") : <空>)`
  - `renderTrick(trick, mode)`：`mode==="last"` 时外层加 `opacity-60 saturate-90`，加居中浮层标签 chip「上一轮」
- `game/frontend/src/pages/GameRoom.jsx`：保证 `state.tricks_history` 正常从 WS 接收（已序列化，但确认 GameState model_dump 包含 List[Trick]，若 tricks_history 有 fields 被 exclude 则补后端）
- 可选（若 tricks_history 未序列化）：`game/backend/models.py` 移除 tricks_history exclude（若存在）

**本地测试要求（TR）**：

| TR ID | 类型 | 通过条件 | 证据 |
|-------|------|---------|------|
| T5-T1 | rule | 第 1 墩打完（4 家都出完，current_trick→空）→ tricks_history.len=1 → PlayArea 显示 opacity=0.6 的上一轮 4 张，存在 chip「上一轮」 | Integrated Browser 截图 + opacity 计算值=0.6 |
| T5-T2 | rule | 下一轮第 1 张牌出现（领出者出 1 张，current_trick 有 1 张非空）→ PlayArea 立刻切换显示：当前 1 张牌 opacity=1.0，无「上一轮」标签，上一轮 4 张消失 | 两帧对照截图（刚打完 / 新第 1 张） |
| T5-T3 | rule | 仅保留 1 轮历史：`tricks_history.len=3` 时 PlayArea 只显示 `tricks_history[2]`（最后一个），不显示 tricks_history[0/1] | Console 打印 `tricks_history.map(t=>t.seat_order)` + PlayArea DOM 卡牌数量断言为 4（上轮）/ 1~4（当前轮） |
| T5-R1 | rubric | AC18 上轮/当前轮辨识度（0/1/2）按 spec；"这是哪一轮？"二选一答题 10 对 10 对 | 人工二选一问答（2 张截图 × 5 轮 = 10 题） |

---

## 任务依赖顺序

```
Task 1 (布局) →┬→ Task 3 (办二展示)
               ├→ Task 4 (得分 + 扣底)
               └→ Task 5 (上轮保留)
Task 2 (选中清空 + 绿框) 可与 Task 1 并行开发
```

**实现顺序建议**：T1 → T2 → T3 → T4 → T5。

---

## 最终通过条件

- 全部 5 个任务 `Status: completed`
- 每个任务 TR 中 rule 100% 真通过（不存在「假真」，必须附证据链接/截图）
- rubric 单项 ≥ 1.0，总 rubric 分 ≥ 9（共 6 项 AC13-18）
- 后端 3 个测试脚本 test_smoke / test_engine_direct / test_ws PASS
- 前端 `npx craco build` exit 0

_Review 阶段将独立重跑 rule 验证 + rubric 打分；Review 失败则把问题项插入 tasks.md 为 pending Issue 回到 Implement 阶段修。_
