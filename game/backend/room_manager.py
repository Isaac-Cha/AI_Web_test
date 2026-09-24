"""房间内存字典 + WebSocket 连接广播。V1.0 纯内存，进程重启清空。"""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, List, Optional

from fastapi import WebSocket

from .game_engine import mask_state_for_viewer
from .models import GameState, WSMessageOut, Player

log = logging.getLogger("show_thumb.room")


class Room:
    def __init__(self, state: GameState):
        self.state = state
        # seat -> list of websocket connections (允许同一玩家多开 tab 观战，seat=其座位)
        self.connections: Dict[int, List[WebSocket]] = {0: [], 1: [], 2: [], 3: []}
        # 锁：确保同一房间的操作串行化（避免并发改 state）
        self.lock = asyncio.Lock()
        # AI manager 引用（room_manager 注入）
        self.ai_manager = None

    async def broadcast_state(self, *, include_spectator_global: bool = False) -> None:
        """给每个座位推送其视角的 state_update。"""
        for seat, conns in self.connections.items():
            if not conns:
                continue
            masked = mask_state_for_viewer(self.state, seat)
            payload = {
                "game_state": masked.model_dump(mode="json"),
                "viewer_seat": seat,
            }
            msg = WSMessageOut(type="state_update", payload=payload)
            for ws in conns:
                try:
                    await ws.send_json(msg.model_dump(mode="json"))
                except Exception as e:  # noqa: BLE001
                    log.debug(f"seat{seat} send fail: {e}")

    async def broadcast_log(self, text: str, level: str = "info",
                            seat: Optional[int] = None) -> None:
        msg = WSMessageOut(type="game_log", payload={"text": text, "level": level, "seat": seat})
        await self._broadcast_all(msg)

    async def broadcast_msg(self, msg: WSMessageOut) -> None:
        await self._broadcast_all(msg)

    async def _broadcast_all(self, msg: WSMessageOut) -> None:
        raw = msg.model_dump(mode="json")
        for seat, conns in self.connections.items():
            for ws in conns:
                try:
                    await ws.send_json(raw)
                except Exception:  # noqa: BLE001
                    pass

    async def send_to(self, seat: int, msg: WSMessageOut) -> None:
        raw = msg.model_dump(mode="json")
        for ws in self.connections.get(seat, []):
            try:
                await ws.send_json(raw)
            except Exception:  # noqa: BLE001
                pass


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def create(self, state: GameState) -> Room:
        if state.room_id in self.rooms:
            raise ValueError("房间号已存在")
        r = Room(state)
        self.rooms[state.room_id] = r
        return r

    def get(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id)

    def remove(self, room_id: str) -> None:
        self.rooms.pop(room_id, None)

    def try_persist_round(self, room_id: str) -> None:
        """V1.0 空钩子（同步，因为 do_reveal_next 是同步函数）：V1.1 接入 MongoDB show_thumb 持久化对局历史。

        V1.1 改写为 async 调用点改 do_reveal_next 为 async 版本后 await。
        V1.0 无副作用，静默 no-op。
        """
        # room = self.rooms.get(room_id)
        # if room is None: return
        # TODO(V1.1): await get_collection("rounds").insert_one({
        #     "room_id": room.state.room_id,
        #     "round_number": room.state.round_number,
        #     "result": room.state.prev_result.model_dump(mode="json"),
        #     "snapshot": room.state.model_dump(mode="json"),
        #     "created_at": datetime.utcnow(),
        # })
        return None


ROOMS = RoomManager()
