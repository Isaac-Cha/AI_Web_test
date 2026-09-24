import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameSocket } from "@/hooks/useGameSocket";
import { toast } from "sonner";
import { getPlayerMap, savePlayerMap } from "@/utils/cardUtils";
import { http } from "@/lib/api";
import { Link, Home, Users } from "lucide-react";

import StatusBar from "@/components/StatusBar";
import DeckArea from "@/components/DeckArea";
import TributeArea from "@/components/TributeArea";
import PlayArea from "@/components/PlayArea";
import HandCards from "@/components/HandCards";
import OpponentHandStack from "@/components/OpponentHandStack";
import ActionButtons from "@/components/ActionButtons";
import ResultModal from "@/components/ResultModal";

/**
 * 4 人 2×2 游戏房间容器（布局与设计文档 7.1 对齐）
 * 屏幕四角落：
 *   左上 P1（seat0）/ 右上 P2（seat1）
 *   左下 P4（seat3）/ 右下 P3（seat2）
 *  底部放「自己的手牌+操作按钮」，其余三个对手放 OpponentHandStack
 * viewerSeat 决定「我是谁」
 */
export default function GameRoom() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const [viewerSeat, setViewerSeat] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [state, setState] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lastDistributePick, setLastDistributePick] = useState(null);
  const [lastWinnerSeat, setLastWinnerSeat] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // 1) 从本地缓存拿 playerId；如果没有，就用 HTTP /room/join 静默加入（匿名玩家 AI 名）
  useEffect(() => {
    let alive = true;
    const cached = getPlayerMap(roomId);
    if (cached) {
      setPlayerId(cached.playerId ?? cached.player_id);
      setViewerSeat(cached.seat);
      return;
    }
    (async () => {
      try {
        const name = localStorage.getItem("show-thumb:name") || ("游客" + Math.floor(Math.random()*900+100));
        const { data } = await http.post("/room/join", { room_id: roomId, player_name: name });
        if (!alive) return;
        savePlayerMap(roomId, data.seat, data.player_id, name);
        setPlayerId(data.player_id);
        setViewerSeat(data.seat);
        toast.success(`自动加入房间：P${data.seat + 1}`);
      } catch (e) {
        if (!alive) return;
        toast.error(e?.response?.data?.detail || e?.response?.data?.error || "加入失败，请返回大厅");
      }
    })();
    return () => { alive = false; };
  }, [roomId]);

  const onState = useCallback((nextState, vs) => {
    // 检测到 settlement 就弹出结果面板
    if (nextState && nextState.phase === "settlement" &&
        (!state || state.phase !== "settlement")) {
      setShowResult(true);
    }
    // 记录 lastWinner：如果 tricks_history 比之前长，赢家就是最后一个 trick 的 winner_seat
    if (state && nextState && nextState.tricks_history?.length > state.tricks_history?.length) {
      const last = nextState.tricks_history[nextState.tricks_history.length - 1];
      if (last?.winner_seat != null) setLastWinnerSeat(last.winner_seat);
    }
    setState(nextState);
    if (vs != null && viewerSeat == null) setViewerSeat(vs);
  }, [state, viewerSeat]);

  const { actions, readyState } = useGameSocket({
    roomId, playerId, onState,
    onError: () => {},
    onOpen: () => {},
  });

  // 自己（viewerSeat）的手牌
  const me = state?.players?.find(p => p.seat === viewerSeat);
  const myHand = me?.hand || [];

  // 切换扣底阶段 / 选牌等阶段时清空选择
  useEffect(() => {
    setSelectedIds([]);
    setLastDistributePick(null);
  }, [state?.phase, state?.round_number]);

  const toggleCard = useCallback((id, ctx = "hand") => {
    if (ctx === "distribute-pick") {
      setLastDistributePick(id === lastDistributePick ? null : id);
      return;
    }
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  }, [lastDistributePick]);

  // 布局：把「我」放到屏幕底部；三个对手分别在顶部左右 + 侧
  // 布局模式根据我的座位自动旋转（视觉：我永远在屏幕正下方），但实际座位角标 P1-P4 仍按物理 seat
  const seatMeta = useMemo(() => {
    return [0, 1, 2, 3].map(s => {
      const p = state?.players?.find(x => x.seat === s);
      const isMe = s === viewerSeat;
      return { seat: s, player: p, isMe, name: p?.name || `P${s+1}空座`,
        team: p?.team || "-", ai: !!p?.is_ai, dc: !!p?.disconnected,
        banker: s === state?.banker_seat, partner: s === state?.banker_partner_seat,
        count: p?.hand_count || (p?.hand ? p.hand.length : 0),
      };
    });
  }, [state, viewerSeat]);

  // 物理座位 → 屏幕位置：
  //   s0 左上, s1 右上, s3 左下, s2 右下
  // 但我们想让我的位置在「底部中间手牌区」，所以三对手放顶部两格 + 侧面
  const oppSeats = seatMeta.filter(s => !s.isMe);
  const myMeta = seatMeta.find(s => s.isMe);

  // 我的回合？
  const myTurn = state?.current_seat === viewerSeat && state?.phase !== "settlement" && !state?.players?.find(p => p.seat === viewerSeat)?.is_ai;

  return (
    <div className="min-h-screen w-full p-2 md:p-4 flex flex-col gap-2 md:gap-3 max-w-[1500px] mx-auto">
      {/* 顶部：状态栏 + 返回大厅 */}
      <div className="flex items-stretch gap-2">
        <Link to="/" className="btn btn-ghost !py-2 whitespace-nowrap">
          <Home className="w-4 h-4"/> 大厅
        </Link>
        <div className="flex-1">
          <StatusBar state={state} viewerSeat={viewerSeat} myTurn={myTurn}/>
        </div>
        <div className="chip bg-white/10 text-white whitespace-nowrap">
          房间 {roomId} · WebSocket {readyState === 1 ? "✅" : (readyState === 0 ? "连接中" : "❌")}
        </div>
      </div>

      {/* 3×3 主体区域：
          [TopLeft P?]   [中间状态/PlayArea]   [TopRight P?]
          [SideLeft P?]  [PlayArea 居中]       [SideRight P?]
          [ 底部：自己手牌+操作按钮（全屏宽） ]
      */}
      <div className="flex-1 grid grid-cols-12 gap-2 md:gap-3 min-h-[640px]">
        {/* 左上对手（opp0） */}
        <div className="col-span-12 md:col-span-3">
          <OpponentPanel meta={oppSeats[0]} trump={state?.trump_suit}/>
        </div>
        {/* 中间主区：3 行 状态栏/PlayArea/DeckOrTribute */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-2 md:gap-3">
          <div className="grid grid-cols-2 gap-2 md:gap-3 md:hidden">
            <OpponentPanel meta={oppSeats[1]} trump={state?.trump_suit}/>
            <OpponentPanel meta={oppSeats[2]} trump={state?.trump_suit}/>
          </div>
          <PlayArea state={state} viewerSeat={viewerSeat} lastWinnerSeat={lastWinnerSeat} />
          {state?.phase === "tribute_select" || state?.phase === "tribute_distribute" || state?.phase === "tribute_return" ? (
            <TributeArea
              state={state}
              viewerSeat={viewerSeat}
              viewerHand={myHand}
              selectedIds={selectedIds}
              onToggle={toggleCard}
            />
          ) : (
            <DeckArea state={state}/>
          )}
        </div>
        {/* 右上对手（opp1） */}
        <div className="col-span-6 md:col-span-3">
          <OpponentPanel meta={oppSeats[1]} trump={state?.trump_suit}/>
        </div>
        {/* 左下对手（opp2，仅 md 可见；移动端已显示上面） */}
        <div className="hidden md:block md:col-span-3">
          <OpponentPanel meta={oppSeats[2]} trump={state?.trump_suit}/>
        </div>
        {/* 自己的手牌区（宽 9） */}
        <div className="col-span-12 md:col-span-9 flex flex-col gap-2 md:gap-3">
          <ActionButtons
            state={state}
            viewerSeat={viewerSeat}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            viewerHand={myHand}
            actions={actions}
            setLastDistributePick={setLastDistributePick}
            lastDistributePick={lastDistributePick}
          />
          <HandCards
            cards={myHand}
            trumpSuit={state?.trump_suit}
            selectedIds={selectedIds}
            onToggle={toggleCard}
            selectedLimitHint={
              state?.phase === "discard_bottom" ? "需 6 张扣底" :
              state?.phase === "tribute_select" ? `需 ${state?.tribute_count || 0} 张最大主非分` :
              state?.phase === "tribute_return" && (state.banker_seat === viewerSeat || state.banker_partner_seat === viewerSeat)
                ? `需 ${state?.tribute_count || 0} 张还牌` :
              state?.phase === "playing" ? "出牌（可单张 / 甩多张三张同等级 / 跟牌）" : ""
            }
          />
        </div>
      </div>

      <ResultModal
        state={state}
        onNext={() => { setShowResult(false); actions.nextRound(); }}
        onClose={() => setShowResult(false)}
      />
    </div>
  );
}

function OpponentPanel({ meta, trump }) {
  if (!meta) return null;
  const label =
    "P" + (meta.seat + 1) +
    (meta.banker ? " 庄" : "") +
    (meta.partner ? " 对家" : "") +
    (meta.team ? " · " + meta.team : "") +
    (meta.ai ? " · AI" : "");
  const sub =
    (meta.count != null ? `手牌 ${meta.count}` : "") +
    (meta.dc ? " · 离线" : meta.ai ? "" : " · 在线");
  return (
    <OpponentHandStack
      count={meta.count}
      trumpSuit={trump}
      label={label}
      subLabel={`${meta.name}${meta.ai ? " 🤖" : ""}`}
    />
  );
}
