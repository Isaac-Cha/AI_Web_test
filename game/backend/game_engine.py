from __future__ import annotations

import logging
import random
import time
import uuid
from typing import Dict, List, Optional, Tuple, TYPE_CHECKING

from . import card_utils as cu
from .models import (
    Card,
    CreateRoomReq,
    GamePhase,
    GameState,
    Player,
    RoundResult,
    Suit,
    Trick,
    seat_team,
    teammate_seat,
    next_seat,
)

if TYPE_CHECKING:
    from .room_manager import RoomManager

log = logging.getLogger("show_thumb.engine")


# ================================================================
#  1. 房间创建 / 玩家加入 / 开局
# ================================================================

def create_new_room(room_id: Optional[str] = None) -> GameState:
    if room_id is None:
        room_id = uuid.uuid4().hex[:8].upper()
    state = GameState(room_id=room_id)
    state.log(f"房间 {room_id} 创建完成，等待玩家加入…")
    return state


def add_player(state: GameState, name: str, seat_hint: Optional[int] = None,
               is_ai: bool = False) -> Tuple[int, str]:
    """添加一名玩家到房间。返回 (座位号, player_id)。seat_hint 仅当空位可用时生效。"""
    if state.phase != "waiting":
        raise ValueError("游戏已开始，不能加入")
    taken = set(state.players.keys())
    available = [s for s in (0, 1, 2, 3) if s not in taken]
    if not available:
        raise ValueError("房间已满（4人）")
    seat = seat_hint if seat_hint in available else available[0]
    player = Player(name=name, seat=seat, team=seat_team(seat), is_ai=is_ai)
    state.players[seat] = player
    state.log(f"{_player_tag(state, seat)} 加入了房间 (座位{seat+1})", level="success", seat=seat)
    state.touch()
    return seat, player.id


def remove_player(state: GameState, player_id: str) -> None:
    """仅 waiting 阶段允许踢人/离开。"""
    if state.phase != "waiting":
        return
    for s, p in list(state.players.items()):
        if p.id == player_id:
            state.players.pop(s, None)
            state.log(f"{p.name} 离开了房间", level="warn")
            state.touch()
            return


def start_game(state: GameState) -> None:
    """当 4 名玩家就绪后由第一位（或房主）触发进入第一局。"""
    if state.phase != "waiting":
        raise ValueError("已经在游戏中")
    if len(state.players) != 4:
        raise ValueError("还没有 4 名玩家")
    # 第一局：随机选一个座位当「起摸玩家」，但庄家未定（等办二或翻底）
    starter = random.choice(list(state.players.keys()))
    state.current_seat = starter
    state.round_number = 1
    _begin_round(state, is_first_round=True)
    state.touch()


# ================================================================
#  2. 局初始化（摸牌前）—— 处理上一局的换庄/上供继承
# ================================================================

def _begin_round(state: GameState, *, is_first_round: bool) -> None:
    # 2.1 决定本局庄家
    if is_first_round:
        # 首局庄家未定（由办二者决定；若翻底则首局若没人办二会直接重洗）
        for s, p in state.players.items():
            p.is_banker = False
        # tribute_count 第一局为 0
        state.tribute_count = 0
        state.tribute_giver = None
        state.tribute_giver_partner = None
    else:
        prev = state.prev_result
        assert prev is not None
        # 把 prev_result.new_banker_seat 设为 is_banker
        for s, p in state.players.items():
            p.is_banker = (s == prev.new_banker_seat)
        state.tribute_count = prev.tribute_count
        # 上供者默认 = 庄家下家
        default_giver = next_seat(prev.new_banker_seat)
        state.tribute_giver = prev.tribute_giver_seat if prev.tribute_giver_seat is not None else default_giver
        state.tribute_giver_partner = teammate_seat(state.tribute_giver)
        # 注意：3.2 最后一条的例外（若翻底者是默认上供者则改翻底者对家）
        # 这个 prev.tribute_giver_seat 已经在结算时处理好了，直接用

    # 2.2 清所有牌 / 主牌 / 上供中间态
    state.deck = cu.shuffle_deck(cu.build_deck_54())
    state.bottom_cards = []
    state.bottom_flipped = []
    state.bottom_score = 0
    state.bottom_visible_to = []
    state.reveal_flip_index = 0
    state.trump_suit = None
    state.trump_rank = None
    state.declared_by = None
    state.declare_method = "none"
    state.tribute_cards = []
    state.tribute_distribution = {}
    state.cards_to_banker = []
    state.cards_to_banker_partner = []
    state.return_from_banker = []
    state.return_from_banker_partner = []
    state.banker_decline = False
    state.banker_partner_decline = False
    state.current_trick = None
    state.tricks_history = []
    state.defender_total_score = 0
    state.last_trick_is_trump_win = False
    state.bottom_captured = False
    state.reveal_flip_index = 0
    for s, p in state.players.items():
        p.hand = []
        p.hand_count = 0
        p.tribute_selected = []
        p.return_cards_selected = []
        p.decline = False

    # 2.3 当前操作人：首局的 current_seat 已在 start_game 设为「起摸玩家」
    #   非首局：由庄家起摸（规则 8.1）
    if not is_first_round:
        bs = state.banker_seat
        assert bs is not None
        state.current_seat = bs

    # 2.4 本局副家队伍（在确定 banker 后）
    bs = state.banker_seat
    if bs is None:
        state.defender_team = None  # 首局未办二前暂缺
    else:
        state.defender_team = "B" if seat_team(bs) == "A" else "A"

    state.phase = "drawing"
    state.log(f"—— 第 {state.round_number} 局开始 · 当前该 {_player_tag(state, state.current_seat)} 摸牌 ——",
              level="info")
    state.touch()


