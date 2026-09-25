import React from "react";
import PlayingCard from "./PlayingCard";
import { cn, cardScore, SUIT_SYMBOL } from "@/utils/cardUtils";
import { Trophy, User, Users } from "lucide-react";
import PHASE_ZH from "@/config/phases";

/**
 * 状态栏：轮次、阶段、当前主花色、庄家信息、分数、上供张数、当前出牌人
 */
export default function StatusBar({ state, viewerSeat, myTurn }) {
  if (!state) return null;
  const phase = PHASE_ZH[state.phase] || state.phase;
  const round = state.round_number || 1;
  const defScore = state.defender_total_score || 0;
  const defCap = 100;
  const banker = state.players?.find(p => p.seat === state.banker_seat);
  const partner = state.players?.find(p => p.seat === state.banker_partner_seat);
  const bankerTeam = (state.banker_seat !== undefined && (state.banker_seat === 0 || state.banker_seat === 2)) ? "A" : "B";
  const defTeam = state.defender_team || (bankerTeam === "A" ? "B" : "A");
  const tribute = state.prev_result?.tribute_count ?? state.tribute_count ?? 0;
  const currentSeat = state.current_seat;
  const tr = state.trump_suit ? (SUIT_SYMBOL[state.trump_suit] + " " + (state.trump_suit === "heart" ? "红桃" : state.trump_suit === "spade" ? "黑桃" : state.trump_suit === "club" ? "梅花" : state.trump_suit === "diamond" ? "方块" : "")) : "未定主";
  const bottomScore = state.bottom_score || 0;
  return (
    <div className="panel px-3 md:px-4 py-2.5 flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
      <span className={cn("chip", myTurn ? "bg-poker-gold text-black animate-pulseGlow" : "bg-white/10 text-white")}>
        第 {round} 轮 · {phase}
      </span>
      <span className="chip bg-poker-gold/20 text-poker-gold">
        主：{tr}
      </span>
      <span className="chip bg-emerald-700/60 text-emerald-100">
        <User className="w-3 h-3 mr-1" />庄家：{banker?.name || "-"}(P{state.banker_seat + 1})
      </span>
      <span className="chip bg-emerald-700/40 text-emerald-100/90">
        <Users className="w-3 h-3 mr-1" />对家：{partner?.name || "-"}(P{state.banker_partner_seat + 1})
      </span>
      <span className="chip bg-white/10 text-white">庄家 {bankerTeam}</span>
      <span className={cn(
        "chip",
        defScore >= 35 ? "bg-rose-600/70 text-white" : "bg-rose-500/20 text-rose-200",
      )}>
        <Trophy className="w-3 h-3 mr-1" />
        副家 {defTeam}：{defScore}/{defCap}{bottomScore ? ` 底分 ${bottomScore}` : ""}
      </span>
      {state.phase === "settlement" && (
        <span className="chip bg-amber-500/20 text-amber-200">
          下轮上供 {tribute} 张{tribute ? `，庄：P${((state.prev_result?.new_banker_seat ?? state.banker_seat) ?? 0) + 1}` : ""}
        </span>
      )}
      {!["settlement", "waiting", "reveal_bottom"].includes(state.phase) && (
        <span className={cn(
          "chip ml-auto",
          currentSeat === viewerSeat ? "bg-poker-gold text-black" : "bg-white/5 text-white/70"
        )}>
          当前出牌：{state.players?.find(p => p.seat === currentSeat)?.name || "-"}(P{currentSeat + 1})
        </span>
      )}
    </div>
  );
}


