"""启发式规则 AI：订阅 state_update，在轮到自己时按规则自动走棋。"""
from __future__ import annotations

import asyncio
import logging
import os
import random
from typing import Dict, List, Optional

from . import card_utils as cu
from . import game_engine as ge
from .models import Card, GameState, seat_team, teammate_seat, next_seat

log = logging.getLogger("show_thumb.ai")

AI_MIN_DELAY_MS = int(os.getenv("GAME_AI_MIN_DELAY_MS", "600"))
AI_MAX_DELAY_MS = int(os.getenv("GAME_AI_MAX_DELAY_MS", "1600"))


def _sleep_random():
    ms = random.randint(AI_MIN_DELAY_MS, AI_MAX_DELAY_MS)
    return asyncio.sleep(ms / 1000.0)


# ======================================================================
#  AI 决策入口（由 room_manager 在每次 state_update 之后调用）
# ======================================================================

async def maybe_trigger_ai_actions(room) -> None:
    """遍历房间里所有 AI 玩家，如果是当前轮到操作的 AI，则执行相应动作。
    为防止死循环：每次调用只推进「一次」state 变化（调用方外层循环会反复触发）。
    """
    state: GameState = room.state
    phase = state.phase

    # --- waiting 阶段：如果 4 人已满 → 自动 start_game
    if phase == "waiting":
        if len(state.players) == 4:
            # 等 200ms 再开局（给人类玩家加载 UI）
            await _sleep_random()
            async with room.lock:
                if state.phase == "waiting" and len(state.players) == 4:
                    ge.start_game(state)
            await room.broadcast_state()
        return

    seat = _whose_turn_ai(state)

    # --- tribute_return：庄家 / 庄家对家 分别可能是 AI，需要各自独立处理 ---
    if seat is None and phase == "tribute_return":
        await _maybe_do_tribute_return_ai(room)
        return

    # --- flip_bottom：任意副家点 → 取第一个 AI 副家
    if seat is None and phase == "flip_bottom":
        ai_seats = [s for s, p in state.players.items() if p.is_ai]
        banker_s = state.banker_seat
        for s in ai_seats:
            if banker_s is None or seat_team(s) != seat_team(banker_s):
                seat = s
                break

    # --- reveal_bottom：AI 自动把 6 张底牌翻完（翻完会自动 settlement）
    if seat is None and phase == "reveal_bottom":
        async with room.lock:
            for _ in range(7):
                ge.do_reveal_next(state)
                if state.phase != "reveal_bottom":
                    break
        return

    # --- settlement：若有 AI，自动点下一局（继续玩，除非连续 10 局以上先由外部控制）
    if seat is None and phase == "settlement":
        # 至少有一名 AI 的话由第一个 AI 点下一局（凑不齐人时AI陪练用）
        ai_seats = [s for s, p in state.players.items() if p.is_ai]
        if ai_seats and state.round_number < 3:  # 限制：AI 最多连打 3 局自动下一局，避免无限循环
            seat = ai_seats[0]

    if seat is None:
        return

    player = state.players.get(seat)
    if player is None or not player.is_ai:
        return

    # === playing 阶段特别 guard：如果该 seat 本轮已经出过牌就不再次触发 ===
    if phase == "playing" and state.current_trick is not None:
        if seat in state.current_trick.cards_played:
            # 这种情况：可能 current_seat 指向下家，但我们的 _whose_turn_ai 可能因为某处状态混乱仍指向上家出牌
            # 此时直接 return，防止死循环
            return
    # === drawing 阶段 guard：如果该玩家已经 12 张，跳过（等其他人摸完）===
    if phase == "drawing" and player.hand_count >= 12:
        # 如果所有人都 12 张，说明 _enter_banker_draw / flip 阶段还没切过来
        # 手动推进一下（其实是我们的 drawing 最后一张摸完没切 phase 的 bug 保护）
        all_12 = all(p.hand_count == 12 for p in state.players.values())
        if all_12 and state.trump_suit is not None and state.banker_seat is not None:
            async with room.lock:
                ge._enter_banker_draw(state)  # noqa: SLF001
        return

    # 模拟思考延迟（摸牌要快，否则太慢）
    if phase != "drawing":
        await _sleep_random()

    async with room.lock:
        await _execute_ai_action(room, seat)


