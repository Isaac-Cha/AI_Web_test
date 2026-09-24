from __future__ import annotations

import random
from typing import Dict, Iterable, List, Optional, Tuple

from .models import (
    Card,
    Suit,
    Rank,
    next_seat,
)

# ============ 基础：54 张牌构造 & 洗牌 ============

SUITS: List[Suit] = ["spade", "heart", "club", "diamond"]
RANKS: List[Rank] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]


def build_deck_54() -> List[Card]:
    cards: List[Card] = []
    for s in SUITS:
        for r in RANKS:
            cards.append(Card(suit=s, rank=r))
    cards.append(Card(suit="joker", rank="small"))
    cards.append(Card(suit="joker", rank="big"))
    return cards


def shuffle_deck(cards: List[Card], rng: Optional[random.Random] = None) -> List[Card]:
    out = list(cards)
    if rng is None:
        random.shuffle(out)
    else:
        rng.shuffle(out)
    return out


# ============ 大小值：主牌 ============
# 主牌从大到小:
# 主5(100000) > 大王(90000) > 小王(80000) > 主2(70000) > 副2(按花色顺先出为大) > 主A..主3
# 注意：多个副2之间大小相同，先出者大。我们这里返回值一样，赢牌判定里再按出牌顺序 tiebreak。

_TRUMP_RANK_BONUS: Dict[Rank, int] = {
    "5": 100000,
    "big": 90000,  # 大王
    "small": 80000,  # 小王
    "2": 70000,    # 主2 / 副2 基础
    "A": 60000,
    "K": 59000,
    "Q": 58000,
    "J": 57000,
    "10": 56000,
    "9": 55000,
    "8": 54000,
    "7": 53000,
    "6": 52000,
    "4": 51000,
    "3": 50000,
}

# 主2 vs 副2 大小: 主2 再额外 +10000
_MAIN_2_BONUS = 10000

# 副2之间大小相同（tiebreak 按先出者大）
# 为了排序稳定，给副2也加个微小花色差，但只在非赢牌严格判定场景使用
_SUIT_SUB_TIEBREAK: Dict[Suit, int] = {"spade": 40, "heart": 30, "club": 20, "diamond": 10, "joker": 0}


def trump_value(card: Card, trump_suit: Optional[Suit], *, strict: bool = False) -> int:
    """返回一张主牌的大小值。越大越强。strict=True 时副2不加花色tiebreak（严格相等供先出者大）"""
    if trump_suit is None:
        return 0
    if not card.is_trump_of(trump_suit):
        return -1  # 非主牌
    base = _TRUMP_RANK_BONUS.get(card.rank, 0)
    if card.rank == "2" and not card.is_joker and trump_suit is not None and card.suit == trump_suit:
        base += _MAIN_2_BONUS  # 主2比副2大一个档
    if not strict and not card.is_joker:
        # 仅用于手牌排序稳定，赢牌判定 strict=True 时不加花色tiebreak
        base += _SUIT_SUB_TIEBREAK.get(card.suit, 0)
    return base


# ============ 大小值：副牌同花色 ============
# 副牌 大→小: 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3
_SIDE_RANK_BONUS: Dict[Rank, int] = {
    "2": 120, "A": 110, "K": 100, "Q": 90, "J": 80,
    "10": 70, "9": 60, "8": 50, "7": 40, "6": 30,
    "5": 20, "4": 10, "3": 0,
}


def side_value(card: Card) -> int:
    """副牌同花色内大小值（越大越强）。仅适用于同一非主花色内部比较。"""
    return _SIDE_RANK_BONUS.get(card.rank, 0)


# ============ 手牌排序（UI 展示用）============

def sort_hand_for_display(cards: Iterable[Card], trump_suit: Optional[Suit]) -> List[Card]:
    """
    手牌排序：
      主牌（按主牌大小降序）在前
      副牌按 [黑桃/红桃/梅花/方块] 花色组，组内按副牌大小降序
    """
    trumps: List[Card] = []
    side_by_suit: Dict[Suit, List[Card]] = {s: [] for s in SUITS}  # type: ignore[assignment]
    for c in cards:
        if c.is_trump_of(trump_suit):
            trumps.append(c)
        elif not c.is_joker:
            side_by_suit[c.suit].append(c)  # type: ignore[literal-required]
    trumps.sort(key=lambda c: -trump_value(c, trump_suit))
    out = trumps
    for s in SUITS:  # type: ignore[assignment]
        group = sorted(side_by_suit[s], key=lambda c: -side_value(c))
        out.extend(group)
    return out


