from __future__ import annotations

import logging
import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import game_engine as ge
from .models import (
    CreateRoomReq,
    CreateRoomResp,
    GamePhase,
    JoinRoomReq,
    JoinRoomResp,
    RoomBrief,
    seat_team,
)
from .room_manager import ROOMS, Room

router = APIRouter(prefix="/game/api", tags=["game"])

ENABLE_AI = os.getenv("GAME_ENABLE_AI", "true").lower() not in ("0", "false", "no", "off")
log = logging.getLogger("show_thumb.http")


# ============ health ============
@router.get("/health")
async def health():
    return {
        "ok": True,
        "service": "show-thumb (办二)",
        "rooms": len(ROOMS.rooms),
        "ai_enabled": ENABLE_AI,
    }


# ============ create ============
@router.post("/room/create", response_model=CreateRoomResp)
async def create_room(req: CreateRoomReq):
    if not req.player_name:
        raise HTTPException(400, "player_name required")
    state = ge.create_new_room()
    room = ROOMS.create(state)
    seat, pid = ge.add_player(state, req.player_name, seat_hint=0)
    # 加入 AI（如果有）
    if ENABLE_AI and req.with_ai_count > 0:
        ai_names = list(req.ai_names) or ["AI-左", "AI-对", "AI-右"]
        remaining = [s for s in (1, 2, 3) if s not in state.players]
        ai_count = min(req.with_ai_count, len(remaining))
        for i in range(ai_count):
            s = remaining[i]
            name = ai_names[i] if i < len(ai_names) else f"AI{i+1}"
            ge.add_player(state, name, seat_hint=s, is_ai=True)
    return CreateRoomResp(room_id=state.room_id, player_id=pid, seat=seat)


# ============ join ============
@router.post("/room/join", response_model=JoinRoomResp)
async def join_room(req: JoinRoomReq):
    if not req.room_id:
        raise HTTPException(400, "room_id required")
    room = ROOMS.get(req.room_id.upper())
    if room is None:
        return JoinRoomResp(ok=False, room_id=req.room_id, error="房间不存在")
    try:
        seat, pid = ge.add_player(room.state, req.player_name or "玩家")
    except ValueError as e:
        return JoinRoomResp(ok=False, room_id=req.room_id, error=str(e))
    return JoinRoomResp(ok=True, room_id=room.state.room_id, player_id=pid, seat=seat)


# ============ list (调试用) ============
@router.get("/rooms", response_model=List[RoomBrief])
async def list_rooms():
    out = []
    for rid, r in ROOMS.rooms.items():
        st = r.state
        out.append(RoomBrief(room_id=rid, player_count=len(st.players), phase=st.phase))
    return out


# ============ force start (调试) ============
class SeatReq(BaseModel):
    player_id: str

class RoomIdReq(BaseModel):
    room_id: str

@router.post("/room/start")
async def start_room(req: RoomIdReq):
    room = ROOMS.get(req.room_id.upper())
    if room is None:
        raise HTTPException(404, "room not found")
    async with room.lock:
        try:
            ge.start_game(room.state)
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
    await room.broadcast_state()
    # 触发 AI
    from .ai_player import maybe_trigger_ai_actions
    if ENABLE_AI:
        await maybe_trigger_ai_actions(room)
        await room.broadcast_state()
    return {"ok": True}