# ================================================================
#  3. 摸牌 & 办二
# ================================================================

def do_draw_card(state: GameState, seat: int) -> None:
    if state.phase != "drawing":
        raise ValueError("当前不是摸牌阶段")
    if seat != state.current_seat:
        raise ValueError("还没轮到你摸牌")
    player = state.players[seat]
    if player.hand_count >= 12:
        raise ValueError("你已经摸够 12 张了")
    if not state.deck:
        raise ValueError("牌堆已空")
    card = state.deck.pop()
    player.hand.append(card)
    player.sync_hand_count()
    state.log(f"{_player_tag(state, seat)} 摸了一张牌", seat=seat)

    # 摸完这张后，若 trump_suit 未定且这张是花色 2 → 提示可办二（前端按钮根据 card.rank==2 判断）

    # 切换到下一位，或 48 张摸完 → 进入办二/翻底判断
    all_12 = all(p.hand_count == 12 for p in state.players.values())
    if not all_12:
        state.current_seat = _next_drawing_seat(state, seat)
        state.touch()
        return

    # ===== 48 张全部摸完 =====
    # bottom_cards = 剩余的 6 张
    state.bottom_cards = list(state.deck)
    state.deck = []

    if state.trump_suit is not None:
        # 已经办二过 → 直接进入 banker_draw
        _enter_banker_draw(state)
        return

    # trump_suit is None
    if state.round_number == 1 or state.banker_seat is None:
        # 首局没人办二 → 重新洗牌发牌（规则3.2）
        state.log("首局 48 张无人办二，重新发牌…", level="warn")
        _begin_round(state, is_first_round=True)
        return
    else:
        # 后续局 → 翻底定主，由副家（非庄家）谁点谁翻
        state.phase = "flip_bottom"
        state.bottom_flipped = []
        state.current_seat = -1  # 表示任意副家可点「翻底」
        banker_s = state.banker_seat
        state.log(f"48 张无人办二，进入翻底定主阶段（副家玩家点击『翻底定主』翻牌）", level="warn")
        state.touch()


def _next_drawing_seat(state: GameState, after_seat: int) -> int:
    """轮流一人一张往下摸（跳过 hand_count 已达 12 的人一般不会发生）"""
    return next_seat(after_seat)


def do_declare_ban2(state: GameState, seat: int, card_id: str) -> None:
    if state.phase not in ("drawing", "flip_bottom"):
        raise ValueError("当前不能办二")
    if state.trump_suit is not None:
        raise ValueError("已经办二/定主过了")
    player = state.players[seat]
    card = next((c for c in player.hand if c.id == card_id), None)
    if card is None or not card.is_rank2:
        raise ValueError("你手里没有这张 2")
    # 设置主牌
    state.trump_suit = card.suit
    state.trump_rank = "2"
    state.declared_by = seat
    state.declare_method = "ban2"
    state.log(
        f"{_player_tag(state, seat)} 办二！主牌花色为 {cu.SUIT_NAMES_CN[card.suit]} {cu.SUIT_SYMBOLS[card.suit]}",
        level="success", seat=seat
    )

    # 首局：办二者成为庄家
    if state.round_number == 1 or state.banker_seat is None:
        for s, p in state.players.items():
            p.is_banker = (s == seat)
        state.defender_team = "B" if seat_team(seat) == "A" else "A"
        state.log(f"{_player_tag(state, seat)} 成为本局庄家 🏠", level="success", seat=seat)
    else:
        # 后续局：办二只定主，庄家不变（规则3.1）
        pass

    # 若已摸完 48 张 → 进入拿底牌
    all_12 = all(p.hand_count == 12 for p in state.players.values())
    if all_12:
        _enter_banker_draw(state)
        return
    # 否则继续摸牌
    state.touch()


# ================================================================
#  4. 翻底定主
# ================================================================