def _whose_turn_ai(state: GameState) -> Optional[int]:
    """根据 phase 和 current_seat 判断谁该操作；仅当 current_seat 指向一个具体座位且 是 AI 时返回。"""
    s = state.current_seat
    if s is None or s < 0 or s > 3:
        return None
    if state.phase in (
        "drawing", "discard_bottom", "tribute_select",
        "tribute_distribute", "playing", "settlement"
    ):
        return s
    return None


async def _execute_ai_action(room, seat: int) -> None:
    state = room.state
    phase = state.phase
    try:
        if phase == "drawing":
            _ai_do_draw_or_ban2(state, seat)
        elif phase == "flip_bottom":
            ge.do_flip_bottom(state, seat)
        elif phase == "discard_bottom":
            _ai_do_discard(state, seat)
        elif phase == "tribute_select":
            _ai_do_tribute_select(state, seat)
        elif phase == "tribute_distribute":
            _ai_do_distribute(state, seat)
        elif phase == "tribute_return":
            # 只覆盖「returner_seat == seat」的情况
            _ai_do_return_side(state, seat)
        elif phase == "playing":
            _ai_do_play(state, seat)
        elif phase == "reveal_bottom":
            # 连续翻完 6 张
            for _ in range(6):
                ge.do_reveal_next(state)
        elif phase == "settlement":
            # AI 点下一局
            ge.do_next_round(state)
    except Exception as e:  # noqa: BLE001
        log.warning(f"AI seat{seat} action error phase={phase}: {e}")


# ======================================================================
#  各阶段 AI 启发式策略
# ======================================================================

def _ai_do_draw_or_ban2(state: GameState, seat: int) -> None:
    """先摸牌。若摸到花色2 且 trump_suit 未定 → 立刻办二。"""
    before = state.phase
    hand_before_ids = {c.id for c in state.players[seat].hand}
    ge.do_draw_card(state, seat)
    # 如果还在 drawing 且手里有多的 2 未办二 → 办二
    if state.trump_suit is None:
        new_card = None
        for c in state.players[seat].hand:
            if c.id not in hand_before_ids:
                new_card = c
                break
        if new_card is not None and new_card.is_rank2:
            try:
                ge.do_declare_ban2(state, seat, new_card.id)
            except ValueError:
                pass
    # 摸牌后 AI 立刻摸下一张（只要还是 drawing 并且 current_seat 是 AI），加快节奏
    # 由外层 maybe_trigger_ai_actions 广播后再次触发即可


def _ai_do_discard(state: GameState, seat: int) -> None:
    """庄家扣底：优先扣「最小的副牌分牌」→「最小的副牌非分」→ 最后才考虑小主（尽量保留主）。"""
    player = state.players[seat]
    trump = state.trump_suit
    assert trump is not None

    def key_side(c: Card):
        # 越小越优先扣
        return cu.side_value(c)
    def key_trump(c: Card):
        return cu.trump_value(c, trump)

    trumps = [c for c in player.hand if c.is_trump_of(trump)]
    sides = [c for c in player.hand if not c.is_trump_of(trump)]

    # 分类：副牌中的分/非分
    side_scores = sorted([c for c in sides if c.is_score], key=key_side)
    side_nonscores = sorted([c for c in sides if not c.is_score], key=key_side)
    # 主牌最后才扣（从小到大的主4/主3/主6等）
    trumps_small_first = sorted(trumps, key=key_trump)
    # 绝对不扣：主5 / 大小王 / 主2 / 副2 除非万不得已
    trumps_no_touch_ids = {c.id for c in trumps if c.rank in ("5", "big", "small", "2")}

    chosen: List[Card] = []
    pool = side_scores + side_nonscores
    for c in pool:
        if len(chosen) == 6:
            break
        chosen.append(c)
    # 副牌不够补主牌小牌
    if len(chosen) < 6:
        for c in trumps_small_first:
            if len(chosen) == 6:
                break
            if c.id in trumps_no_touch_ids:
                continue
            chosen.append(c)
    if len(chosen) < 6:
        # 实在不够就从 trumps 里抠
        for c in trumps_small_first:
            if len(chosen) == 6:
                break
            if c not in chosen:
                chosen.append(c)
    ge.do_discard_bottom(state, seat, [c.id for c in chosen])


