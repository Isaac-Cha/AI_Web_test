import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameSocket } from "@/hooks/useGameSocket";
import { toast } from "sonner";
import { getPlayerMap, savePlayerMap, isScore, cardScore } from "@/utils/cardUtils";
import { http } from "@/lib/api";
import { Home } from "lucide-react";

import StatusBar from "@/components/StatusBar";
import DeckArea from "@/components/DeckArea";
import TributeArea from "@/components/TributeArea";
import PlayArea from "@/components/PlayArea";
import HandCards from "@/components/HandCards";
import OpponentHandStack from "@/components/OpponentHandStack";
import ActionButtons from "@/components/ActionButtons";
import ResultModal from "@/components/ResultModal";
import PlayingCard from "@/components/PlayingCard";

// 物理 seat(0-3) -> 显示位置 dp(0=BOTTOM我 / 1=RIGHT上家 / 2=TOP对家 / 3=LEFT下家)
// 公式：dp(seat, viewer) = (seat - viewer + 4) % 4
const seatToDp = (seat, viewer) => (seat - viewer + 4) % 4;

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
    if (nextState && nextState.phase === "settlement" &&
        (!state || state.phase !== "settlement")) {
      setShowResult(true);
    }
    if (state && nextState && nextState.tricks_history?.length > state.tricks_history?.length) {
      const last = nextState.tricks_history[nextState.tricks_history.length - 1];
      if (last?.winner_seat != null) setLastWinnerSeat(last.winner_seat);
    }
    setState(nextState);
    if (vs != null && viewerSeat == null) setViewerSeat(vs);
  }, [state, viewerSeat]);

  const clearSelected = useCallback(() => setSelectedIds([]), []);

  const { actions: rawActions, readyState } = useGameSocket({
    roomId, playerId, onState,
    onError: () => {},
    onOpen: () => {},
  });

  // 动作包装层：按钮点击后立即清空选中（乐观），保留原动作调用
  const actions = useMemo(() => {
    const wrap = (fn, shouldClear = true) => (...args) => {
      const ret = fn(...args);
      if (shouldClear) clearSelected();
      return ret;
    };
    return {
      ...rawActions,
      playCards: wrap(rawActions.playCards),
      discardBottom: wrap(rawActions.discardBottom),
      declareBan2: wrap(rawActions.declareBan2),
      selectTribute: wrap(rawActions.selectTribute),
      selectReturn: wrap(rawActions.selectReturn),
      distributeTribute: (payload) => {
        const ret = rawActions.distributeTribute(payload);
        clearSelected();
        return ret;
      },
      declineCards: wrap(rawActions.declineCards, false),
      nextRound: wrap(rawActions.nextRound, false),
      drawCard: wrap(rawActions.drawCard, false),
      flipBottom: wrap(rawActions.flipBottom, false),
      revealNext: wrap(rawActions.revealNext, false),
      start: wrap(rawActions.start, false),
    };
  }, [rawActions, clearSelected]);

  const me = state?.players?.find(p => p.seat === viewerSeat);
  const myHand = me?.hand || [];

  // 阶段/轮次变化仍清空（双保险）
  useEffect(() => {
    clearSelected();
    setLastDistributePick(null);
  }, [state?.phase, state?.round_number, clearSelected]);

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

  const seatMeta = useMemo(() => {
    return [0, 1, 2, 3].map(s => {
      const p = state?.players?.find(x => x.seat === s);
      const isMe = s === viewerSeat;
      return {
        seat: s,
        dp: viewerSeat == null ? null : seatToDp(s, viewerSeat),
        player: p,
        isMe,
        name: p?.name || `P${s+1}空座`,
        team: p?.team || "-",
        ai: !!p?.is_ai,
        dc: !!p?.disconnected,
        banker: s === state?.banker_seat,
        partner: s === state?.banker_partner_seat,
        count: p?.hand_count || (p?.hand ? p.hand.length : 0),
      };
    });
  }, [state, viewerSeat]);

  // 按显示位置 dp 分组
  const byDp = useMemo(() => {
    const out = [null, null, null, null];
    for (const m of seatMeta) if (m.dp != null) out[m.dp] = m;
    return out;
  }, [seatMeta]);

  const myTurn = state?.current_seat === viewerSeat &&
    state?.phase !== "settlement" &&
    !state?.players?.find(p => p.seat === viewerSeat)?.is_ai;

  // 办二展示：庄家座位且声明了 trump_rank="2"（办二）
  const bankerSeat = state?.banker_seat;
  const showBanerCard = useMemo(() => {
    if (bankerSeat == null) return null;
    if (state?.declare_method !== "ban2") return null;
    if (!state?.trump_suit) return null;
    return { rank: state.trump_rank ?? "2", suit: state.trump_suit };
  }, [bankerSeat, state?.declare_method, state?.trump_rank, state?.trump_suit]);

  // 本方已累计得分牌（本方队赢的所有 trick 中 5/10/K）
  const myTeamCapturedScoreCards = useMemo(() => {
    if (!state || viewerSeat == null) return [];
    const viewerTeam = (viewerSeat === 0 || viewerSeat === 2) ? "A" : "B";
    const out = [];
    for (const t of state.tricks_history || []) {
      const ws = t.winner_seat;
      if (ws == null) continue;
      const winnerTeam = (ws === 0 || ws === 2) ? "A" : "B";
      if (winnerTeam !== viewerTeam) continue;
      for (const c of Object.values(t.cards_played || {})) {
        if (!Array.isArray(c)) continue;
        for (const cc of c) if (isScore(cc)) out.push(cc);
      }
    }
    return out;
  }, [state, viewerSeat]);

  const wsReadyBadge = readyState === 1 ? "✅" : readyState === 0 ? "连接中" : "❌";

  return (
    <div className="p-2 md:p-4 landscape:max-[900px]:p-1 flex flex-col gap-2 md:gap-3 max-w-[1500px] mx-auto text-white">
      <div className="flex items-stretch gap-2">
        <button
          className="btn btn-ghost !py-2 whitespace-nowrap"
          onClick={() => nav("/")}
        >
          <Home className="w-4 h-4"/> 大厅
        </button>
        <div className="flex-1">
          <StatusBar state={state} viewerSeat={viewerSeat} myTurn={myTurn}/>
        </div>
        <div className="chip bg-white/10 text-white whitespace-nowrap">
          房间 {roomId} · WebSocket {wsReadyBadge}
        </div>
      </div>

      {/* TOP（对家 dp=2） */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">
        <div className="col-span-12 md:col-start-4 md:col-span-6 flex justify-center">
          <OpponentPanel meta={byDp[2]} trump={state?.trump_suit}
                         isBanker={bankerSeat != null && byDp[2]?.seat === bankerSeat}
                         banerCard={bankerSeat != null && byDp[2]?.seat === bankerSeat ? showBanerCard : null}
                         side="top" partner />
        </div>
      </div>

      {/* LEFT（下家 dp=3） + CENTER PlayArea/Deck/Tribute + RIGHT（上家 dp=1） */}
      <div className="grid grid-cols-12 gap-2 md:gap-3 min-h-[260px] md:min-h-[320px]">
        <div className="col-span-6 md:col-span-3 md:block hidden">
          <OpponentPanel meta={byDp[3]} trump={state?.trump_suit} side="left"
                         isBanker={bankerSeat != null && byDp[3]?.seat === bankerSeat}
                         banerCard={bankerSeat != null && byDp[3]?.seat === bankerSeat ? showBanerCard : null} />
        </div>
        <div className="col-span-12 md:col-span-6 flex flex-col gap-2 md:gap-3">
          {/* 移动端：上/下家一行两个 */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <OpponentPanel meta={byDp[3]} trump={state?.trump_suit} side="left" compact
                           isBanker={bankerSeat != null && byDp[3]?.seat === bankerSeat}
                           banerCard={bankerSeat != null && byDp[3]?.seat === bankerSeat ? showBanerCard : null} />
            <OpponentPanel meta={byDp[1]} trump={state?.trump_suit} side="right" compact
                           isBanker={bankerSeat != null && byDp[1]?.seat === bankerSeat}
                           banerCard={bankerSeat != null && byDp[1]?.seat === bankerSeat ? showBanerCard : null} />
          </div>

          <PlayArea state={state} viewerSeat={viewerSeat} />

          {state?.phase === "tribute_select" ||
           state?.phase === "tribute_distribute" ||
           state?.phase === "tribute_return" ? (
            <TributeArea
              state={state}
              viewerSeat={viewerSeat}
              viewerHand={myHand}
              selectedIds={selectedIds}
              onToggle={toggleCard}
            />
          ) : (
            <DeckArea
              state={state}
              viewerSeat={viewerSeat}
              capturedScoreCards={myTeamCapturedScoreCards}
            />
          )}
        </div>
        <div className="col-span-6 md:col-span-3 md:block hidden">
          <OpponentPanel meta={byDp[1]} trump={state?.trump_suit} side="right"
                         isBanker={bankerSeat != null && byDp[1]?.seat === bankerSeat}
                         banerCard={bankerSeat != null && byDp[1]?.seat === bankerSeat ? showBanerCard : null} />
        </div>
      </div>

      {/* BOTTOM（我 dp=0） */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">
        <div className="col-span-12 flex flex-col gap-2 md:gap-3">
          {byDp[0] && byDp[0].seat === bankerSeat && (
            <div className="panel p-2 md:p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip bg-poker-gold text-black">P{bankerSeat + 1}（我）· 庄</span>
                {showBanerCard && (
                  <div className="flex items-center gap-2">
                    <span className="chip bg-emerald-500/25 text-emerald-100 whitespace-nowrap">办二</span>
                    <PlayingCard
                      card={{ id: "baner-display", rank: showBanerCard.rank, suit: showBanerCard.suit, is_joker: false }}
                      trumpSuit={state?.trump_suit}
                      size="sm"
                      faceDown={false}
                      title="办二声明牌"
                    />
                  </div>
                )}
              </div>
              <div className="w-32 md:w-48 h-1" />
            </div>
          )}
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

function OpponentPanel({ meta, trump, side = "top", compact = false, isBanker = false, banerCard = null, partner = false }) {
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
    <div className="panel p-2 md:p-3 w-full">
      <div className={"flex gap-2 md:gap-3 " + (banerCard ? "justify-between items-stretch" : "justify-between items-center flex-wrap")}>
        <div className="flex-1 min-w-0">
          <OpponentHandStack
            count={meta.count}
            trumpSuit={trump}
            label={label}
            subLabel={`${meta.name}${meta.ai ? " 🤖" : ""}`}
            horizontal={side !== "top" || partner}
            compact={compact}
            partner={partner}
          />
        </div>
        {banerCard && (
          <div className="flex flex-col gap-1 shrink-0 items-center justify-start pt-1 md:pt-0 md:justify-center min-w-[4rem]">
            <span className="chip bg-emerald-500/25 text-emerald-100 whitespace-nowrap w-max">办二</span>
            <PlayingCard
              card={{ id: "baner-op-" + meta.seat, rank: banerCard.rank, suit: banerCard.suit, is_joker: false }}
              trumpSuit={trump}
              size="sm"
              faceDown={false}
              title="办二声明牌"
            />
          </div>
        )}
        {isBanker && !banerCard && (
          <span className="chip bg-poker-gold/90 text-black whitespace-nowrap shrink-0">庄家</span>
        )}
      </div>
    </div>
  );
}
