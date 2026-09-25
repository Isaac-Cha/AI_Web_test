from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, computed_field, ConfigDict, Field

# ============ 枚举常量 ============

Suit = Literal["spade", "heart", "club", "diamond", "joker"]
Rank = Literal["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "small", "big"]
Team = Literal["A", "B"]  # A=seat0&seat2 (玩家1&玩家3), B=seat1&seat3 (玩家2&玩家4)

GamePhase = Literal[
    "waiting",          # 等待玩家加入
    "drawing",          # 摸牌（含办二）
    "flip_bottom",      # 翻底定主
    "discard_bottom",   # 庄家扣底
    "tribute_select",   # 上供者选牌
    "tribute_distribute",  # 对家分配上供牌
    "tribute_return",   # 庄家+庄家对家还牌
    "playing",          # 出牌
    "reveal_bottom",    # 翻底牌展示（动画用）
    "settlement",       # 结算弹窗
    "finished",         # 结束
]

DeclareMethod = Literal["ban2", "flip", "none"]
WSMessageTypeClient = Literal[
    "join_room", "ready", "start_game",
    "draw_card", "declare_ban2", "flip_bottom",
    "discard_bottom",
    "select_tribute", "distribute_tribute",
    "select_return", "decline_cards",
    "play_cards", "next_round",
    "ping",
]
WSMessageTypeServer = Literal[
    "state_update", "action_result", "game_log",
    "flip_card", "trick_result", "settlement",
    "pong", "player_joined", "room_not_found",
]


def seat_team(seat: int) -> Team:
    """seat 0,2 -> A; seat 1,3 -> B"""
    return "A" if seat in (0, 2) else "B"


def teammate_seat(seat: int) -> int:
    """对家座位号"""
    return (seat + 2) % 4


def next_seat(seat: int, step: int = 1) -> int:
    return (seat + step) % 4


# ============ Card ============

class Card(BaseModel):
    """一张扑克牌。牌面唯一 ID = {suit}_{rank}"""

    model_config = ConfigDict(frozen=True)  # 不可变，可当 dict key / set 元素

    suit: Suit
    rank: Rank
    id: str = ""  # 由 validator 自动生成

    def __init__(__pydantic_self__, **data):
        if "id" not in data or not data["id"]:
            data["id"] = f"{data['suit']}_{data['rank']}"
        super().__init__(**data)

    # 主牌标记由外部根据当前 trump_suit 动态计算，不冻结在 Card 里
    # （因为同一局过程中 trump_suit 确定前 is_trump 是不确定的）
    def is_trump_of(self, trump_suit: Optional[Suit]) -> bool:
        """给定当前主花色，判断这张是不是主牌"""
        if trump_suit is None:
            return False
        if self.suit == "joker":
            return True  # 大小王永远是主
        if self.rank == "2":
            return True  # 所有的 2 都是主（主2 和 副2 都算主牌，只是大小不同）
        return self.suit == trump_suit

    @property
    def is_score(self) -> bool:
        return self.rank in ("5", "10", "K")

    @property
    def score_value(self) -> int:
        if self.rank == "5":
            return 5
        if self.rank in ("10", "K"):
            return 10
        return 0

    @property
    def is_joker(self) -> bool:
        return self.suit == "joker"

    @property
    def is_rank2(self) -> bool:
        return self.rank == "2" and not self.is_joker


# ============ Player ============

class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "玩家"
    seat: int  # 0-3
    team: Team
    connected: bool = True  # WebSocket 连接状态
    is_banker: bool = False

    # 手牌（服务端永远可见；发给其他玩家时 hand=[] 只保留 hand_count）
    hand: List[Card] = Field(default_factory=list)
    hand_count: int = 0  # 冗余，便于 UI

    # 上供阶段选中的牌
    tribute_selected: List[str] = Field(default_factory=list)
    # 还牌阶段选中的牌（庄家 or 庄家对家）
    return_cards_selected: List[str] = Field(default_factory=list)
    # 是否点了「不要进牌」
    decline: bool = False

    # 是否 AI
    is_ai: bool = False

    def sync_hand_count(self) -> None:
        self.hand_count = len(self.hand)


# ============ Trick（一轮出牌）============

class Trick(BaseModel):
    leader: int
    cards_played: Dict[int, List[Card]] = Field(default_factory=dict)  # seat -> 牌list
    played_order: List[int] = Field(default_factory=list)
    lead_suit: Optional[Suit] = None  # 领出花色（副牌时）；主牌领出/全主甩 则 None
    is_all_trump: bool = False  # 领出的牌是否全主
    winner_seat: Optional[int] = None
    winner_is_trump_win: bool = False  # 赢家赢的牌是不是全主（抠底判定用）
    trick_score: int = 0


# ============ 结算结果（传给 prev_result，下一局继承）============

class RoundResult(BaseModel):
    round_number: int
    defender_team: Team  # 本局副家队伍
    defender_score: int
    bottom_score: int
    bottom_captured: bool
    tribute_count: int  # 下一局上供张数
    change_banker: bool  # 下一局是否换庄
    new_banker_seat: int  # 下一局庄家座位
    tribute_giver_seat: int  # 下一局上供者座位
    winner_team: Optional[Team] = None  # 娱乐性，谁赢了（副家得分<35 庄家赢，否则副家赢）


# ============ GameState ============

class GameState(BaseModel):
    model_config = ConfigDict(extra="ignore")

    room_id: str
    phase: GamePhase = "waiting"
    round_number: int = 1

    # ---- 玩家 ----
    players: Dict[int, Player] = Field(default_factory=dict)  # seat(0-3) -> Player

    # ---- 牌堆 ----
    deck: List[Card] = Field(default_factory=list)         # 未摸牌堆
    bottom_cards: List[Card] = Field(default_factory=list)  # 底牌 6 张（扣底后）
    bottom_flipped: List[Card] = Field(default_factory=list)  # 翻底过程中已翻开的
    bottom_score: int = 0
    bottom_visible_to: List[int] = Field(default_factory=list)  # 扣底后只有庄家能看牌面
    reveal_flip_index: int = 0  # reveal_bottom 阶段已翻到第几张

    # ---- 主牌 ----
    trump_suit: Optional[Suit] = None
    trump_rank: Optional[str] = None   # 定主的那张牌的 rank（2/K/A/...）；办二=2，翻底=翻到的2/缺门主时=None
    declared_by: Optional[int] = None  # 办二/翻底者座位
    declare_method: DeclareMethod = "none"

    # ---- 上供 ----
    tribute_count: int = 0  # 本地上供张数（来自上局结果；第一局为 0）
    tribute_giver: Optional[int] = None  # 上供者座位
    tribute_giver_partner: Optional[int] = None  # = teammate(tribute_giver)，即「分配者」
    tribute_cards: List[Card] = Field(default_factory=list)
    # card_id -> 接收者 seat（只能是 banker_seat 或 banker_partner_seat）
    tribute_distribution: Dict[str, int] = Field(default_factory=dict)
    cards_to_banker: List[Card] = Field(default_factory=list)
    cards_to_banker_partner: List[Card] = Field(default_factory=list)
    # 还牌（庄家 & 庄家对家 → 还给上供者）
    return_from_banker: List[Card] = Field(default_factory=list)
    return_from_banker_partner: List[Card] = Field(default_factory=list)
    banker_decline: bool = False
    banker_partner_decline: bool = False

    # ---- 出牌阶段 ----
    current_seat: int = 0  # 当前该谁操作
    current_trick: Optional[Trick] = None
    tricks_history: List[Trick] = Field(default_factory=list)
    defender_team: Optional[Team] = None  # 本局副家队伍 = banker 队伍的对面
    defender_total_score: int = 0
    last_trick_is_trump_win: bool = False
    bottom_captured: bool = False

    # ---- 上局结果（第一局 None）----
    prev_result: Optional[RoundResult] = None

    # ---- 系统 ----
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message_log: List[dict] = Field(default_factory=list)  # {ts, text, level, seat?}

    # ---- 当前操作用的提示（UI 展示）----
    prompt_for_seat: Dict[int, str] = Field(default_factory=dict)

    # ---- settlement 准备阶段 ----
    ready_seats: List[int] = Field(default_factory=list)
    settlement_started_at: float = 0.0

    # ========== 便捷属性（使用 computed_field 以便 model_dump 序列化，修复 StatusBar 庄家 PNaN ==========

    @computed_field  # type: ignore[prop-decorator]
    @property
    def banker_seat(self) -> Optional[int]:
        for s, p in self.players.items():
            if p.is_banker:
                return s
        return None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def banker_partner_seat(self) -> Optional[int]:
        bs = self.banker_seat
        return teammate_seat(bs) if bs is not None else None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def banker_team(self) -> Optional[Team]:
        bs = self.banker_seat
        return seat_team(bs) if bs is not None else None

    def touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc)

    def log(self, text: str, level: Literal["info", "warn", "success"] = "info",
            seat: Optional[int] = None) -> None:
        self.message_log.append({
            "ts": datetime.now(timezone.utc).isoformat(),
            "text": text,
            "level": level,
            "seat": seat,
        })
        if len(self.message_log) > 200:
            self.message_log = self.message_log[-200:]


# ============ WebSocket 消息 ============

class WSMessageIn(BaseModel):
    type: WSMessageTypeClient
    payload: dict = Field(default_factory=dict)
    player_id: Optional[str] = None
    timestamp: Optional[int] = None


class WSMessageOut(BaseModel):
    type: WSMessageTypeServer
    payload: dict = Field(default_factory=dict)
    timestamp: int = Field(default_factory=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))


# ============ HTTP 请求 / 响应 ============

class CreateRoomReq(BaseModel):
    player_name: str = "玩家1"
    with_ai_count: int = Field(0, ge=0, le=3)  # 立即创建并加入 AI 玩家数量
    ai_names: List[str] = Field(default_factory=lambda: ["AI-左", "AI-对", "AI-右"])


class CreateRoomResp(BaseModel):
    room_id: str
    player_id: str
    seat: int


class JoinRoomReq(BaseModel):
    room_id: str
    player_name: str = "玩家"


class JoinRoomResp(BaseModel):
    ok: bool
    room_id: str
    player_id: Optional[str] = None
    seat: Optional[int] = None
    error: Optional[str] = None


class RoomBrief(BaseModel):
    room_id: str
    player_count: int
    phase: GamePhase
