import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["GAME_AI_MIN_DELAY_MS"]="0"
os.environ["GAME_AI_MAX_DELAY_MS"]="1"
from game.backend import game_engine as ge, ai_player
from game.backend.room_manager import Room
state=ge.create_new_room()
r=Room(state)
ge.add_player(state,"P",seat_hint=0)
ge.add_player(state,"A1",seat_hint=1,is_ai=True)
ge.add_player(state,"A2",seat_hint=2,is_ai=True)
ge.add_player(state,"A3",seat_hint=3,is_ai=True)
print("BEFORE start phase=%s current=%s hands=%s" % (state.phase, state.current_seat, [p.hand_count for p in state.players.values()]))
ge.start_game(state)
print("AFTER start phase=%s current=%s hands=%s trump=%s banker=%s" % (state.phase, state.current_seat, [p.hand_count for p in state.players.values()], state.trump_suit, state.banker_seat))
async def t():
    for i in range(10):
        await ai_player.maybe_trigger_ai_actions(r)
        phase = state.phase
        cur = state.current_seat
        hands = [p.hand_count for p in state.players.values()]
        print(f"[{i}] phase={phase} current={cur} hands={hands} trump={state.trump_suit} banker={state.banker_seat}")
        if any(h >= 12 for h in hands) and phase not in ("drawing",):
            break
asyncio.run(t())