def do_flip_bottom(state: GameState, flipper_seat: int) -> None:
    if state.phase != "flip_bottom":
        raise ValueError("当前不是翻底阶段")
    banker_s = state.banker_seat
    if banker_s is None or seat_team(flipper_seat) == seat_team(banker_s):
        raise ValueError("只能由副家翻底")
    if len(state.bottom_flipped) >= 6:
        raise ValueError("6 张底牌已经翻完")

    # 翻下一张
    next_idx = len(state.bottom_flipped)
    card = state.bottom_cards[next_idx]
    state.bottom_flipped.append(card)
    state.log(f"{_player_tag(state, flipper_seat)} 翻开第 {next_idx+1}/6 张底牌：{card.rank}{cu.SUIT_SYMBOLS.get(card.suit,'?')}",
              level="info", seat=flipper_seat)

    # 第一张 2 立刻定主
    if state.trump_suit is None and card.rank == "2" and not card.is_joker:
        state.trump_suit = card.suit
        state.trump_rank = "2"
        state.declared_by = flipper_seat
        state.declare_method = "flip"
        state.log(f"翻到 2！主牌花色：{cu.SUIT_NAMES_CN[card.suit]} {cu.SUIT_SYMBOLS[card.suit]}",
                  level="success")

    # 6 张都翻完 → 定主收尾
    if len(state.bottom_flipped) == 6:
        if state.trump_suit is None:
            suit, status = cu.decide_trump_from_bottom(state.bottom_cards)
            if suit is None:
                # 无缺门 → 重洗（跳过本应的上供？规则说："重新洗牌发牌，若有上供则无需再上供"）
                state.tribute_count = 0
                state.tribute_giver = None
                state.log("6 张底牌无 2 且 4 花色齐全，重新洗牌发牌（本次不再上供）", level="warn")
                _begin_round(state, is_first_round=False)
                return
            else:
                state.trump_suit = suit
                state.trump_rank = None
                state.declared_by = flipper_seat
                state.declare_method = "flip"
                if status == "missing_suit":
                    state.log(f"底牌缺 {cu.SUIT_NAMES_CN[suit]}，主牌花色定为：{cu.SUIT_SYMBOLS[suit]}",
                              level="success")
        # 3.2 的例外：翻底者是「默认上供者=庄家下家」→ 上供者改成翻底者对家
        default_giver = next_seat(banker_s)
        if flipper_seat == default_giver:
            new_giver = teammate_seat(flipper_seat)
            state.tribute_giver = new_giver
            state.tribute_giver_partner = teammate_seat(new_giver)
            state.log(f"翻底者恰好是默认上供者（庄家下家），改为 {_player_tag(state, new_giver)} 上供",
                      level="warn")
        # 进入拿底牌
        _enter_banker_draw(state)
        return
    state.touch()


# ================================================================
#  5. 庄家拿底牌 + 扣底
# ================================================================

def _enter_banker_draw(state: GameState) -> None:
    assert state.trump_suit is not None
    banker_s = state.banker_seat
    assert banker_s is not None
    banker = state.players[banker_s]
    # 剩余 6 张（未发的）= bottom_cards，如果之前没赋值过这里赋值
    if not state.bottom_cards:
        state.bottom_cards = list(state.deck)
        state.deck = []
    for c in state.bottom_cards:
        banker.hand.append(c)
    banker.sync_hand_count()  # 12 + 6 = 18
    cards_added = list(state.bottom_cards)
    state.bottom_cards = []
    state.log(f"庄家 {_player_tag(state, banker_s)} 拿到了 {len(cards_added)} 张底牌（当前手牌 {banker.hand_count} 张）",
              level="info", seat=banker_s)

    # 直接进入扣底
    state.phase = "discard_bottom"
    state.current_seat = banker_s
    state.touch()


def do_discard_bottom(state: GameState, banker_seat: int, card_ids: List[str]) -> None:
    if state.phase != "discard_bottom":
        raise ValueError("当前不是扣底阶段")
    if banker_seat != state.banker_seat or state.current_seat != banker_seat:
        raise ValueError("只有庄家可以扣底")
    banker = state.players[banker_seat]
    if len(card_ids) != 6:
        raise ValueError("必须扣 6 张底牌")
    by_id = {c.id: c for c in banker.hand}
    chosen: List[Card] = []
    for cid in card_ids:
        if cid not in by_id:
            raise ValueError("选择的牌不在手牌中")
        chosen.append(by_id[cid])
    # 从手牌移除
    banker.hand = [c for c in banker.hand if c.id not in by_id or c.id not in set(card_ids)]
    # 上面这行逻辑：保留 c.id 不在 card_ids 里的
    kept: List[Card] = []
    removed = set(card_ids)
    for c in banker.hand:
        if c.id in removed:
            continue
        kept.append(c)
    banker.hand = kept
    banker.sync_hand_count()  # 12
    state.bottom_cards = chosen
    state.bottom_score = cu.cards_score(chosen)
    state.bottom_visible_to = [banker_seat]
    state.log(
        f"庄家扣底 6 张（底牌分 {state.bottom_score} 分），仅庄家可见",
        level="info", seat=banker_seat
    )

    # 进入上供 / 出牌
    if state.tribute_count > 0 and state.tribute_giver is not None:
        giver = state.tribute_giver
        # 但还需要再判断一次「例外：下家自己办二或翻底 → 改对家上供」（规则5.2）
        default_giver = next_seat(state.banker_seat)
        if giver == default_giver and state.declared_by == default_giver:
            # 下家自己办二或翻底 → 对家上供
            giver = teammate_seat(default_giver)
            state.tribute_giver = giver
            state.tribute_giver_partner = teammate_seat(giver)
            state.log(f"庄家下家自己办二/翻底定主，改为 {_player_tag(state, giver)} 上供", level="warn")
        state.phase = "tribute_select"
        state.current_seat = giver
        state.log(f"—— 上供阶段：{_player_tag(state, giver)} 选择上供的 {state.tribute_count} 张牌（须为最大主牌非分牌）——",
                  level="info")
    else:
        _enter_playing(state)
    state.touch()


