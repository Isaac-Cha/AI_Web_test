from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import ValidationError

from . import card_utils as cu
from . import game_engine as ge
from .ai_player import maybe_trigger_ai_actions
from .models import WSMessageIn, WSMessageOut
from .room_manager import ROOMS

router = APIRouter()
log = logging.getLogger("show_thumb.ws")

ENABLE_AI = os.getenv("GAME_ENABLE_AI", "true").lower() not in ("0", "false", "no", "off")


@router.websocket("/game/ws/{room_id}/{player_id}")
async def game_ws(
    websocket: WebSocket,
    room_id: str,
    player_id: str,
):
    """WebSocket 入口。room_id 大小写不敏感。"""
    await websocket.accept()
    room = ROOMS.get(room_id.upper())
    if room is None:
        await websocket.send_json(WSMessageOut(
            type="room_not_found", payload={"reason": f"房间 {room_id} 不存在"}
        ).model_dump(mode="json"))
        await websocket.close()
        return

    # 按 player_id 反查座位号
    viewer_seat: Optional[int] = None
    for s, p in room.state.players.items():
        if p.id == player_id:
            viewer_seat = s
            p.connected = True
            break
    if viewer_seat is None:
        # 允许「观战者」：没有 player_id 但也能看；为简化这里拒绝
        await websocket.send_json(WSMessageOut(
            type="room_not_found", payload={"reason": "玩家不在该房间，请先创建/加入"}
        ).model_dump(mode="json"))
        await websocket.close()
        return

    room.connections[viewer_seat].append(websocket)
    log.info(f"WS connected room={room_id} seat={viewer_seat} connections={len(room.connections[viewer_seat])}")

    # 一连接就推送当前 state
    try:
        masked = ge.mask_state_for_viewer(room.state, viewer_seat)
        await websocket.send_json(WSMessageOut(type="state_update", payload={
            "game_state": masked.model_dump(mode="json"),
            "viewer_seat": viewer_seat,
        }).model_dump(mode="json"))
    except Exception as e:  # noqa: BLE001
        log.warning(f"initial state send fail: {e}")

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_json(), timeout=2)
            except asyncio.TimeoutError:
                try:
                    await websocket.send_json(WSMessageOut(type="pong").model_dump(mode="json"))
                except Exception:  # noqa: BLE001
                    break
                # 即使客户端没有消息，也主动推进 AI（drawing 期间全 AI 摸牌 / playing AI 出牌 / tribute / discard 都要推进）
                if ENABLE_AI:
                    try:
                        await maybe_trigger_ai_actions(room)
                        await room.broadcast_state()
                        if room.state.phase == "reveal_bottom":
                            async with room.lock:
                                for _ in range(6):
                                    ge.do_reveal_next(room.state)
                                    if room.state.phase != "reveal_bottom":
                                        break
                            await room.broadcast_state()
                            if ENABLE_AI and room.state.phase == "settlement":
                                await maybe_trigger_ai_actions(room)
                                await room.broadcast_state()
                    except Exception as e:  # noqa: BLE001
                        log.warning(f"pong AI tick fail: {e}")
                continue
            except WebSocketDisconnect:
                break
            try:
                msg = WSMessageIn.model_validate(raw)
            except ValidationError as e:
                log.warning(f"seat{viewer_seat} invalid msg type {raw.get('type')!r}: {e}")
                try:
                    await websocket.send_json(WSMessageOut(
                        type="error",
                        payload={"message": f"非法消息 type={raw.get('type')!r}"}
                    ).model_dump(mode="json"))
                except Exception:  # noqa: BLE001
                    pass
                continue
            await _handle_message(room, viewer_seat, msg)
            # 每次消息处理完广播 state
            await room.broadcast_state()
            # 然后触发 AI
            if ENABLE_AI:
                await maybe_trigger_ai_actions(room)
                await room.broadcast_state()
                # reveal_bottom: 翻底牌触发（state_update 之后）
                if room.state.phase == "reveal_bottom":
                    # AI 自动翻完
                    async with room.lock:
                        for _ in range(6):
                            ge.do_reveal_next(room.state)
                    await room.broadcast_state()
                    if ENABLE_AI and room.state.phase == "settlement":
                        await maybe_trigger_ai_actions(room)
                        await room.broadcast_state()
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in room.connections[viewer_seat]:
            room.connections[viewer_seat].remove(websocket)
        still_conn = any(
            any(ws.client is not None for ws in conns)
            for conns in room.connections.values()
        )
        if not still_conn:
            # 5 分钟后没人连，可考虑清理房间；这里简单处理（不自动清理以免丢失AI局）
            pass
        log.info(f"WS disconnected room={room_id} seat={viewer_seat}")


async def _handle_message(room, viewer_seat: int, msg: WSMessageIn) -> None:
    """所有业务消息串行化执行（room.lock）。"""
    action = msg.type
    payload = msg.payload or {}
    try:
        async with room.lock:
            state = room.state
            if action == "ping":
                pass
            elif action == "start_game":
                ge.start_game(state)
            elif action == "draw_card":
                ge.do_draw_card(state, viewer_seat)
            elif action == "declare_ban2":
                cid = payload.get("card_id")
                if not cid:
                    raise ValueError("缺少 card_id")
                ge.do_declare_ban2(state, viewer_seat, cid)
            elif action == "flip_bottom":
                ge.do_flip_bottom(state, viewer_seat)
            elif action == "discard_bottom":
                cids = payload.get("card_ids") or []
                ge.do_discard_bottom(state, viewer_seat, list(cids))
            elif action == "select_tribute":
                cids = payload.get("card_ids") or []
                ge.do_select_tribute(state, viewer_seat, list(cids))
            elif action == "distribute_tribute":
                dist = payload.get("distribution") or {}
                # distribution: {card_id_str: receiver_seat_int}
                dist_clean = {str(k): int(v) for k, v in dist.items()}
                ge.do_distribute_tribute(state, viewer_seat, dist_clean)
            elif action == "select_return":
                cids = payload.get("card_ids") or []
                ge.do_select_return(state, viewer_seat, list(cids))
            elif action == "decline_cards":
                ge.do_decline_cards(state, viewer_seat)
            elif action == "play_cards":
                cids = payload.get("card_ids") or []
                ge.do_play_cards(state, viewer_seat, list(cids))
            elif action == "reveal_next":
                ge.do_reveal_next(state)
            elif action == "next_round":
                ge.do_next_round(state)
            else:
                await _send_result(room, viewer_seat, False, f"未知动作 {action}")
                return
        await _send_result(room, viewer_seat, True, "")
    except ValueError as e:
        await _send_result(room, viewer_seat, False, str(e))
    except Exception as e:  # noqa: BLE001
        log.exception("handle msg error")
        await _send_result(room, viewer_seat, False, f"内部错误: {e}")


async def _send_result(room, seat: int, ok: bool, error: str) -> None:
    if ok and not error:
        return
    await room.send_to(seat, WSMessageOut(
        type="action_result",
        payload={"success": ok, "error": error or None},
    ))
