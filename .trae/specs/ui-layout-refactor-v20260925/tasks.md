# 办二 Show Thumb - UI 重构 & 修复 V2 - 实现计划

> 覆盖：AC-1 ~ AC-14；依赖 GameRoom.jsx / StatusBar / ActionButtons / PlayArea / TributeArea / game_engine.py / routes_ws.py / models.py
> 关键前置：不修改任何现有 engine 规则判定（甩/杀/上供表），只修：visibility、hand_count 同步、phase 文案抽离、lastMode overlay、准备按钮。

---

## Task 1: Phase 文案抽离到独立文件（FR-5 / AC-7）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建文件 `game/frontend/src/config/phases.js`，纯数据文件（不 import react/组件）。
  - 文件头注释：`// 办二游戏各阶段显示文案 —— 可直接在此文件修改，保存后前端 HMR 立即生效。`
  - 把 [StatusBar.jsx:L62-L73](file:///d:/Aiproject1/EA/website/game/frontend/src/components/StatusBar.jsx#L62-L73) 内 `const PHASE_ZH = {...}` 共 10 条 key 搬过去，内容保持不变（用户自行修改后续）。
  - StatusBar.jsx 修改 import：`import PHASE_ZH from "@/config/phases";` 删除组件内 PHASE_ZH 定义。
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-1.1: `ls game/frontend/src/config/phases.js` 存在；Grep 文件前 5 行有"办二游戏各阶段显示文案"注释；Grep StatusBar.jsx `PHASE_ZH` 仅 1 处（import）+ 1 处引用 `PHASE_ZH[state.phase]` 且不定义 PHASE_ZH。
  - `rule` TR-1.2: `npx craco build` exit 0。
- **Notes**: 不改动 PHASE_ZH 的 key 名（waiting / drawing / flip_bottom / discard_bottom / tribute_select / tribute_distribute / tribute_return / playing / reveal_bottom / settlement），确保与 state.phase 枚举匹配。

---

## Task 2: 后端 — 上供 hand_count 同步（FR-3.2 / AC-5）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None（与 Task 1/T3/T4 并行）
- **Description**:
  - 在 game_engine.py 找到动作 `do_tribute_distribute`（分配上供牌 → 庄家 / 对家）结束处：把 banker_seat 和 partner_seat 的 hand_count 根据**实际计入 hand 的牌数**更新：公式 `banker_seat.hand_count += (实际自留张数)`；`partner_seat.hand_count += (实际分给对家张数)`。
  - 在动作 `settle_tribute_return` 结算完还牌 → 三人 hand 实际增删之后：更新 `giver_seat.hand_count = len(state.players[giver_seat].hand)`；`banker_seat.hand_count = len(state.players[banker_seat].hand)`；`partner_seat.hand_count = len(state.players[partner_seat].hand)`（直接读 hand.length 兜底最可靠，**不依赖公式硬算**，避免公式和实际手算不一致）。
- **Acceptance Criteria Addressed**: AC-5, AC-9（间接：smoke 通过）
- **Test Requirements**:
  - `rule` TR-2.1: 改 `test_smoke.py` 新增一步：在 `phase=playing` 的第一手（round 2，因为 smoke 第 1 局后结算有 tribute/return）断言：`all(state.players[s].hand_count == len(state.players[s].hand) for s in [0,1,2,3])` —— 即 hand_count 与真实 hand 长度严格相等，不等则 smoke fail。
  - `rule` TR-2.2: `python game/test_smoke.py` exit code 0。
- **Notes**: 如果 engine 里 hand_count 是 computed 属性（检查 models.py 里 `hand_count` 是字段还是 @computed_field）；若已经是 computed field 则 TR-2.1 必过；那只需要**验证**是 computed 即可，无需写逻辑。若为 int 字段则必须按上述步骤同步。

---

## Task 3: 后端 — 上供 Tribute 非庄家可见背面（FR-3.1 / AC-4, AC-14）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None（与 T1/T2/T4 并行）
- **Description**:
  - `mask_state_for_viewer` [game_engine.py:L880-L904](file:///d:/Aiproject1/EA/website/game/backend/game_engine.py#L880-L904) 中：
    - `phase == "tribute_distribute"`：**不再** `if viewer_seat != banker_seat: masked.tribute_cards = []`；而是保留 `tribute_cards` 的 **count**（张数不敏感），**每张 rank/suit 清空**或改 faceDown 标记（若 model 有 face_down 字段）——这里推荐方式：**mask 时把 tribute_cards 的 rank=?, suit=?, id=保留（不改变 count）**，这样前端渲染时显示为背面。**注**：当前 `tribute_distribute` UI 在 [TributeArea.jsx:L40-L93](file:///d:/Aiproject1/EA/website/game/frontend/src/components/TributeArea.jsx#L40-L93) 读取 `state.tribute_selected_cards` 字段（check models.py 字段名；如果实际上是 tribute_cards / tribute_selected_cards 双字段，择其一 mask 即可）。
    - `phase == "tribute_return"`：同上，`cards_to_banker / cards_to_banker_partner` 给非对应 seat 时**保留 count，牌面置 ?**（rank=suit=joker_small 或 空 joker faceDown）。
  - **注意**：tribute_giver（上家/输方）始终**不能**看到 banker 或 banker_partner 各自拿到了哪张（只能看到一共 N 张分配，不能看 rank/suit）。
- **Acceptance Criteria Addressed**: AC-4, AC-14
- **Test Requirements**:
  - `rule` TR-3.1: 写一个 `test_engine_direct` 小脚本（加在 `test_engine_direct.py` 末尾，若已有则 append；无则新建），构造 tribute_distribute 状态，viewer_seat = 无关 seat，检查 `masked.tribute_selected_cards` 长度 > 0 且每张 card 的 rank ∉ {2-9,J,Q,K,A,10} 或 suit 为空（即全被 mask 为 ?/背面）—— 如 `all(c.rank in ['?','joker_small',''] for c in masked.tribute_selected_cards)` 则过。
  - `rule` TR-3.2: 同上脚本 tribute_return phase，viewer_seat ≠ banker 时 `masked.cards_to_banker` 每张 rank ∉ {2-9,J,Q,K,A}；viewer_seat ≠ banker_partner 时 cards_to_banker_partner 每张同上。
- **Notes**: 推荐在 Card model 临时加一个**前端只读**字段 `face_down: bool = False`（Pydantic Optional，不存）；mask 时把需要隐藏的牌 `card.face_down = True`，前端 PlayingCard 读取 `card.face_down` 优先显示背面。不引入新字段也可：前端 `cards_to_banker.map(c => viewerSeat != banker ? { ...c, faceDown: true } : c)` 前端直接包一层；但 mask 端做更安全（隐私裁剪保持 server-authoritative）。

---

## Task 4: 后端 — 准备按钮 + 新局兜底超时（FR-6 / AC-8, AC-9, AC-10）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None（与 T1/T2/T3 并行）
- **Description**:
  - models.py GameState 新增字段：`ready_seats: Set[int] = set()`（Pydantic v2 `Set` 用 typing.Set；记得 model_dump 默认要能序列化 set → list，检查 model_dump_config；若 set 序列化麻烦则用 `ready_seats: list[int] = []`，保持 uniqueness 在写入端判断）。
  - game_engine.py 新增动作 `mark_ready(state, seat)`：若 seat 不重复则 append；**触发 ready 后立即检测**：所有 `p.is_ai == False` 的 seat 是否都 ∈ ready（或 list）。是 → 立即 `do_next_round(state)`。
  - 同时加**兜底超时自动开新局**：在 room_manager.py 的 AI 自玩 tick（`maybe_trigger_ai_actions`）中，若 `state.phase == "settlement"` 且 state 自 settlement 起已经 >= 30 秒（记录 `state.settlement_started_at = time.time()`，或用 state.touch 的最近时间戳比较），则不论 ready 是否齐全，**强制 do_next_round**，防止房间死锁。另外 4 AI 全 AI 房间用 5 秒超时。
  - routes_ws.py 新增 WebSocket 消息 type `"ready"`，payload `{}`；服务端校验 seat（player seat）后调用 `mark_ready(state, seat)`，广播 state_update。
- **Acceptance Criteria Addressed**: AC-8, AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-4.1: test_engine_direct 造 settlement 状态：seat 0 非 AI， seat 1/2/3 AI → 只 mark_ready(0) → 1 秒内 phase==drawing（因为 1/2/3 AI 自动 ready，只要真人准备好了即可）。
  - `rule` TR-4.2: 同上场景但**不** call mark_ready(0) → 30 秒后（脚本里 `time.sleep` 太慢的话 monkey patch settlement_started_at -= 30 秒来模拟，避免真 sleep），1 秒内 phase 切 drawing（兜底超时生效，AC-10 协议兼容）。
  - `rule` TR-4.3: test_smoke（4 AI）exit 0，日志里 Round 2 出现（符合 AC-9）。
- **Notes**: settlement_started_at 加在 GameState 里，`settlement` 切换那一刻赋值为 `time.time()`；ready_seats 在 do_next_round 开头第一行清空。

---

## Task 5: 后端修改后跑全量 smoke（Task 2/3/4 汇总验证）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 3, Task 4
- **Description**:
  - 综合 Task 2/3/4，跑 `python game/test_smoke.py` exit 0；跑 `test_engine_direct.py` 加的 2 个用例（TR-3.1/3.2, TR-4.1/4.2）exit 0。
- **Acceptance Criteria Addressed**: AC-5, AC-4, AC-14, AC-8, AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-5.1: 两个测试文件 $LASTEXITCODE 都为 0；grep 输出日志关键字（Round 2 / drawing 含 round=2）。
- **Notes**: test_engine_direct 不依赖 WSGI / WS，纯 import game_engine 直接跑，速度快。

---

## Task 6: 前端 — 牌桌容器 PokerTable + 外三层拆分（FR-1 / AC-1, AC-2）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 完成（StatusBar 引用改完，避免 StatusBar 版本双写）
- **Description**:
  - 新建组件 `game/frontend/src/components/PokerTable.jsx`：外层 div `.poker-table` 样式 `rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 ring-1 ring-emerald-700/30 shadow-2xl p-2 md:p-3`（翡翠绿桌布）；`min-h-[480px] md:min-h-[540px]`；内部**绝对定位**四边（BOTTOM/RIGHT/TOP/LEFT）：
    - TOP 边：P2 对手面板（原 OpponentPanel partner fan）
    - RIGHT 边：P1 对手面板（上家）
    - LEFT 边：P3 对手面板（下家）
    - CENTER（绝对 top 1/2 left 1/2 translate 居中）：PlayArea（只显示牌，T3 已去文字）
    - CENTER-LOWER（在 PlayArea 之下 z-index 低于 PlayArea，相对中心下方）：DeckArea / TributeArea（当 phase=tribute/return 时替换 DeckArea）
    - BOTTOM（紧贴 table 底部下方，注意 BOTTOM 手牌在 table 内）：ActionButtons + 本人（BOTTOM P0）庄面板/办二展示 + HandCards
    - 四边 4 家 OpponentPanel 的名字 / P? / 队 / 庄/对家 / ×N 张（手牌数）**保留**（用户要求牌桌内显示名字与牌数），只把 PlayArea 内的 chip 去掉（上一轮 T3 已完成，不需要再改）。
  - GameRoom.jsx 重构：最外层 `<div>` 里，先放一行（`.flex gap-2 items-center`）：① `大厅` Home 按钮 ② `<div className="flex-1">` 放**新的 TopInfoBar（综合 Phase 文案 + 主 + 庄 + 对家 + 副家分 + 当前出牌 一行）** ③ 房间号 chip。然后第二行只有 `<PokerTable>...把4家/Center/Deck/Button/HandCards塞进去...</PokerTable>`。**桌面外不存在任何 OpponentPanel / HandCards / ActionButtons 组件**（PokerTable 内包了）。
  - 新 TopInfoBar 简化：把 StatusBar 原来多 chip 改成**一整条 chip**（减少 padding 叠加纵向空间），示例：`「第 1 轮 · 出牌阶段 | 主：♥红桃 | 庄：AI-右(P4) | 对家：AI-左(P2) | 副家 A：15/100 | 当前出牌：P1（你）」` 一条，不再拆 6 个独立 chip。
  - 尺寸：整页 padding 改成 `p-1 landscape:max-[900px]:p-0.5`（原来 `p-2 md:p-4` 太大），gap 统一 1 或 2，不出现 `gap-4`。
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `rule` TR-6.1: browser_evaluate 检查 `.poker-table` 内部有 4 家 `OpponentPanel`（或内部 class）、PlayArea、DeckArea/TributeArea、ActionButtons、HandCards；桌面外 `.poker-table` 之上/下 找 OpponentPanel/PlayArea/HandCards 计数 = 0。
  - `rule` TR-6.2: DevTools 1366×768，phase=playing 12 张手牌齐，`document.documentElement.scrollHeight <= clientHeight`（AC-2，纵向不滚动）。
  - `rubric` TR-6.3: 视觉紧凑度（与 FR-7 关联）：scale 1-5，1= 某阶段挤压重叠；3= 能看但间距小；5= 各组件不重叠，留最小视觉呼吸。通过阈值 >=4。Evidence=4 个阶段 screenshot 肉眼比对。
- **Notes**: 注意 BOTTOM（本人）面板是 PokerTable 的**内部底边**，不是飘在 table 外；这样桌面外就只剩 T1（Home/TopInfo/房间号）3 条，符合 FR-1。

---

## Task 7: 前端 — lastMode 1.5s 叠层淡入淡出（FR-2 / AC-3）
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6（PlayArea 在 PokerTable 内部，用 relative 包 overlay；Task6 完成后再包）
- **Description**:
  - PlayArea.jsx 外层（或 PokerTable.jsx 里的 PlayArea 调用点外围）包一层 `<div className="relative">`。
  - 新增组件/子组件 `LastTrickOverlay`：
    - 监听 `state.tricks_history.length`，当 length 增加 1 时记录 `showUntil = Date.now() + 1500`（1500ms）。
    - `Date.now() < showUntil` 期间 mount 叠层 `<div className="last-trick-overlay absolute inset-0 z-10 ...">`：
      - 0 ~ 1000ms → `opacity: 0.88`（停留）
      - 1000ms ~ 1500ms → 线性 `opacity: 0.88 → 0`（fade）
      - 1500ms 之后 remove。
    - 叠层里**完全复刻** PlayArea 原 4 位置 dp 0/1/2/3 的扑克牌布局（同样的 seatsOfDp / PlayingCard size="sm"），只不过 source 是 `state.tricks_history[length-1].cards_played`（上一轮），而不是 current_trick。
  - 期间 current_trick 新牌正常显示（因为叠层 z-index 更高 + 透明度 0.88，底下新牌隐约能看到；不影响点击出/跟牌，因为 current_trick 按钮/手牌不在 PlayArea 叠层范围内）。
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `rule` TR-7.1: browser_evaluate 挂 MutationObserver 监听 `.last-trick-overlay` 节点 mounted / unmounted：当 tricks_history 变化时，节点 mounted 起持续时间 ∈ [1300ms, 1700ms]（允许 ±200ms 误差），否则 fail。
  - `rule` TR-7.2: 叠层存在期间，`.last-trick-overlay` 的 innerHTML 里包含 4 组 dp 位置的 PlayingCard（至少有 4 个 `.card` 节点或 4 张牌的 id 匹配 tricks_history.last 数据）。
- **Notes**: 若怕 fade 用纯 css transition + React state 更好写：state `overlayVisible = false` + `overlayFading = false`；当 length 增加 → `setVisible(true); setTimeout(1000, setFading(true)); setTimeout(1500, setVisible(false))`；CSS `.lto { transition: opacity 0.5s linear; } .lto.visible:not(.fading) { opacity:0.88 } .lto.fading { opacity:0 }`。

---

## Task 8: 前端 — 办二按钮无 2 时不渲染 + 准备按钮替换下一局（FR-4, FR-6.1-6.4 / AC-6, AC-8）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5（后端 ready 接口已加），Task 6（ActionButtons 已在 PokerTable 中）
- **Description**:
  - ActionButtons.jsx `phase === "drawing"` 部分（[L63-L83](file:///d:/Aiproject1/EA/website/game/frontend/src/components/ActionButtons.jsx#L63-L83)）：
    - 加一行判断：`const hasRank2 = viewerHand.some(c => c.rank === '2' && !c.is_joker);`
    - 若 `!hasRank2` ：**完全不 return 办二 <button>**（现在是 disabled），同时去掉按钮的描述文字中"选中 2 来办二"相关，只保留摸牌按钮一行 + 宽度 flex-1 不占空白布局。
  - ActionButtons.jsx `phase === "settlement"` 部分（[L43-L60](file:///d:/Aiproject1/EA/website/game/frontend/src/components/ActionButtons.jsx#L43-L60)）：
    - 去掉「下一局」按钮；改成：
      - 左侧 chip 显示 `已准备 ${readyCount} / ${humanTotal}（AI 已自动准备）`，其中 readyCount = `state.ready_seats?.filter(s => !state.players.find(p=>p.seat===s)?.is_ai).length`；
      - 中间显示"全员真人准备完将自动开启新局，30 秒未准备完服务器自动开"（小字）；
      - 右侧「准备」按钮，`me.seat ∈ ready_seats` 时 disabled + 灰态，文字"已准备 ✓"；未准备则 enabled，点时调用 WS `ready` 动作（前端 actions 要加 `ready: wrap(actions.ready, false)`）。
    - 同时 ResultModal 也去掉「下一局」按钮（原来 ResultModal 有 onNext 调 nextRound），改成 onClose → 收起；onNext → 调用 `actions.ready()` 或直接关闭 + 显示下方 ActionButtons 准备按钮（让用户在 ActionButtons 里点准备，避免两个入口重复）。
- **Acceptance Criteria Addressed**: AC-6, AC-8
- **Test Requirements**:
  - `rule` TR-8.1: 构造 drawing 阶段 mock viewerHand 全非 2（含 A/K/Q/J/10-3 共 12 张），browser_evaluate `document.querySelectorAll('button').text` 中不含"办二"。
  - `rule` TR-8.2: settlement 阶段且我未准备 → 页面有「准备」按钮，按钮点击后 1s 内我 seat ∈ state.ready_seats；按钮变灰"已准备 ✓"。另一个真人玩家 seat 也点准备后 ≤1s 后 phase 切 drawing。
- **Notes**: 前端 `rawActions`（useGameSocket hook）需要支持 ready 动作：检查 hooks/useGameSocket 里 send 逻辑，一般是 `send({type:'ready'})`；在 actions 对象里补充，无则加。

---

## Task 9: 响应式 4 档 viewport + 集成回归（FR-7, NFR-1 / AC-2, AC-11, AC-12, AC-13）
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6, Task 7, Task 8（布局/组件全部完成后）
- **Description**:
  - CSS 调整：
    - 桌面（≥1280px）：`.card-size-sm` 高度 68px（原 72px，缩 6%）；PokerTable `min-h-[540px]`；手牌 base 高度 100px。
    - 横屏手机（max-width 900px landscape）：`.card-size-sm` 高度 60px；PokerTable `min-h-[0] h-[calc(100vh-48px)]`（填满屏减去 T1 顶栏 48px）；手牌缩到 80% scale（CSS transform）；ActionButtons 字体 12px。
    - 竖屏手机（≤430px portrait）：组件纵向堆叠，PokerTable 不设高度，`min-h-[580px]`；允许 body 纵向滚动 `overflow-y: auto`；TopInfoBar 可折行（flex-wrap，若太长不截断）。
  - Integrated Browser 跑 4 档 viewport：
    - ① 1366×768：检查 scrollHeight <= clientHeight（AC-2）
    - ② 1920×1080：不要求特别，但内容完整不溢出
    - ③ 667×375 landscape：max right <= viewport.width（AC-11）
    - ④ 375×667 portrait：每个组件都能通过滚动完整看到（AC-13）
- **Acceptance Criteria Addressed**: AC-2, AC-11, AC-12, AC-13
- **Test Requirements**:
  - `rule` TR-9.1（1366×768）：scrollHeight ≤ clientHeight。
  - `rule` TR-9.2（667×375）：`Math.max(...所有可见节点rect.right) <= 667 + 2`。
  - `rule` TR-9.3（375×667）：每个可见节点的 min(rect.bottom) <= 667 存在一个滚动位置。
  - `rubric` TR-9.4（即 AC-12）：4 档综合评分，阈值 ≥4。Evidence=4 档 screenshot + 测量脚本日志。
  - `rule` TR-9.5: `npx craco build` exit 0（集成回归）。

---

## 任务依赖图（简化）
```
并行开始：T1 T2 T3 T4
          |  |  |  |
          v  v  v  v
          T5 (后端综合smoke)
          |
          T1 -> T6 (PokerTable容器化)
                    |
     +--------------+--------------+
     v              v              v
     T7 (lastMode) T8 (办2+准备)  |
     +--------------+--------------+
                    v
                   T9 (4档响应式+集成回归)
```

总数量：9 tasks，并行度 4（T1/T2/T3/T4 可同时开始），总计预计 ~2-3 轮工具调用后全部 complete。