# ================================================================
#  6. 上供
# ================================================================

def do_select_tribute(state: GameState, giver_seat: int, card_ids: List[str]) -> None:
    if state.phase != "tribute_select":
        raise ValueError("当前不是上供选牌阶段")
    if state.tribute_giver is None or giver_seat != state.tribute_giver:
        raise ValueError("不是你上供")
    if state.current_seat != giver_seat:
        raise ValueError("还没轮到你操作")
    giver = state.players[giver_seat]
    ok, should, err = cu.validate_tribute_selection(
        giver.hand, card_ids, state.tribute_count, state.trump_suit
    )
    if not ok:
        # 强制修正：用 should 作为实际选择
        if not should and state.tribute_count > 0:
            # 玩家其实一张都拿不出来（无符合条件的主）。允许 0 张通过。
            chosen: List[Card] = []
        else:
            raise ValueError(err)
    else:
        chosen = should
    # 从上供者手牌移除
    chosen_ids = {c.id for c in chosen}
    giver.hand = [c for c in giver.hand if c.id not in chosen_ids]
    giver.sync_hand_count()
    state.tribute_cards = chosen
    state.log(
        f"{_player_tag(state, giver_seat)} 上供了 {len(chosen)} 张牌：{_cards_summary(chosen)}",
        level="info", seat=giver_seat
    )
    # 进入「上供者对家」分配阶段
    distributor = teammate_seat(giver_seat)
    state.tribute_giver_partner = distributor
    state.phase = "tribute_distribute"
    state.current_seat = distributor
    state.log(f"—— 分配阶段：{_player_tag(state, distributor)} 把上供牌分配给庄家和庄家对家 ——", level="info")
    state.touch()


def do_distribute_tribute(state: GameState, distributor_seat: int,
                          distribution: Dict[str, int]) -> None:
    if state.phase != "tribute_distribute":
        raise ValueError("当前不是分配阶段")
    if state.tribute_giver_partner is None or distributor_seat != state.tribute_giver_partner:
        raise ValueError("只有上供者的对家可以分配")
    if state.current_seat != distributor_seat:
        raise ValueError("还没轮到你操作")
    banker_s = state.banker_seat
    banker_partner_s = state.banker_partner_seat
    assert banker_s is not None and banker_partner_s is not None
    tribute_ids = {c.id for c in state.tribute_cards}
    if set(distribution.keys()) != tribute_ids:
        raise ValueError("必须为每一张上供牌指定接收者")
    for cid, receiver in distribution.items():
        if receiver not in (banker_s, banker_partner_s):
            raise ValueError("只能分配给庄家或庄家对家")

    to_banker: List[Card] = []
    to_partner: List[Card] = []
    by_id = {c.id: c for c in state.tribute_cards}
    for cid, r in distribution.items():
        if r == banker_s:
            to_banker.append(by_id[cid])
        else:
            to_partner.append(by_id[cid])
    state.cards_to_banker = to_banker
    state.cards_to_banker_partner = to_partner
    state.tribute_distribution = dict(distribution)
    # 不立即放入手牌（等还牌确认后），但 hand_count 先预加（用于 UI 显示平衡）
    # 这里只加计数，但实际牌不发，hand_count 保持不变（到还牌完成后再一起移动）
    state.log(
        f"分配完成 → 庄家收到 {len(to_banker)} 张，庄家对家收到 {len(to_partner)} 张",
        level="success"
    )
    # 进入还牌阶段（庄家和庄家对家都可以操作，顺序不限）
    state.phase = "tribute_return"
    state.current_seat = banker_s  # 先提示庄家，但对家也随时可以点
    state.players[banker_s].decline = False
    state.players[banker_partner_s].decline = False
    state.players[banker_s].return_cards_selected = []
    state.players[banker_partner_s].return_cards_selected = []
    state.log(f"—— 还牌阶段：庄家/庄家对家选择还给 {_player_tag(state, state.tribute_giver)} 的非主非分牌 ——",
              level="info")
    state.touch()