# ============ 辅助：批量 ============

def cards_score(cards: Iterable[Card]) -> int:
    return sum(c.score_value for c in cards)


def all_trump(cards: Iterable[Card], trump_suit: Optional[Suit]) -> bool:
    return all(c.is_trump_of(trump_suit) for c in cards)


def same_suit_or_all_trump(cards: Iterable[Card], trump_suit: Optional[Suit]) -> Tuple[bool, Optional[Suit]]:
    """
    判断一组牌是否「同花色 or 全主」。
    返回 (ok, lead_suit)：
      - ok=True, lead_suit=None -> 全主
      - ok=True, lead_suit=Suit -> 同该副牌花色
      - ok=False -> 混杂
    """
    lst = list(cards)
    if not lst:
        return False, None
    if all_trump(lst, trump_suit):
        return True, None
    # 检查是不是同一种副牌花色（且全都是副牌，即没有主）
    suits = {c.suit for c in lst if not c.is_joker}
    if len(suits) == 1 and not any(c.is_trump_of(trump_suit) for c in lst):
        s = next(iter(suits))
        if s != "joker":
            return True, s
    return False, None


def cards_of_suit_in_hand(hand: Iterable[Card], suit: Suit, trump_suit: Optional[Suit], *,
                          trump_as_suit: bool = False) -> List[Card]:
    """
    获取手牌中指定花色的牌。
      - suit 是普通花色(spade/heart...) 且 trump_as_suit=False：只算该花色的副牌（不算主牌里的同花色，因为主牌是单独花色池）
      - trump_as_suit=True：算「主牌」作为一个整体池（此时 suit 参数被忽略，只返回 is_trump 的牌）
    """
    if trump_as_suit:
        return [c for c in hand if c.is_trump_of(trump_suit)]
    return [
        c for c in hand
        if c.suit == suit and not c.is_trump_of(trump_suit)
    ]


# ============ 甩牌合法性检查 ============

class TossResult:
    ok: bool
    # 甩牌是否「主牌甩」（全主）
    is_trump_toss: bool = False
    # ok=False 时：
    #   - 主牌甩：没有惩罚（玩家自由重选），提示但不用强出
    #   - 副牌甩失败：强制只能出最小那一张 forced_single_card
    forced_single_card: Optional[Card] = None
    # 提示文本
    reason: str = ""

    def __init__(self, ok: bool):
        self.ok = ok


def check_toss_legality(
    selected: List[Card],
    leader_hand_after: List[Card],  # noqa: ARG001 (保留接口)
    other_hands: Dict[int, List[Card]],
    trump_suit: Optional[Suit],
) -> TossResult:
    """
    检查甩牌合法性。
    - selected: 玩家要甩出的 ≥2 张牌
    - other_hands: 其他 3 位玩家的手牌
    """
    result = TossResult(ok=False)
    N = len(selected)
    if N < 2:
        result.reason = "甩牌至少需要 2 张牌"
        return result

    unified, lead_suit = same_suit_or_all_trump(selected, trump_suit)
    if not unified:
        result.reason = "甩牌必须是同一种副牌花色，或全部都是主牌"
        return result

    if lead_suit is None:
        # 全主甩
        result.is_trump_toss = True
        min_val = min(trump_value(c, trump_suit, strict=True) for c in selected)
        min_card = min(selected, key=lambda c: trump_value(c, trump_suit, strict=True))
        for seat, oh in other_hands.items():
            for c in oh:
                if trump_value(c, trump_suit, strict=True) > min_val:
                    # 主牌甩失败：无惩罚，自由重选
                    result.reason = f"还有其他玩家持有更大的主牌，主甩失败（可自由重选）"
                    return result
        # 主甩 ok
        result.ok = True
        return result
    else:
        # 副牌同花色甩
        # 最小的一张（甩牌内同花色的最小值）
        min_val = min(side_value(c) for c in selected)
        min_card = min(selected, key=lambda c: side_value(c))
        # 其他玩家如果有「同花色副牌」且比 min 大 -> 失败
        for seat, oh in other_hands.items():
            for c in oh:
                if c.suit == lead_suit and not c.is_trump_of(trump_suit):
                    if side_value(c) > min_val:
                        result.reason = f"甩牌失败：还有更大的{_suit_name(lead_suit)}，强制只出最小的一张"
                        result.forced_single_card = min_card
                        return result
        result.ok = True
        return result


