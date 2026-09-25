import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameSocket } from "@/hooks/useGameSocket";
import { toast } from "sonner";
import { getPlayerMap, savePlayerMap, isScore } from "@/utils/cardUtils";
import { http } from "@/lib/api";
import { Home } from "lucide-react";

import TopInfoBar from "@/components/TopInfoBar";
import PokerTable from "@/components/PokerTable";
import ResultModal from "@/components/ResultModal";

export default function GameRoom() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const [viewerSeat, setViewerSeat] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [state, setState] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lastDistributePick, setLastDistributePick] = useState(null);
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
        const name = localStorage.getItem("show-thumb:name") || ("游客" + Math.floor(Math.random() * 900 + 100));
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
    setState(nextState);
    if (vs != null && viewerSeat == null) setViewerSeat(vs);
  }, [state, viewerSeat]);

  const clearSelected = useCallback(() => setSelectedIds([]), []);

  const { actions: rawActions, readyState } = useGameSocket({
    roomId, playerId, onState,
    onError: () => {},
    onOpen: () => {},
  });

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
      ready: wrap(rawActions.ready, false),
      nextRound: wrap(rawActions.nextRound, false),
      drawCard: wrap(rawActions.drawCard, false),
      flipBottom: wrap(rawActions.flipBottom, false),
      revealNext: wrap(rawActions.revealNext, false),
      start: wrap(rawActions.start, false),
    };
  }, [rawActions, clearSelected]);

  const me = state?.players?.find(p => p.seat === viewerSeat);
  const myHand = me?.hand || [];

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

  const myTurn = state?.current_seat === viewerSeat &&
    state?.phase !== "settlement" &&
    !state?.players?.find(p => p.seat === viewerSeat)?.is_ai;

  const wsReadyBadge = readyState === 1 ? "✅" : readyState === 0 ? "连接中" : "❌";

  return (
    <div className="min-h-screen w-full text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[1500px] mx-auto p-2 md:p-3 flex flex-col gap-2 md:gap-3">
        {/* 顶栏：大厅 / 综合信息条 / 房间号（一行） */}
        <header className="flex items-stretch gap-2">
          <button
            className="btn btn-ghost !py-2 whitespace-nowrap shrink-0"
            onClick={() => nav("/")}
          >
            <Home className="w-4 h-4" /> 大厅
          </button>
          <div className="flex-1 min-w-0">
            <TopInfoBar state={state} viewerSeat={viewerSeat} myTurn={myTurn} />
          </div>
          <div className="chip bg-white/10 text-white whitespace-nowrap shrink-0 text-xs md:text-sm">
            房间 {roomId} · WS {wsReadyBadge}
          </div>
        </header>

        {/* 牌桌：所有牌局相关内容在此内 */}
        <main className="flex-1">
          <PokerTable
            state={state}
            viewerSeat={viewerSeat}
            myHand={myHand}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            actions={actions}
            lastDistributePick={lastDistributePick}
            setLastDistributePick={setLastDistributePick}
            capturedScoreCards={myTeamCapturedScoreCards}
            onToggle={toggleCard}
          />
        </main>
      </div>

      <ResultModal
        state={state}
        onNext={() => {
          setShowResult(false);
          actions.ready();
        }}
        onClose={() => setShowResult(false)}
      />
    </div>
  );
}