def do_select_return(state: GameState, returner_seat: int, card_ids: List[str]) -> None:
    if state.phase != "tribute_return":
        raise ValueError("当前不是还牌阶段")
    banker_s = state.banker_seat
    partner_s = state.banker_partner_seat
    assert banker_s is not None and partner_s is not None
    player = state.players[returner_seat]
    trump = state.trump_suit
    if returner_seat == banker_s:
        N = len(state.cards_to_banker)
        ok, cards, err = cu.validate_return_cards_banker(player.hand, card_ids, N, trump)
        if not ok:
            raise ValueError(f"庄家还牌失败：{err}")
        state.return_from_banker = cards
        player.return_cards_selected = list(card_ids)
        state.log(f"庄家选好了还牌 {len(cards)} 张", level="info", seat=banker_s)
    elif returner_seat == partner_s:
        N = len(state.cards_to_banker_partner)
        ok, cards, err = cu.validate_return_cards_banker_partner(player.hand, card_ids, N, trump)
        if not ok:
            raise ValueError(f"庄家对家还牌失败：{err}")
        state.return_from_banker_partner = cards
        player.return_cards_selected = list(card_ids)
        state.log(f"庄家对家选好了还牌 {len(cards)} 张", level="info", seat=partner_s)
    else:
        raise ValueError("只有庄家和庄家对家可以还牌")
    state.touch()
    # 若双方都操作完毕 → 尝试交换
    _try_apply_tribute_exchange(state)


def do_decline_cards(state: GameState, decliner_seat: int) -> None:
    """庄家或庄家对家点「不要进牌」。"""
    if state.phase != "tribute_return":
        raise ValueError("当前阶段不能点不要进牌")
    banker_s = state.banker_seat
    partner_s = state.banker_partner_seat
    assert banker_s is not None and partner_s is not None
    if decliner_seat == banker_s:
        state.banker_decline = True
        state.players[banker_s].decline = True
        state.return_from_banker = []
        state.players[banker_s].return_cards_selected = []
        state.log("庄家点击『不要进牌』，对应上供牌将原样退回", level="warn", seat=banker_s)
    elif decliner_seat == partner_s:
        state.banker_partner_decline = True
        state.players[partner_s].decline = True
        state.return_from_banker_partner = []
        state.players[partner_s].return_cards_selected = []
        state.log("庄家对家点击『不要进牌』，对应上供牌将原样退回", level="warn", seat=partner_s)
    else:
        raise ValueError("只有庄家或庄家对家可以不要进牌")
    state.touch()
    _try_apply_tribute_exchange(state)


def _try_apply_tribute_exchange(state: GameState) -> None:
    """庄家 & 庄家对家都做出了决策 → 执行真正的牌交换。"""
    banker_s = state.banker_seat
    partner_s = state.banker_partner_seat
    assert banker_s is not None and partner_s is not None

    both_decided = True
    # 庄家：要么 decline=True，要么 return_from_banker 数量 == cards_to_banker 数量
    banker_N = len(state.cards_to_banker)
    partner_N = len(state.cards_to_banker_partner)
    if state.banker_decline or banker_N == 0:
        banker_ready = True
    else:
        banker_ready = (len(state.return_from_banker) == banker_N)
    if state.banker_partner_decline or partner_N == 0:
        partner_ready = True
    else:
        partner_ready = (len(state.return_from_banker_partner) == partner_N)

    if not (banker_ready and partner_ready):
        return

    giver_s = state.tribute_giver
    assert giver_s is not None
    giver = state.players[giver_s]
    banker = state.players[banker_s]
    partner = state.players[partner_s]
    trump = state.trump_suit

    # 规则：
    # - 双方都不要进牌 → 全部原样退给上供者
    # - 庄家不要进牌 → 原本 cards_to_banker 退回上供者；partner 的照常（若 partner 也不要则 partner 的也退）
    # - 某方没有可还牌 → 把该方收到的上供牌原数退回
    #   （这里通过「return_from_xxx 已匹配或 decline=True」实现；若校验通过则执行，若不通过会在 do_select_return 拦截）

    def move_cards(src_cards: List[Card], dst_hand: List[Card]) -> None:
        for c in src_cards:
            dst_hand.append(c)

    # 1) 处理庄家收到的那一堆
    if state.banker_decline:
        # 退给上供者
        move_cards(state.cards_to_banker, giver.hand)
        state.log(f"庄家不要进牌 → {len(state.cards_to_banker)} 张退给上供者", level="warn")
    else:
        # 先校验还牌（再一次保险），没问题再交换
        ok, _, err = cu.validate_return_cards_banker(
            banker.hand, [c.id for c in state.return_from_banker], banker_N, trump
        )
        if not ok:
            # 退回模式
            move_cards(state.cards_to_banker, giver.hand)
            state.log(f"庄家可还牌不足（{err}）→ {banker_N} 张退回上供者", level="warn")
        else:
            # 从 banker.hand 移除 return_from_banker → 加到 giver
            remove_ids = {c.id for c in state.return_from_banker}
            banker.hand = [c for c in banker.hand if c.id not in remove_ids]
            move_cards(state.return_from_banker, giver.hand)
            # cards_to_banker → 加入 banker.hand
            move_cards(state.cards_to_banker, banker.hand)
    # 2) 处理庄家对家那一堆
    if state.banker_partner_decline:
        move_cards(state.cards_to_banker_partner, giver.hand)
        state.log(f"庄家对家不要进牌 → {len(state.cards_to_banker_partner)} 张退给上供者", level="warn")
    else:
        ok, _, err = cu.validate_return_cards_banker_partner(
            partner.hand, [c.id for c in state.return_from_banker_partner], partner_N, trump
        )
        if not ok:
            move_cards(state.cards_to_banker_partner, giver.hand)
            state.log(f"庄家对家可还牌不足（{err}）→ {partner_N} 张退回上供者", level="warn")
        else:
            remove_ids = {c.id for c in state.return_from_banker_partner}
            partner.hand = [c for c in partner.hand if c.id not in remove_ids]
            move_cards(state.return_from_banker_partner, giver.hand)
            move_cards(state.cards_to_banker_partner, partner.hand)

    # 收尾：hand_count 对齐 & 校验都是 12
    for p in state.players.values():
        p.sync_hand_count()
    for s, p in state.players.items():
        if p.hand_count != 12:
            raise RuntimeError(f"[BUG] 上供后玩家{s}手牌数={p.hand_count}，应为12")
    state.log("上供/还牌完成，所有玩家手牌 12 张", level="success")
    _enter_playing(state)