# ============ 跟牌合法性检查 ============

def validate_follow_cards(
    lead_cards: List[Card],
    follow_cards: List[Card],
    follower_full_hand: List[Card],  # 该玩家完整手牌（出牌前）
    trump_suit: Optional[Suit],
) -> Tuple[bool, str]:
    """
    校验跟牌是否合法。
    返回 (ok, error_message)
    """
    N = len(lead_cards)
    if len(follow_cards) != N:
        return False, f"必须出 {N} 张牌"

    unified, lead_suit = same_suit_or_all_trump(lead_cards, trump_suit)
    if not unified:
        # 领出本身就不合法（理论上不会到这里，领出会先被校验）
        return False, "领出牌不合法"

    if lead_suit is not None:
        # 领出是某一副牌花色
        same_suit_in_hand = cards_of_suit_in_hand(follower_full_hand, lead_suit, trump_suit, trump_as_suit=False)
        if len(same_suit_in_hand) >= N:
            # 必须出 N 张该副牌花色
            same_suit_in_follow = [
                c for c in follow_cards
                if c.suit == lead_suit and not c.is_trump_of(trump_suit)
            ]
            if len(same_suit_in_follow) != N:
                return False, f"有 ≥ {N} 张{_suit_name(lead_suit)}副牌，必须全部跟{_suit_name(lead_suit)}副牌"
        # 否则任意出（垫或杀）
        return True, ""
    else:
        # 领出是全主
        trumps_in_hand = cards_of_suit_in_hand(follower_full_hand, "spade", trump_suit, trump_as_suit=True)
        if len(trumps_in_hand) >= N:
            # 必须出 N 张主
            trumps_in_follow = [c for c in follow_cards if c.is_trump_of(trump_suit)]
            if len(trumps_in_follow) != N:
                return False, f"有 ≥ {N} 张主牌，必须跟主牌"
        # 否则任意出
        return True, ""


# ============ 赢牌判定 ============

def judge_trick_winner(
    leader: int,
    played_order: List[int],  # 出牌顺序（座位号）
    cards_by_seat: Dict[int, List[Card]],
    trump_suit: Optional[Suit],
) -> Tuple[int, bool]:
    """
    判断本轮赢者，返回 (winner_seat, is_trump_win)。
    is_trump_win 含义：赢家赢的依据是不是「全主牌」（用于最后一手抠底判定）。
    等价于：赢家打出的那组牌全部是主牌。
    """
    if trump_suit is None:
        raise ValueError("judge_trick_winner 需要已定主")
    lead_cards = cards_by_seat[leader]
    unified, lead_suit = same_suit_or_all_trump(lead_cards, trump_suit)

    # 按出牌顺序，为每个玩家计算他的「比较大小值」和是否为有效杀
    best_seat = leader
    best_is_trump_win = all_trump(lead_cards, trump_suit)
    # 为领出者计算比较值
    # 比较层级：
    #   level 4: 主牌杀（如果领出是副牌）  vs  level 3: 跟副牌花色最大
    #   同层级内：最大单张比较
    best_level = _card_strength_level(lead_cards, lead_cards, trump_suit, lead_suit, is_leader=True)
    best_max = _max_strength_single(lead_cards, trump_suit, lead_suit, is_leader=True)
    best_tiebreak = 0  # 先出者 tiebreak index 更小，但这里是赢大小时 level/max 相同才用；对于副2等先出者大

    for order_idx, seat in enumerate(played_order[1:], start=1):
        cards = cards_by_seat[seat]
        lvl = _card_strength_level(lead_cards, cards, trump_suit, lead_suit, is_leader=False)
        mx = _max_strength_single(cards, trump_suit, lead_suit, is_leader=False)

        better = False
        if lvl > best_level:
            better = True
        elif lvl == best_level:
            if mx > best_max:
                better = True
            elif mx == best_max:
                # 先出者大（对于副2等值完全相等的场景）
                # 原规则写：都是副2先出牌者为大。我们这里推广为值相同则领出者/先出者大。
                better = False  # 后面的人不赢前者
        if better:
            best_seat = seat
            best_level = lvl
            best_max = mx
            best_is_trump_win = all_trump(cards, trump_suit)

    # 规则 6.6：主牌甩 -> 甩牌者直接赢（不存在杀牌）
    if lead_suit is None and not best_is_trump_win:
        # 理论不可能，领出全主时 all_trump=True 会让 best_is_trump_win 初始为 True
        pass
    # 6.6 补充：副牌甩 -> 必须N张全主才算杀。上面的 level 已经是这样：
    # 当领出是副牌花色时，follow 全主才是 level 4 (杀)，否则 level<=3

    return best_seat, best_is_trump_win


