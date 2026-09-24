"""冒烟测试：全 AI 4 人自动跑完一局"""
import asyncio
import logging
import sys
import os

# Windows CMD 打印 Unicode 不出错
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from game.backend import game_engine as ge
from game.backend.room_manager import ROOMS
from game.backend.ai_player import maybe_trigger_ai_actions

logging.basicConfig(level=logging.WARNING)

state = ge.create_new_room("TEST001")
room = ROOMS.create(state)

names = ["玩家1", "AI-右上", "AI-对家", "AI-左下"]
for i, name in enumerate(names):
    seat, pid = ge.add_player(state, name, seat_hint=i, is_ai=True)
    print(f"  seat={seat} id={pid[:6]}.. name={name} team={state.players[seat].team}")

ge.start_game(state)
print("Start:", state.phase, "round=", state.round_number, "current_seat=", state.current_seat)


async def run():
    steps = 0
    prev_phase = None
    while state.phase != "settlement" and steps < 2000:
        steps += 1
        try:
            await maybe_trigger_ai_actions(room)
        except Exception as e:  # noqa: BLE001
            print(f"  [AI EXCEPTION step {steps}] phase={state.phase}: {e!r}")
            import traceback
            traceback.print_exc()
            break
        # reveal_bottom：强制翻完
        inner = 0
        while state.phase == "reveal_bottom" and inner < 12:
            inner += 1
            ge.do_reveal_next(state)
        if state.phase != prev_phase:
            prev_phase = state.phase
            scores = [p.hand_count for p in state.players.values()]
            print(f"  [step {steps:4d}] phase={state.phase:22s}  tricks={len(state.tricks_history):2d}  hands={scores}  def_score={state.defender_total_score}")
        if steps % 300 == 0:
            print(f"    ... step {steps}: phase={state.phase}, current_seat={state.current_seat}")
            if state.current_trick:
                print(f"        current_trick leader={state.current_trick.leader} played={state.current_trick.played_order}")

    print(f"\n== Done in {steps} steps ==")
    print(f"  Final phase: {state.phase}")
    for s, p in state.players.items():
        print(f"  seat{s} {p.name}: hand_count={p.hand_count}, banker={p.is_banker}")
    if state.prev_result:
        r = state.prev_result
        print(f"  Round {r.round_number} RESULT:")
        print(f"    defender team={r.defender_team} score={r.defender_score}/100")
        print(f"    bottom_score={r.bottom_score}, captured={r.bottom_captured}")
        print(f"    next tribute_count={r.tribute_count}, change_banker={r.change_banker}")
        print(f"    new_banker_seat={r.new_banker_seat}, tribute_giver={r.tribute_giver_seat}")
        print(f"    winner_team={r.winner_team}")
        return True
    else:
        print("  ! No result yet. LAST 12 LOGS:")
        for item in state.message_log[-12:]:
            text = item.get("text") or ""
            print("   ", item.get("level"), "-", text[:80])
        return False


ok = asyncio.run(run())
print("\nSmoke test:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