def _ai_do_tribute_select(state: GameState, seat: int) -> None:
    """按规则：选最大的 N 张主非分。validate 时会强校验，直接把 eligible_sorted[:N] 给过去。"""
    player = state.players[seat]
    eligible = cu.get_valid_tribute_cards_sorted(player.hand, state.trump_suit)
    should = eligible[:max(0, min(state.tribute_count, len(eligible)))]
    ge.do_select_tribute(state, seat, [c.id for c in should])


def _ai_do_distribute(state: GameState, seat: int) -> None:
    """分配启发式：最大的 1~2 张给队友（庄家对家），其余给庄家。
    队友 seat = banker_partner_seat；庄家 seat = banker_seat。
    """
    trump = state.trump_suit
    cards = sorted(state.tribute_cards, key=lambda c: -cu.trump_value(c, trump))
    banker_s = state.banker_seat
    partner_s = state.banker_partner_seat
    assert banker_s is not None and partner_s is not None
    dist: Dict[str, int] = {}
    n = len(cards)
    # 最大 1 张（若 n≥1）给队友；n≥3 时最大 2 张给队友
    keep_for_partner = 2 if n >= 3 else (1 if n >= 1 else 0)
    for i, c in enumerate(cards):
        if i < keep_for_partner:
            dist[c.id] = partner_s
        else:
            dist[c.id] = banker_s
    ge.do_distribute_tribute(state, seat, dist)


async def _maybe_do_tribute_return_ai(room) -> None:
    """庄家和庄家对家可能分别是 AI；分别触发。"""
    state = room.state
    if state.phase != "tribute_return":
        return
    banker_s = state.banker_seat
    partner_s = state.banker_partner_seat
    changed = False
    async with room.lock:
        for s in (banker_s, partner_s):
            if s is None:
                continue
            p = state.players[s]
            if not p.is_ai:
                continue
            # 还没操作的才做
            if s == banker_s:
                if state.banker_decline:
                    continue
                need = len(state.cards_to_banker)
                if need == 0:
                    continue
                if len(state.return_from_banker) == need:
                    continue
            else:
                if state.banker_partner_decline:
                    continue
                need = len(state.cards_to_banker_partner)
                if need == 0:
                    continue
                if len(state.return_from_banker_partner) == need:
                    continue
            await _sleep_random()
            _ai_do_return_side(state, s)
            changed = True
    if changed:
        await room.broadcast_state()