# ================================================================
#  7. 出牌阶段
# ================================================================

def _enter_playing(state: GameState) -> None:
    assert state.banker_seat is not None
    state.phase = "playing"
    state.current_seat = state.banker_seat  # 庄家首出（规则6.1）
    state.current_trick = None
    state.defender_total_score = 0
    bs = state.banker_seat
    state.defender_team = "B" if seat_team(bs) == "A" else "A"
    state.log(f"—— 出牌阶段开始 · 庄家 {_player_tag(state, bs)} 首出 ——", level="info")
    state.touch()


def do_play_cards(state: GameState, seat: int, card_ids: List[str]) -> None:
    if state.phase != "playing":
        raise ValueError("当前不是出牌阶段")
    if seat != state.current_seat:
        raise ValueError("还没轮到你出牌")
    player = state.players[seat]
    if not card_ids:
        raise ValueError("至少选择 1 张牌")
    by_id = {c.id: c for c in player.hand}
    for cid in card_ids:
        if cid not in by_id:
            raise ValueError("选择的牌不在手牌中")
    cards = [by_id[cid] for cid in card_ids]

    # 是领出还是跟牌？
    if state.current_trick is None:
        # 领出
        played, reason = _lead_play_resolved(state, seat, cards)
        if played is None:
            raise ValueError(reason)
        state.current_trick = Trick(leader=seat)
        tr = state.current_trick
        tr.cards_played[seat] = played
        tr.played_order = [seat]
        unified, lead_suit = cu.same_suit_or_all_trump(played, state.trump_suit)
        tr.lead_suit = lead_suit
        tr.is_all_trump = (lead_suit is None)
        # 从玩家手牌移除 played（注意：甩牌失败时 played 可能只有 1 张）
        remove_ids = {c.id for c in played}
        player.hand = [c for c in player.hand if c.id not in remove_ids]
        player.sync_hand_count()
        state.log(f"{_player_tag(state, seat)} 领出：{_cards_summary(played)}", seat=seat)
        if len(played) < len(cards):
            state.log(f"  ⚠ 甩牌失败，强制出最小一张：{reason}", level="warn")
        state.current_seat = next_seat(seat)
    else:
        tr = state.current_trick
        if seat in tr.cards_played:
            raise ValueError("你本轮已经出过牌了")
        lead_cards = tr.cards_played[tr.leader]
        ok, err = cu.validate_follow_cards(lead_cards, cards, player.hand, state.trump_suit)
        if not ok:
            raise ValueError(err)
        tr.cards_played[seat] = list(cards)
        tr.played_order.append(seat)
        remove_ids = {c.id for c in cards}
        player.hand = [c for c in player.hand if c.id not in remove_ids]
        player.sync_hand_count()
        state.log(f"{_player_tag(state, seat)} 跟牌：{_cards_summary(cards)}", seat=seat)
        # 判断是否 4 人都出完
        if len(tr.played_order) == 4:
            _resolve_trick(state)
            return
        state.current_seat = next_seat(seat)
    state.touch()


def _lead_play_resolved(state: GameState, seat: int, selected: List[Card]) -> Tuple[Optional[List[Card]], str]:
    """校验领出合法性，必要时对副牌甩失败强制出最小一张。返回 (实际打出的牌 or None, 错误或提示)"""
    trump = state.trump_suit
    N = len(selected)
    if N == 1:
        return list(selected), ""
    # N >= 2: 甩牌
    other_hands: Dict[int, List[Card]] = {
        s: list(p.hand) for s, p in state.players.items() if s != seat
    }
    toss_res = cu.check_toss_legality(selected, [], other_hands, trump)
    if toss_res.ok:
        return list(selected), ""
    if toss_res.is_trump_toss:
        # 主牌甩失败：自由重选（返回 None 提示）
        return None, toss_res.reason or "主牌甩失败，请重新选择"
    # 副牌甩失败：强制出最小的那张
    if toss_res.forced_single_card is None:
        # 理论不会
        return None, toss_res.reason or "甩牌不合规"
    return [toss_res.forced_single_card], toss_res.reason