def _card_strength_level(
    lead_cards: List[Card],
    one_player_cards: List[Card],
    trump_suit: Optional[Suit],
    lead_suit: Optional[Suit],
    *,
    is_leader: bool,
) -> int:
    """赢牌层级（越大越强）：4=主杀  3=领出同花色（跟得上）  2=领出全主跟主  1=垫"""
    if is_leader:
        if lead_suit is None:
            return 3  # 全主领出，层级3
        return 3  # 副牌领出，层级3
    # follower
    if lead_suit is not None:
        # 领出是副牌花色
        if all_trump(one_player_cards, trump_suit):
            return 4  # 杀牌！N张全主
        if all(c.suit == lead_suit and not c.is_trump_of(trump_suit) for c in one_player_cards):
            return 3  # 全跟同花色
        # 混合垫
        return 1
    else:
        # 领出全主
        if all_trump(one_player_cards, trump_suit):
            return 3  # 跟主
        return 1  # 垫


def _max_strength_single(
    cards: List[Card],
    trump_suit: Optional[Suit],
    lead_suit: Optional[Suit],
    *,
    is_leader: bool,
) -> int:
    """同层级内，取最大的单张值。"""
    if lead_suit is None:
        # 全主比较：只取 is_trump 的那些
        tr_values = [trump_value(c, trump_suit, strict=True)
                     for c in cards if c.is_trump_of(trump_suit)]
        return max(tr_values) if tr_values else 0
    # 副牌花色领出
    all_tr = all_trump(cards, trump_suit)
    if all_tr:
        tr_values = [trump_value(c, trump_suit, strict=True)
                     for c in cards if c.is_trump_of(trump_suit)]
        return max(tr_values) if tr_values else 0
    same_side = [c for c in cards
                 if c.suit == lead_suit and not c.is_trump_of(trump_suit)]
    if same_side and len(same_side) == len(cards):
        return max(side_value(c) for c in same_side)
    return 0  # 垫牌


# ============ 上供选牌：最大 N 张（必须主、非5/10/K）============

def get_valid_tribute_cards_sorted(hand: List[Card], trump_suit: Optional[Suit]) -> List[Card]:
    """
    满足上供要求的牌，按从大到小排序：
    - 是主牌
    - 不是 5、10、K（不是分数牌）
    """
    if trump_suit is None:
        return []
    eligible = [
        c for c in hand
        if c.is_trump_of(trump_suit) and not c.is_score
    ]
    eligible.sort(key=lambda c: -trump_value(c, trump_suit, strict=True))
    return eligible


def validate_tribute_selection(
    hand: List[Card],
    selected_ids: List[str],
    required_N: int,
    trump_suit: Optional[Suit],
) -> Tuple[bool, List[Card], str]:
    """
    校验上供选牌合法性。返回 (ok, should_selected_cards, error_msg)。
    其中 should_selected_cards 是服务端算出来的「正确最大N张」，
    若玩家不够 N 张符合条件的，则返回全部符合条件的。
    """
    eligible_sorted = get_valid_tribute_cards_sorted(hand, trump_suit)
    actual_N = min(required_N, len(eligible_sorted))
    should = eligible_sorted[:actual_N]
    should_ids = {c.id for c in should}
    selected_ids_set = set(selected_ids)
    if selected_ids_set != should_ids or len(selected_ids) != len(should):
        return False, should, (
            f"必须选择最大的 {len(should)} 张符合条件的主牌（非分牌）"
        )
    return True, should, ""


# ============ 还牌合法性校验 ============