def _ai_do_return_side(state: GameState, seat: int) -> None:
    """给庄家/庄家对家分别选还牌：最小的合法非主非分；庄家对家额外要求花色各不相同。"""
    banker_s = state.banker_seat
    partner_s = state.banker_partner_seat
    player = state.players[seat]
    trump = state.trump_suit
    assert trump is not None
    if seat == banker_s:
        N = len(state.cards_to_banker)
    elif seat == partner_s:
        N = len(state.cards_to_banker_partner)
    else:
        return
    if N == 0:
        # 不用还，但也要触发状态推进
        if seat == banker_s:
            state.banker_decline = True  # 标记已处理
        else:
            state.banker_partner_decline = True
        # 手动调一次交换检查
        from .game_engine import _try_apply_tribute_exchange
        _try_apply_tribute_exchange(state)
        return

    # 合法候选：非主、非分
    candidates = [
        c for c in player.hand
        if not c.is_trump_of(trump) and not c.is_score
    ]
    candidates.sort(key=lambda c: (cu._SUIT_SUB_TIEBREAK.get(c.suit, 0), cu.side_value(c)))

    chosen: List[Card] = []
    if seat == banker_s:
        if len(candidates) < N:
            # 不够 → 点击不要进牌
            ge.do_decline_cards(state, seat)
            return
        chosen = candidates[:N]
    else:
        # 花色各不相同
        used_suits = set()
        for c in candidates:
            if len(chosen) == N:
                break
            if c.suit in used_suits or c.is_joker:
                continue
            chosen.append(c)
            used_suits.add(c.suit)
        if len(chosen) < N:
            ge.do_decline_cards(state, seat)
            return
    try:
        ge.do_select_return(state, seat, [c.id for c in chosen])
    except ValueError:
        # 实在不行就不要进牌
        try:
            ge.do_decline_cards(state, seat)
        except ValueError:
            pass


def _ai_do_play(state: GameState, seat: int) -> None:
    player = state.players[seat]
    trump = state.trump_suit
    tr = state.current_trick

    if tr is None:
        # 领出
        chosen = _ai_choose_lead(state, seat)
        ge.do_play_cards(state, seat, [c.id for c in chosen])
    else:
        # 跟牌
        lead_cards = tr.cards_played[tr.leader]
        chosen = _ai_choose_follow(state, seat, lead_cards)
        ge.do_play_cards(state, seat, [c.id for c in chosen])


def _ai_choose_lead(state: GameState, seat: int) -> List[Card]:
    """领出策略：
    1) 先出「绝对大的主」（主5 / 大王 / 小王 / 没出的唯一主2 等），用来保底/清主
    2) 出副牌长套（≥3张同花色连在一起且大概率能甩）→ 甩
    3) 否则出最小的副牌非分
    """
    hand = list(state.players[seat].hand)
    trump = state.trump_suit
    assert trump is not None
    trumps = sorted([c for c in hand if c.is_trump_of(trump)],
                    key=lambda c: -cu.trump_value(c, trump))
    sides = [c for c in hand if not c.is_trump_of(trump)]

    # 1. 主5 / 大王 / 小王：如果当前轮次 > 4 张（游戏中后期）且我们是副家可以得分 → 先出大王保底拿分机会
    # 简化：手牌 ≤ 8 时先出大主清主；否则先出副
    if len(hand) <= 8 and trumps:
        # 先出最大一张主单
        return [trumps[0]]

    # 2. 看副牌同花色 ≥ 2 且 能甩（其他人没更大）→ 试甩
    #    注意：这里我们不知道他人手牌，所以用启发式：该花色副牌张数 ≥ 3 且 最小那张 rank ≥ 10
    by_suit: Dict[str, List[Card]] = {}
    for c in sides:
        by_suit.setdefault(c.suit, []).append(c)
    candidates_toss = []
    for suit, lst in by_suit.items():
        if len(lst) >= 3:
            lst_sorted = sorted(lst, key=lambda c: -cu.side_value(c))
            # 最小一张 side_value ≥ 70 (≥10) 才考虑甩
            if cu.side_value(lst_sorted[-1]) >= 70:
                candidates_toss.append(lst_sorted)
    if candidates_toss:
        candidates_toss.sort(key=lambda l: -len(l))
        return list(candidates_toss[0])

    # 3. 出最小的副牌非分（出小牌送队友赢）
    side_nonscore = sorted([c for c in sides if not c.is_score], key=cu.side_value)
    if side_nonscore:
        return [side_nonscore[0]]
    # 4. 没副牌非分出 → 出最小副分（5先出）
    if sides:
        sides_sorted = sorted(sides, key=cu.side_value)
        return [sides_sorted[0]]
    # 5. 全主 → 出最小主
    small_trump = sorted(trumps, key=lambda c: cu.trump_value(c, trump))
    return [small_trump[0]]


