from __future__ import annotations

from .backend.card_utils import (
    Card,
    validate_follow_cards,
    cards_of_suit_in_hand,
)


def _c(suit: str, rank: str) -> Card:
    return Card(suit=suit, rank=rank)


def test_follow_suit_includes_rank2_副2必须算进同花跟牌池():
    trump: str = "spade"

    leader_card = _c("club", "3")

    follower_hand = [
        _c("club", "2"),       # 梅花2（副2）— 规则：必须算"梅花"跟牌池
        _c("heart", "5"),
        _c("heart", "7"),
    ]

    suit_pool = cards_of_suit_in_hand(follower_hand, "club", trump, trump_as_suit=False)
    assert len(suit_pool) == 1 and suit_pool[0].rank == "2", (
        f"cards_of_suit_in_hand 应包含梅花2（副2），实际 len={len(suit_pool)}"
    )

    # 合法：跟牌梅花2
    ok, err = validate_follow_cards([leader_card], [_c("club", "2")], follower_hand, trump)
    assert ok, f"跟牌选梅花2应该合法，错误：{err}"

    # 非法：有梅花2却垫红桃
    ok, err = validate_follow_cards([leader_card], [_c("heart", "5")], follower_hand, trump)
    assert not ok and "必须跟" in err, (
        f"有梅花2时垫红桃应被拒绝，实际 ok={ok} err={err}"
    )


def test_follow_suit_only_side2_exists_手中只有副2没有副牌必须出副2():
    trump: str = "spade"
    leader_card = _c("club", "3")

    follower_hand = [_c("club", "2"), _c("heart", "A"), _c("diamond", "A")]
    ok, err = validate_follow_cards([leader_card], [_c("heart", "A")], follower_hand, trump)
    assert not ok, f"只有一张梅花2也必须跟梅花2，实际 ok={ok}"


def test_follow_suit_副2_plus_普通牌都有时必须跟_suit匹配即可():
    trump: str = "spade"
    leader_card = _c("club", "3")

    follower_hand = [_c("club", "2"), _c("club", "5"), _c("heart", "K")]
    suit_pool = cards_of_suit_in_hand(follower_hand, "club", trump, trump_as_suit=False)
    assert len(suit_pool) == 2, f"梅花2和梅花5都应算梅花池，len={len(suit_pool)}"

    # 跟梅花5（普通）合法
    ok, _ = validate_follow_cards([leader_card], [_c("club", "5")], follower_hand, trump)
    assert ok, "跟梅花5合法"

    # 跟梅花2（副2）合法
    ok, _ = validate_follow_cards([leader_card], [_c("club", "2")], follower_hand, trump)
    assert ok, "跟梅花2也合法（副2算同花色）"

    # 垫红桃非法
    ok, err = validate_follow_cards([leader_card], [_c("heart", "K")], follower_hand, trump)
    assert not ok, f"有梅花2+梅花5，垫红桃应被拒绝：err={err}"


def test_follow_no_suit可垫任意():
    trump: str = "spade"
    leader_card = _c("club", "3")
    follower_hand = [_c("heart", "4"), _c("heart", "5"), _c("diamond", "6"),
                     _c("spade", "A")]
    ok, _ = validate_follow_cards([leader_card], [_c("heart", "4")], follower_hand, trump)
    assert ok, "没梅花时可以垫红桃"
    ok, _ = validate_follow_cards([leader_card], [_c("spade", "A")], follower_hand, trump)
    assert ok, "没梅花时主牌杀合法"


if __name__ == "__main__":
    test_follow_suit_includes_rank2_副2必须算进同花跟牌池()
    print("PASS: 副2算进同花跟牌池 & 必须跟梅花2")
    test_follow_suit_only_side2_exists_手中只有副2没有副牌必须出副2()
    print("PASS: 手上只有副2也必须出")
    test_follow_suit_副2_plus_普通牌都有时必须跟_suit匹配即可()
    print("PASS: 副2+普通都有 必须跟 suit")
    test_follow_no_suit可垫任意()
    print("PASS: 没该花色可垫任意")
    print("\nALL 4 TEST ENGINE DIRECT CASES PASSED")