def _resolve_trick(state: GameState) -> None:
    tr = state.current_trick
    assert tr is not None and len(tr.played_order) == 4
    winner_seat, is_trump_win = cu.judge_trick_winner(
        tr.leader, tr.played_order, tr.cards_played, state.trump_suit
    )
    tr.winner_seat = winner_seat
    tr.winner_is_trump_win = is_trump_win
    # 本轮分数（5/10/K 的 value 和）
    total_score = 0
    for cards in tr.cards_played.values():
        total_score += cu.cards_score(cards)
    tr.trick_score = total_score
    # 只记副家队得分
    if state.defender_team is not None and seat_team(winner_seat) == state.defender_team:
        state.defender_total_score += total_score
        state.log(
            f"本轮 {_player_tag(state, winner_seat)} 赢（副家 +{total_score} 分，累计 {state.defender_total_score}/100）",
            level="success", seat=winner_seat
        )
    else:
        state.log(
            f"本轮 {_player_tag(state, winner_seat)} 赢（庄家队得分不计，副家累计 {state.defender_total_score}/100）",
            level="info", seat=winner_seat
        )
    state.tricks_history.append(tr)
    state.current_trick = None

    # 是否最后一手？
    if all(p.hand_count == 0 for p in state.players.values()):
        state.last_trick_is_trump_win = is_trump_win
        # 底牌分：副家队赢最后一手且全主赢 → 直接计入副家得分（不翻倍）
        if state.defender_team is not None and seat_team(winner_seat) == state.defender_team and is_trump_win:
            state.bottom_captured = True
            state.defender_total_score += state.bottom_score
            state.log(f"副家最后一手以主赢，取得底牌 +{state.bottom_score} 分",
                      level="success")
        # 进入翻底牌展示
        state.phase = "reveal_bottom"
        state.reveal_flip_index = 0
        state.log("—— 最后一手结束，展示底牌 ——", level="info")
        return
    # 赢家领出下一轮
    state.current_seat = winner_seat


def do_reveal_next(state: GameState) -> None:
    """翻下一张底牌（结算展示用）。若所有都翻完 → 直接进入结算。"""
    if state.phase != "reveal_bottom":
        return
    if state.reveal_flip_index < len(state.bottom_cards):
        state.reveal_flip_index += 1
        state.touch()
    # 已经全部翻完（或这次刚翻完最后一张）→ 结算
    if state.reveal_flip_index >= len(state.bottom_cards):
        _settle_round(state)


# ================================================================
#  8. 结算 & 下一局
# ================================================================

def _settle_round(state: GameState) -> None:
    score = state.defender_total_score
    tribute_count, change_banker = cu.lookup_tribute(score)
    banker_s = state.banker_seat
    assert banker_s is not None
    if change_banker:
        new_banker = next_seat(banker_s)
    else:
        new_banker = banker_s
    # 默认上供者 = 新庄家下家
    default_giver = next_seat(new_banker)
    tribute_giver_seat = default_giver
    # 注意：翻底定主 3.2 的例外会在「下一局翻底真正发生时」再改，但默认这里先按 5.2 给默认值
    result = RoundResult(
        round_number=state.round_number,
        defender_team=state.defender_team or ("B" if seat_team(banker_s) == "A" else "A"),
        defender_score=score,
        bottom_score=state.bottom_score,
        bottom_captured=state.bottom_captured,
        tribute_count=tribute_count,
        change_banker=change_banker,
        new_banker_seat=new_banker,
        tribute_giver_seat=tribute_giver_seat,
        winner_team=(
            seat_team(banker_s) if score < 35
            else ("B" if seat_team(banker_s) == "A" else "A")
        ),
    )
    state.prev_result = result
    state.phase = "settlement"
    try:
        from .room_manager import ROOMS
        ROOMS.try_persist_round(state.room_id)
    except Exception as e:  # noqa: BLE001
        log.warning(f"try_persist_round hook failed: {e}")
    state.ready_seats = []
    state.settlement_started_at = time.time()
    state.log(
        f"📊 第 {state.round_number} 局结算：副家得 {score} 分 / 底牌{state.bottom_score}分"
        f"{'底牌分+' if state.bottom_captured else ''} → 下局上供 {tribute_count} 张，"
        f"{'换庄' if change_banker else '庄家不变'}（新庄家：座位{new_banker+1}）",
        level="success"
    )
    state.touch()


def mark_ready(state: GameState, seat: int) -> None:
    """settlement 阶段：真人玩家点击准备。AI 玩家自动 ready。
    当所有真人玩家都 ready 后 → 立即进入下一局。
    """
    if state.phase != "settlement":
        return
    if seat not in state.players:
        return
    if seat not in state.ready_seats:
        state.ready_seats.append(seat)
    # 检查：所有真人都已 ready
    all_human_ready = True
    for s, p in state.players.items():
        if not p.is_ai and s not in state.ready_seats:
            all_human_ready = False
            break
    if all_human_ready:
        do_next_round(state)
    state.touch()