def _ai_choose_follow(state: GameState, seat: int, lead_cards: List[Card]) -> List[Card]:
    """跟牌策略（按强制规则来，剩下来的选择空间做启发式）：
    - 必须跟同花色 N 张 → 跟最小的 N 张（一般情况），但
      若当前队友已经大且本轮没分 → 跟最小
      若当前敌方领先且本轮分数 ≥ 10 → 有机会就杀（主牌 N 张全主）
    """
    hand = list(state.players[seat].hand)
    trump = state.trump_suit
    N = len(lead_cards)
    unified, lead_suit = cu.same_suit_or_all_trump(lead_cards, trump)

    # --- 强制约束下的可选项枚举（太复杂，用简化版：先按规则挑「强制池」，再在池里选最小/杀）
    if lead_suit is not None:
        same_suit_pool = cu.cards_of_suit_in_hand(hand, lead_suit, trump, trump_as_suit=False)
        if len(same_suit_pool) >= N:
            # 必须跟 N 张同花副
            same_sorted = sorted(same_suit_pool, key=cu.side_value)
            chosen = same_sorted[:N]
            return chosen
        else:
            # 可垫可杀
            # 判断：本轮目前分数 + 领出牌分数，够不够 10 分值得杀
            score_now = cu.cards_score(lead_cards)
            for s, cs in state.current_trick.cards_played.items():
                if s == state.current_trick.leader:
                    continue
                score_now += cu.cards_score(cs)
            trumps_pool = cu.cards_of_suit_in_hand(hand, "spade", trump, trump_as_suit=True)
            if score_now >= 10 and len(trumps_pool) >= N:
                # 选最小 N 张主去杀（能赢就行，省大主）
                ts = sorted(trumps_pool, key=lambda c: cu.trump_value(c, trump))
                chosen = ts[:N]
                return chosen
            # 垫：先垫同花色有多少出多少，再垫最小副分
            chosen = list(same_suit_pool)
            need = N - len(chosen)
            if need > 0:
                pads = sorted(
                    [c for c in hand if c not in chosen],
                    key=lambda c: (
                        0 if c.is_score else 1,  # 垫分优先垫掉？反过来：先垫非分保留分牌（反正在手里也不一定拿得到）
                        cu.side_value(c),
                    )
                )
                # 简单：先垫非分最小，再垫分牌 5 < 10 < K
                nonscores = sorted([c for c in pads if not c.is_score and c not in chosen],
                                   key=cu.side_value)
                for c in nonscores:
                    if len(chosen) == N:
                        break
                    chosen.append(c)
                if len(chosen) < N:
                    scores = sorted([c for c in pads if c.is_score and c not in chosen],
                                    key=lambda c: c.score_value)
                    for c in scores:
                        if len(chosen) == N:
                            break
                        chosen.append(c)
                if len(chosen) < N:
                    # 还有主牌可以垫（非主就没了，这里应该不会到）
                    for c in hand:
                        if c not in chosen and len(chosen) < N:
                            chosen.append(c)
            return chosen
    else:
        # 全主领出
        trumps_pool = cu.cards_of_suit_in_hand(hand, "spade", trump, trump_as_suit=True)
        if len(trumps_pool) >= N:
            # 跟最小 N 张主
            ts = sorted(trumps_pool, key=lambda c: cu.trump_value(c, trump))
            return ts[:N]
        # 不够 → 任意出（先垫主再垫非主非分）
        chosen = list(trumps_pool)
        need = N - len(chosen)
        rest = sorted([c for c in hand if c not in chosen],
                      key=lambda c: (1 if c.is_score else 0, cu.side_value(c)))
        for c in rest:
            if len(chosen) == N:
                break
            chosen.append(c)
        return chosen