def validate_return_cards_banker(
    hand: List[Card],
    selected_ids: List[str],
    required_N: int,
    trump_suit: Optional[Suit],
) -> Tuple[bool, List[Card], str]:
    """庄家还牌：数量N；非主；非5/10/K"""
    if len(selected_ids) != required_N:
        return False, [], f"必须还 {required_N} 张"
    selected_by_id = {c.id: c for c in hand}
    cards: List[Card] = []
    for cid in selected_ids:
        if cid not in selected_by_id:
            return False, [], "包含不在手牌中的牌"
        cards.append(selected_by_id[cid])
    for c in cards:
        if c.is_trump_of(trump_suit):
            return False, [], "不能还主牌"
        if c.is_score:
            return False, [], "不能还 5/10/K 分数牌"
    return True, cards, ""


def validate_return_cards_banker_partner(
    hand: List[Card],
    selected_ids: List[str],
    required_N: int,
    trump_suit: Optional[Suit],
) -> Tuple[bool, List[Card], str]:
    """庄家对家还牌：数量N；非主；非5/10/K；所有牌花色各不相同"""
    ok, cards, err = validate_return_cards_banker(hand, selected_ids, required_N, trump_suit)
    if not ok:
        return ok, cards, err
    suits_seen = set()
    for c in cards:
        if c.suit in suits_seen:
            return False, [], "还牌花色不能相同（每张须不同花色）"
        suits_seen.add(c.suit)
    return True, cards, ""


# ============ 翻底定主决策 ============

def decide_trump_from_bottom(bottom_cards: List[Card]) -> Tuple[Optional[Suit], str]:
    """
    根据 6 张底牌定主：
      1. 第一张出现的 2（花色2）的花色即为主
      2. 6 张都无 2：看底牌缺门的花色（即 4 个普通花色中没有出现过的），按 黑桃>红桃>梅花>方块 顺序取第一个
      3. 无缺门（4花色都出现了）-> 返回 (None, "no_trump_reroll") 需要重洗
    返回 (trump_suit_or_None, status)
      status ∈ {"first_2", "missing_suit", "no_trump_reroll"}
    """
    # 1. 第一张出现的 2
    for c in bottom_cards:
        if c.rank == "2" and not c.is_joker:
            return c.suit, "first_2"
    # 2. 缺门
    present_suits = {c.suit for c in bottom_cards if not c.is_joker}
    for s in SUITS:  # type: ignore[assignment]
        if s not in present_suits:
            return s, "missing_suit"
    # 3. 4 花色都齐，无大小王之外的缺门
    return None, "no_trump_reroll"


# ============ 上供查表（规则 5.1）============

def lookup_tribute(defender_score: int) -> Tuple[int, bool]:
    """
    根据副家得分查 (上供张数, 是否换庄)
    """
    if defender_score == 0:
        return 3, False
    if 0 < defender_score <= 10:
        return 2, False
    if 10 < defender_score < 25:
        return 1, False
    if 25 <= defender_score < 35:
        return 0, False
    if 35 <= defender_score < 40:
        return 0, True
    if 40 <= defender_score < 50:
        return 1, True
    if 50 <= defender_score < 60:
        return 2, True
    # >=60
    return 3, True


# ============ UI 展示辅助 ============

SUIT_NAMES_CN: Dict[Suit, str] = {
    "spade": "黑桃", "heart": "红桃", "club": "梅花", "diamond": "方块", "joker": "王",
}
SUIT_SYMBOLS: Dict[Suit, str] = {
    "spade": "♠", "heart": "♥", "club": "♣", "diamond": "♦", "joker": "🃏",
}
SUIT_COLOR: Dict[Suit, str] = {
    "spade": "#0b0b0b", "heart": "#d12b2b", "club": "#0b0b0b", "diamond": "#d12b2b",
    "joker": "#6b21a8",
}


def _suit_name(s: Optional[Suit]) -> str:
    if s is None:
        return "主牌"
    return SUIT_NAMES_CN.get(s, str(s))


def render_card_text(c: Card) -> Tuple[str, str]:
    """返回 (大字符, 花色符号)。如 ('A', '♠') / ('大王', '🃏')"""
    if c.is_joker:
        return ("大王" if c.rank == "big" else "小王", SUIT_SYMBOLS["joker"])
    return (c.rank, SUIT_SYMBOLS[c.suit])
