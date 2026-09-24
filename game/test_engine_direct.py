# 直接内存调用（不经过 WS）测试 start → drawing → discard → ... → settlement，看是否推进
import asyncio, sys, os, traceback
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from game.backend import game_engine as ge, ai_player, card_utils as cu
from game.backend.room_manager import Room

async def main():
    os.environ["GAME_AI_MIN_DELAY_MS"]="0"
    os.environ["GAME_AI_MAX_DELAY_MS"]="1"
    # 不经过 manager，手动构建 room+state（按 routes_http.create_room 逻辑）
    state = ge.create_new_room()
    room = Room(state)
    my_seat, my_pid = ge.add_player(state, "直测P1", seat_hint=0)
    ai_names = ["AI-左", "AI-对", "AI-右"]
    remaining = [s for s in (1, 2, 3) if s not in state.players]
    for i, s in enumerate(remaining):
        ge.add_player(state, ai_names[i], seat_hint=s, is_ai=True)
    print("room_id=", state.room_id, "my seat=", my_seat, "players", [(s, p.name, "AI" if p.is_ai else "HUMAN") for s,p in state.players.items()])

    # 开局
    async with room.lock:
        ge.start_game(state)
    await room.broadcast_state()
    last_phase = state.phase
    last_def = state.defender_total_score
    last_current = state.current_seat
    seen = {last_phase}
    MAX = 2000
    for i in range(MAX):
        phase = state.phase
        cur = state.current_seat
        hum = my_seat
        banker = state.banker_seat
        me_obj = state.players[hum]
        myhand = list(me_obj.hand)
        action_taken = False
        async with room.lock:
            if phase == "drawing" and cur == hum:
                ge.do_draw_card(state, hum); action_taken=True
            elif phase == "flip_bottom" and cur in (None, -1):
                # 翻底：让真人（如果副家）翻；否则继续
                try:
                    flipper = cur
                    if flipper in (None, -1):
                        # 找任意一个非庄家副家 seat（这里用 hum）
                        flipper = hum
                    ge.do_flip_bottom(state, flipper); action_taken=True
                except ValueError as e:
                    # 可能是庄家队不能主动翻（如果当前逻辑禁止）
                    pass
            elif phase == "discard_bottom" and banker == hum:
                tr = state.trump_suit
                sorted_c = sorted(myhand, key=lambda c: (
                    0 if (not c.is_trump_of(tr) and c.rank not in ["5","10","K"]) else 1,
                    -cu.side_value(c) if not c.is_trump_of(tr) else -cu.trump_value(c, tr, strict=True)
                ))
                ids = [c.id for c in sorted_c[:6]]
                if len(ids)==6:
                    ge.do_discard_bottom(state, hum, ids); action_taken=True
            elif phase == "tribute_select" and hum == state.tribute_giver:
                N = state.tribute_count or 0
                t = state.trump_suit
                eligible = [c for c in myhand if c.is_trump_of(t) and c.rank not in ["5","10","K"]]
                eligible.sort(key=lambda c: -cu.trump_value(c, t, strict=True))
                ids = [c.id for c in eligible[:N]]
                if len(ids)==N:
                    ge.do_select_tribute(state, hum, ids); action_taken=True
            elif phase == "tribute_distribute" and hum == state.tribute_giver_partner:
                dist = dict(state.tribute_distribution)
                sel = list(state.tribute_cards) or []
                bnk = state.banker_seat
                partner = state.banker_partner_seat
                sent_out = {}
                for idx, c in enumerate(sel):
                    if str(c.id) in dist: continue
                    # 均分：如果 len(sel)==1 默认给 banker
                    sent_out[str(c.id)] = bnk if idx < (len(sel)+1)//2 else partner
                if sent_out:
                    ge.do_distribute_tribute(state, hum, sent_out); action_taken=True
                else:
                    ge.do_distribute_tribute(state, hum, {}); action_taken=True
            elif phase == "tribute_return" and hum in (banker, state.banker_partner_seat):
                tr = state.trump_suit
                if hum == banker:
                    N = len(state.cards_to_banker)
                else:
                    N = len(state.cards_to_banker_partner)
                if N <= 0:
                    # 直接 skip 也可以，但不选择会卡住。如果 N=0 说明不用还牌，engine 应该会自动跳过？
                    # 保险：decline = True 直接告诉 engine 跳过，这里不处理
                    pass
                if hum == state.banker_partner_seat:
                    suits=set(); picks=[]
                    # 庄家对家：优先不同花色的最小非主非分
                    rk = {"2":120,"A":110,"K":100,"Q":90,"J":80,"10":70,"9":60,"8":50,"7":40,"6":30,"5":20,"4":10,"3":0}
                    candidate = sorted(myhand, key=lambda c: (
                        1 if (c.is_trump_of(tr) or c.rank in ["5","10","K"]) else 0,
                        rk.get(c.rank, 0)
                    ))
                    for c in candidate:
                        if c.is_trump_of(tr) or c.rank in ["5","10","K"]: continue
                        s = c.suit.name if hasattr(c.suit,"name") else str(c.suit)
                        if s == "joker": continue
                        if c.suit not in suits:
                            suits.add(c.suit); picks.append(c)
                        if len(picks) >= N: break
                    if len(picks) < N:
                        # 实在不够，再从合格的（非主非分）里随便补（同花色也没关系，尽量满足张数）
                        for c in candidate:
                            if c in picks: continue
                            if c.is_trump_of(tr) or c.rank in ["5","10","K"]: continue
                            if c.suit == "joker": continue
                            picks.append(c)
                            if len(picks) >= N: break
                    if len(picks) >= N:
                        ge.do_select_return(state, hum, [c.id for c in picks[:N]]); action_taken=True
                else:
                    rk = {"2":120,"A":110,"K":100,"Q":90,"J":80,"10":70,"9":60,"8":50,"7":40,"6":30,"5":20,"4":10,"3":0}
                    cand = sorted(myhand, key=lambda c: (
                        1 if (c.is_trump_of(tr) or c.rank in ["5","10","K"]) else 0,
                        rk.get(c.rank, 0)
                    ))
                    valid = [c for c in cand if not c.is_trump_of(tr) and c.rank not in ["5","10","K"] and c.suit != "joker"]
                    if len(valid) >= N:
                        ge.do_select_return(state, hum, [c.id for c in valid[:N]]); action_taken=True
            elif phase == "playing" and cur == hum:
                tr = state.trump_suit
                ct = state.current_trick
                isTrump = lambda c: (c.suit=="joker" or c.rank=="2" or (tr and c.suit==tr))
                rkSide = {"2":120,"A":110,"K":100,"Q":90,"J":80,"10":70,"9":60,"8":50,"7":40,"6":30,"5":20,"4":10,"3":0}
                rkTrump = {"3":0,"4":10,"6":30,"7":40,"8":50,"9":60,"10":70,"J":80,"Q":90,"K":100,"A":110,"2":700,"small":800,"big":900,"5":1000}
                # Trick 字段：cards_played / played_order / is_all_trump / lead_suit（注意：没有 lead_cards）
                leadCards = []
                if ct and ct.played_order:
                    leaderSeat = ct.played_order[0]
                    leadCards = list(ct.cards_played.get(leaderSeat, []))
                N = len(leadCards)
                if not ct or not ct.played_order or N == 0:
                    # 领出
                    sides = [c for c in myhand if not isTrump(c)]
                    if sides:
                        sides.sort(key=lambda c: rkSide.get(c.rank, 0))
                        ge.do_play_cards(state, hum, [sides[0].id]); action_taken=True
                    else:
                        cand = sorted(myhand, key=lambda c: rkTrump.get(c.rank, 0))
                        ge.do_play_cards(state, hum, [cand[0].id]); action_taken=True
                else:
                    # 跟牌：根据 validate_follow_cards 规则选出合法 N 张
                    allTrumpLead = ct.is_all_trump
                    if not allTrumpLead:
                        ls = ct.lead_suit
                        sameSuitSide = [c for c in myhand if c.suit==ls and not isTrump(c)]
                        if len(sameSuitSide) >= N:
                            sameSuitSide.sort(key=lambda c: rkSide.get(c.rank, 0))
                            ge.do_play_cards(state, hum, [c.id for c in sameSuitSide[:N]]); action_taken=True
                        else:
                            allSorted = sorted(myhand, key=lambda c: (
                                100000 + rkTrump.get(c.rank, 0) if isTrump(c) else rkSide.get(c.rank, 0)
                            ))
                            ge.do_play_cards(state, hum, [c.id for c in allSorted[:N]]); action_taken=True
                    else:
                        trumps = [c for c in myhand if isTrump(c)]
                        if len(trumps) >= N:
                            trumps.sort(key=lambda c: rkTrump.get(c.rank, 0))
                            ge.do_play_cards(state, hum, [c.id for c in trumps[:N]]); action_taken=True
                        else:
                            allSorted = sorted(myhand, key=lambda c: (
                                rkTrump.get(c.rank, 0) if isTrump(c) else -1000 + rkSide.get(c.rank, 0)
                            ))
                            ge.do_play_cards(state, hum, [c.id for c in allSorted[:N]]); action_taken=True
            elif phase == "reveal_bottom":
                try: ge.do_reveal_next(state); action_taken=True
                except ValueError: pass
            elif phase == "settlement":
                if state.round_number < 3:
                    ge.do_next_round(state); action_taken=True
                else:
                    print("FINISHED at round", state.round_number)
                    break
        if action_taken:
            await room.broadcast_state()

        # AI 驱动
        await ai_player.maybe_trigger_ai_actions(room)
        await room.broadcast_state()
        # reveal_bottom settlement 自动兜底（同 routes_ws）
        if state.phase == "reveal_bottom":
            async with room.lock:
                for _ in range(6):
                    ge.do_reveal_next(state)
                    if state.phase != "reveal_bottom": break
            await room.broadcast_state()
            if state.phase == "settlement":
                await ai_player.maybe_trigger_ai_actions(room)
                await room.broadcast_state()
        phase = state.phase
        def_score = state.defender_total_score
        hands = [p.hand_count for p in state.players.values()]
        cur = state.current_seat
        if phase != last_phase or def_score != last_def or cur != last_current or (i % 50 == 0):
            print(f"[{i:4d}] phase={phase:20s}  def={def_score:3d}  hands={hands}  current={cur}  tricks={len(state.tricks_history)}  banker={state.banker_seat}")
            last_phase = phase; last_def = def_score; last_current = cur; seen.add(phase)
        if phase == "settlement" and state.prev_result is not None:
            rr = state.prev_result
            print("\nRound", state.round_number - 1, "RESULT:")
            for k,v in rr.model_dump(mode="python").items(): print(f"  {k}: {v}")
            if state.round_number > 3:
                break
    print("\nseen phases:", sorted(seen))

if __name__ == "__main__":
    asyncio.run(main())
