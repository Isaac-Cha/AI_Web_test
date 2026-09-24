# 最小 WS 验证：创建房间 → 建立 playerId=真人P1 的 WebSocket → 发送 start_game → 看 AI 推进到 settlement
import asyncio, json, urllib.request, sys, time, traceback
import websockets

BASE = "http://127.0.0.1:8001/game/api"
WS   = "ws://127.0.0.1:8001/game/ws"

async def main():
    # 1) 创建带 3 AI 的房间
    req = urllib.request.Request(f"{BASE}/room/create",
        data=json.dumps({"player_name":"WS-测试真人P1","with_ai_count":3}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=5) as r:
        info = json.loads(r.read().decode())
    rid, pid, seat = info["room_id"], info["player_id"], info["seat"]
    print(f"Room {rid}  player={pid}  seat={seat}")

    # 2) 连接 WS 作为真人 seat
    uri = f"{WS}/{rid}/{pid}"
    print("WS connect:", uri)
    async with websockets.connect(uri, close_timeout=3) as ws:
        joined = json.loads(await ws.recv())
        # 兼容两种包裹：payload.game_state 或 data.state
        def _extract(m):
            pl = m.get("payload") or {}
            dt = m.get("data") or {}
            gs = pl.get("game_state") or dt.get("state") or m.get("game_state") or m.get("state")
            vs = pl.get("viewer_seat") if pl.get("viewer_seat") is not None else (dt.get("viewer_seat") if dt.get("viewer_seat") is not None else m.get("viewer_seat"))
            return gs, vs
        # players 标准化成 list
        def norm(st):
            if st and isinstance(st.get("players"), dict):
                st = dict(st); st["players"] = list(st["players"].values())
            return st
        print("After join:", joined["type"])
        init_state, _ = _extract(joined)
        init_state = norm(init_state)
        print(f"Initial phase={init_state['phase']}  players={[(p['seat'], p['name'], 'AI' if p.get('is_ai') else 'ME') for p in init_state['players']]}")

        # 3) 发送开始游戏
        await ws.send(json.dumps({"type":"start_game","payload":{}}))
        last_phase = init_state["phase"]
        last_def = init_state.get("defender_total_score", init_state.get("defender_score", 0))
        phases_seen = {last_phase}
        started = time.time()
        MAX_WAIT = 180
        steps = 0
        pending_actions_sent = set()  # 防止重复发
        last_hands = None  # 记录上次 hands tuple，保证 hands 变化时也打印
        while True:
            steps += 1
            if time.time() - started > MAX_WAIT:
                print("TIMEOUT")
                break
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
            except asyncio.TimeoutError:
                # 没消息时主动驱动：如果真人该行动 → 模拟前端点击对应按钮（drawing / flip_bottom / discard_bottom 自动选 6 张最小 / tribute_select 自动选最大 N / tribute_return 自动选 N 张随机合法 / playing 出牌等）
                # 我们在下面 state_update 分支内做动作更准确；这里只兜底：等待
                continue
            msg = json.loads(raw)
            if msg["type"] == "state_update":
                raw_st, viewer = _extract(msg)
                st = norm(raw_st)
                if st is None: continue
                phase = st.get("phase", "")
                def_ = st.get("defender_total_score", st.get("defender_score", 0))
                hands = [len(p.get("hand") or []) if viewer == p["seat"] else p.get("hand_count",0) for p in st["players"]]
                hands_tuple = tuple(hands)
                if phase != last_phase or def_ != last_def or (last_hands is None or last_hands != hands_tuple or steps % 50 == 0):
                    last_phase = phase
                    last_def = def_
                    last_hands = hands_tuple
                    phases_seen.add(phase)
                    tricks = st.get("tricks_history") or []
                    print(f"[t+{time.time()-started:5.1f}s] phase={phase:20s}  defender_score={def_:3d}  hands={hands}  tricks={len(tricks)}  viewer_seat={viewer}  current={st.get('current_seat')}  banker={st.get('banker_seat')}")
                if phase == "settlement":
                    rr = st.get("prev_result") or (st.get("round_results") or [None])[-1]
                    if rr:
                        print("\nSETTLEMENT OK:")
                        for k, v in rr.items():
                            print(f"  {k}: {v}")
                        print()
                    else:
                        print("\nSETTLEMENT OK (无 prev_result)\n")
                    print("Phases seen:", sorted(phases_seen))
                    print("MSG count:", steps)
                    return
                # 驱动真人 seat 的动作（模拟用户操作）
                current = st.get("current_seat")
                me_obj = next((p for p in st["players"] if p["seat"]==viewer), None)
                me_hand = me_obj.get("hand") or [] if me_obj else []
                myTurn = current == viewer and me_obj and not me_obj.get("is_ai")
                # playing 阶段：current_trick 的 lead_suit → 如果我有该花色副牌必须跟
                cur_trick = st.get("current_trick") or {}
                plays = cur_trick.get("plays") or [] if isinstance(cur_trick, dict) else []
                lead_suit = None
                if plays:
                    lead = plays[0]
                    if isinstance(lead, dict):
                        lead_cards = lead.get("cards") or []
                        if lead_cards:
                            lc = lead_cards[0]
                            if isinstance(lc, dict): lead_suit = lc.get("suit")
                # action turn 只发一次：对于 playing/drawing/reveal_next 循环性动作，加入 hands 总和保证唯一
                hands_sum = sum(p.get("hand_count", 0) for p in st["players"])
                turn = (phase, st.get("round_number"), current, st.get("tribute_giver"), st.get("banker_seat"), hands_sum, len(st.get("tricks_history") or []))
                if turn in pending_actions_sent:
                    pass
                else:
                    sent = False
                    if phase == "drawing" and myTurn:
                        await ws.send(json.dumps({"type":"draw_card","payload":{}}))
                        sent = True
                    elif phase == "flip_bottom" and myTurn:
                        await ws.send(json.dumps({"type":"flip_bottom","payload":{}}))
                        sent = True
                    elif phase == "discard_bottom" and viewer == st.get("banker_seat"):
                        # 扣底 6：选 6 张最小（按总分从小到大挑）
                        def scorev(c):
                            from functools import reduce
                            # 简易：rank_value + suit_order
                            rk = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14,"small":15,"big":16}.get(c.get("rank"), 1)
                            return rk + (100 if (c.get("suit")!="joker" and c.get("suit")==st.get("trump_suit")) or c.get("suit")=="joker" or c.get("rank")=="2" else 0)
                        ids = sorted(me_hand, key=scorev)[:6]
                        if len(ids)==6:
                            await ws.send(json.dumps({"type":"discard_bottom","payload":{"card_ids":[c["id"] for c in ids]}}))
                            sent = True
                    elif phase == "tribute_select" and viewer == st.get("tribute_giver"):
                        # 上供严格按最大 N 张主非分（后端校验，这里直接用前端算好的）
                        N = st.get("tribute_count") or 0
                        trump = st.get("trump_suit")
                        def is_t(c, t):
                            if not t: return False
                            if c.get("suit")=="joker": return True
                            if c.get("rank")=="2": return True
                            return c.get("suit")==t
                        def tr(c, t):
                            mp5 = 100000 if c.get("rank")=="5" and c.get("suit")==t else 0
                            bi = 90000 if c.get("rank")=="big" else (80000 if c.get("rank")=="small" else 0)
                            r2 = 70000 if c.get("rank")=="2" else 0
                            main2 = 10000 if c.get("rank")=="2" and c.get("suit")==t else 0
                            sk = {"A":60000,"K":59000,"Q":58000,"J":57000,"10":56000,"9":55000,"8":54000,"7":53000,"6":52000,"4":51000,"3":50000}.get(c.get("rank"), 0)
                            suit_bonus = {"spade":40,"heart":30,"club":20,"diamond":10}.get(c.get("suit") or "", 0)
                            return mp5 + bi + r2 + main2 + sk + suit_bonus
                        eligible = [c for c in me_hand if is_t(c, trump) and c.get("rank") not in ["5","10","K"]]
                        eligible.sort(key=lambda c: -tr(c, trump))
                        ids = eligible[:N]
                        if len(ids)==N:
                            await ws.send(json.dumps({"type":"select_tribute","payload":{"card_ids":[c["id"] for c in ids]}}))
                            sent = True
                    elif phase == "tribute_distribute" and viewer == st.get("banker_seat"):
                        # 分配：默认第一张给对家，其余自留；未分配的牌一次性自动分配
                        dist = st.get("tribute_distribution") or {}
                        all_sel = st.get("tribute_selected_cards") or []
                        banker = st.get("banker_seat")
                        partner = st.get("banker_partner_seat")
                        out = {}
                        for i,c in enumerate(all_sel):
                            if c.get("id") in dist: continue
                            if i < min(2, len(all_sel)//2):
                                out[c["id"]] = partner
                            else:
                                out[c["id"]] = banker
                        if out:
                            await ws.send(json.dumps({"type":"distribute_tribute","payload":{"distribution":out}}))
                            sent = True
                        else:
                            # 确认分配
                            await ws.send(json.dumps({"type":"distribute_tribute","payload":{"distribution":{}}}))
                            sent = True
                    elif phase == "tribute_return" and (viewer == st.get("banker_seat") or viewer == st.get("banker_partner_seat")):
                        # 还牌：随机选 N 张 非 5/10/K（对家要求花色互不相同这里简化，服务端若报错再调 decline）
                        N = st.get("tribute_count") or 0
                        # 优先非分小牌
                        hand_sorted = sorted(me_hand, key=lambda c: (
                            0 if c.get("rank") not in ["5","10","K"] else 1,
                            0 if c.get("suit")!="joker" and c.get("rank")!="2" and not (c.get("suit")==st.get("trump_suit") and st.get("trump_suit") is not None and c.get("suit")!="joker") else 1,
                            {"2":20,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14,"small":15,"big":16}.get(c.get("rank"),1)
                        ))
                        # 如果是对家 seat：确保花色互不相同
                        if viewer == st.get("banker_partner_seat"):
                            suits=set(); picks=[]
                            for c in hand_sorted:
                                if c.get("suit")!="joker" and c.get("suit") not in suits:
                                    suits.add(c.get("suit")); picks.append(c)
                                if len(picks)>=N: break
                            if len(picks)<N:
                                # 凑不够，可能需要大小王，不过小王等 suit=joker 也可算作 joker suit
                                for c in hand_sorted:
                                    if c in picks: continue
                                    if c.get("suit")=="joker" and "joker" not in suits:
                                        suits.add("joker"); picks.append(c)
                                    if len(picks)>=N: break
                            if len(picks)>=N:
                                await ws.send(json.dumps({"type":"select_return","payload":{"card_ids":[c["id"] for c in picks[:N]]}}))
                                sent = True
                        else:
                            ids = hand_sorted[:N]
                            if len(ids)==N:
                                await ws.send(json.dumps({"type":"select_return","payload":{"card_ids":[c["id"] for c in ids]}}))
                                sent = True
                    elif phase == "playing" and myTurn:
                        trump = st.get("trump_suit")
                        cur_trick = st.get("current_trick") or {}
                        is_leader = (cur_trick.get("leader") in (None, viewer)) or (len((cur_trick.get("played_order") or [])) == 0)
                        def is_tr(c):
                            if not trump: return False
                            s_ = c.get("suit"); r_ = c.get("rank")
                            return (s_=="joker") or (r_=="2") or (s_==trump)
                        def lv_any(c):
                            # 副非分优先，然后副分，然后主
                            it = is_tr(c)
                            is_sc = c.get("rank") in ["5","10","K"]
                            base = {"2":20,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14,"small":15,"big":16}.get(c.get("rank"),1)
                            return (0 if (not it and not is_sc) else (1 if (not it and is_sc) else (2 if (it and not is_sc) else 3)), base)
                        if me_hand:
                            selected = []
                            if is_leader:
                                # 领出：单张最小副非分（后续可以做甩牌，但这里先简单单张）
                                sorted_hand = sorted(me_hand, key=lv_any)
                                selected = [sorted_hand[0]["id"]]
                            else:
                                # 跟牌：N = leader 出的牌数
                                lead_suit = cur_trick.get("lead_suit")
                                all_tr = cur_trick.get("is_all_trump", False)
                                leader_ = cur_trick.get("leader")
                                cards_played_ = cur_trick.get("cards_played") or {}
                                # cards_played_ key 可能是 int seat 也可能 JSON 序列化后变成 str
                                lead_cards_ = None
                                if isinstance(leader_, int) and str(leader_) in cards_played_:
                                    lead_cards_ = cards_played_[str(leader_)]
                                elif isinstance(leader_, int) and leader_ in cards_played_:
                                    lead_cards_ = cards_played_[leader_]
                                elif isinstance(leader_, str) and leader_ in cards_played_:
                                    lead_cards_ = cards_played_[leader_]
                                N = len(lead_cards_) if lead_cards_ else 1
                                if N == 0: N = 1
                                if lead_suit is not None:
                                    # 副牌花色领出
                                    same_side = [c for c in me_hand if c.get("suit") == lead_suit and not is_tr(c)]
                                    if len(same_side) >= N:
                                        sorted_side = sorted(same_side, key=lv_any)
                                        selected = [c["id"] for c in sorted_side[:N]]
                                    else:
                                        # 不够则随便出（先垫小副非分/分/主 顺序）
                                        sorted_hand = sorted(me_hand, key=lv_any)
                                        selected = [c["id"] for c in sorted_hand[:N]]
                                elif all_tr:
                                    # 全主领出
                                    trs = [c for c in me_hand if is_tr(c)]
                                    if len(trs) >= N:
                                        sorted_tr = sorted(trs, key=lv_any)
                                        selected = [c["id"] for c in sorted_tr[:N]]
                                    else:
                                        sorted_hand = sorted(me_hand, key=lv_any)
                                        selected = [c["id"] for c in sorted_hand[:N]]
                                else:
                                    # 未知，随便按副非分小的
                                    sorted_hand = sorted(me_hand, key=lv_any)
                                    selected = [c["id"] for c in sorted_hand[:N]]
                            if selected:
                                await ws.send(json.dumps({"type":"play_cards","payload":{"card_ids":selected}}))
                                sent = True
                    elif phase == "reveal_bottom" and myTurn:
                        await ws.send(json.dumps({"type":"reveal_next","payload":{}}))
                        sent = True
                    if sent:
                        pending_actions_sent.add(turn)
            elif msg["type"] == "action_result":
                ok = (msg.get("payload") or {}).get("success")
                err = (msg.get("payload") or {}).get("error")
                if ok is False and err:
                    print("ACTION FAIL:", err)
                    # 动作失败，清掉 pending 允许重试
                    pending_actions_sent.clear()
            elif msg["type"] == "error":
                text = (msg.get("data") or {}).get("message") or (msg.get("payload") or {}).get("message") or msg.get("message")
                print("SERVER ERROR:", text)
                # 出错时允许重试（清 tag）
                pending_actions_sent.clear()
            elif msg["type"] == "message":
                text = (msg.get("data") or {}).get("message") or (msg.get("payload") or {}).get("message") or msg.get("message")
                print("SERVER MSG:", text)
    print("Phases seen:", sorted(phases_seen))

if __name__ == "__main__":
    asyncio.run(main())