def do_next_round(state: GameState) -> None:
    if state.phase != "settlement":
        raise ValueError("当前不能进入下一局")
    # 清空准备态，避免下一局 settlement 时残留
    state.ready_seats = []
    state.settlement_started_at = 0.0
    state.round_number += 1
    _begin_round(state, is_first_round=False)


# ================================================================
#  9. 按视角裁剪 GameState（隐私保护，WebSocket 推送前调用）
# ================================================================

def mask_state_for_viewer(state: GameState, viewer_seat: Optional[int]) -> GameState:
    """
    返回一个「安全的」GameState 副本：
      - 其他玩家手牌清空（保留 hand_count）
      - 底牌按 bottom_visible_to 隐藏
      - 上供中间态按规则隐藏
      - deck 永远隐藏
    """
    # 为了简单，这里直接手动构造副本（不 deepcopy，pydantic 构造）
    from copy import deepcopy
    masked = deepcopy(state)
    # deck 隐藏
    masked.deck = []
    # 其他玩家手牌
    for s, p in masked.players.items():
        if viewer_seat is None or s != viewer_seat:
            p.hand = []
            # hand_count 不变
        # tribute_selected / return_cards_selected 可以保留（UI 展示用，不包含敏感信息）
    # 底牌
    if viewer_seat is None or viewer_seat not in masked.bottom_visible_to:
        # 结算阶段 reveal_bottom 时也公开
        if masked.phase not in ("reveal_bottom", "settlement"):
            # 只显示张数（用 blank suit/rank 代替?）→ 这里直接清空但靠 bottom_cards 数量来显示背面
            # 前端通过 state.phase + len(bottom_cards) 判断显示背面
            # 为了简单，牌面全改成 "?" 形式（这里改成空 list 也行，前端自己用长度显示背面）
            # 保留长度，每张变成一个特殊 joker_small? 不，直接空会少信息。
            # 所以我们把内容清空，但保留数量 count：前端显示「? × N」个背面
            masked.bottom_cards = []
        else:
            # reveal_bottom: 只展示已翻到 reveal_flip_index 的
            masked.bottom_cards = masked.bottom_cards[:masked.reveal_flip_index]
    def _face_down_cards(cards):
        """保留张数，每张 Card 变成背面形式（不泄露牌面内容）。"""
        from copy import deepcopy as _dc
        result = []
        for c in cards:
            nc = _dc(c)
            object.__setattr__(nc, 'suit', 'joker')
            object.__setattr__(nc, 'rank', 'small')
            object.__setattr__(nc, 'id', f'back_{c.id}')
            result.append(nc)
        return result

    # 上供牌面：
    # - tribute_select：仅 giver 及其对家 可见 tribute_cards
    if masked.phase == "tribute_select":
        if viewer_seat is None or viewer_seat not in (masked.tribute_giver, masked.tribute_giver_partner):
            masked.tribute_cards = []
    # - tribute_distribute：仅 distributor（giver_partner）可见全部；其他玩家看到背面（保留张数）
    if masked.phase == "tribute_distribute":
        if viewer_seat != masked.tribute_giver_partner:
            masked.tribute_cards = _face_down_cards(masked.tribute_cards)
    # - tribute_return：
    #   cards_to_banker → banker 可见；其他玩家看到背面（保留张数）
    #   cards_to_banker_partner → banker_partner 可见；其他玩家看到背面（保留张数）
    #   双方都不可见对方具体牌面，但数量可见
    if masked.phase == "tribute_return":
        bs = masked.banker_seat
        bps = masked.banker_partner_seat
        # tribute_cards 只保留给 giver / distributor
        if viewer_seat not in (masked.tribute_giver, masked.tribute_giver_partner):
            masked.tribute_cards = []
        if viewer_seat != bs:
            masked.cards_to_banker = _face_down_cards(masked.cards_to_banker)
            masked.return_from_banker = _face_down_cards(masked.return_from_banker)
        if viewer_seat != bps:
            masked.cards_to_banker_partner = _face_down_cards(masked.cards_to_banker_partner)
            masked.return_from_banker_partner = _face_down_cards(masked.return_from_banker_partner)
    return masked


# ================================================================
#  内部工具
# ================================================================

def _player_tag(state: GameState, seat: int) -> str:
    if seat not in state.players:
        return f"座位{seat+1}"
    p = state.players[seat]
    flag = "🏠" if p.is_banker else ""
    return f"{p.name}(P{seat+1}){flag}"


def _cards_summary(cards: List[Card]) -> str:
    parts = []
    for c in cards:
        if c.is_joker:
            parts.append("大王" if c.rank == "big" else "小王")
        else:
            parts.append(f"{c.rank}{cu.SUIT_SYMBOLS.get(c.suit,'?')}")
    return " ".join(parts) if parts else "(空)"
