import React from "react";
import { Trophy, User, Users, ArrowRightCircle } from "lucide-react";
import PHASE_ZH from "@/config/phases";
import { SUIT_SYMBOL } from "@/utils/cardUtils";

const suitName = {
  spade: "黑桃", heart: "红桃", club: "梅花", diamond: "方块", joker: "",
};

export default function TopInfoBar({ state, viewerSeat, myTurn }) {
  if (!state) return <div className="panel px-3 py-2 h-10 text-white/50 text-sm">连接中…</div>;
  const phase = PHASE_ZH[state.phase] || state.phase;
  const round = state.round_number || 1;
  const defScore = state.defender_total_score || 0;
  const banker = state.players?.find(p => p.seat === state.banker_seat);
  const partner = state.players?.find(p => p.seat === state.banker_partner_seat);
  const bankerTeam = (state.banker_seat !== undefined && (state.banker_seat === 0 || state.banker_seat === 2)) ? "A" : "B";
  const defTeam = state.defender_team || (bankerTeam === "A" ? "B" : "A");
  const currentSeat = state.current_seat;
  const tr = state.trump_suit
    ? `${SUIT_SYMBOL[state.trump_suit] || ""}${suitName[state.trump_suit] || ""}`
    : "未定主";
  const currentPlayer = state.players?.find(p => p.seat === currentSeat);

  const items = [];
  items.push(
    <span key="r" className={`chip ${myTurn ? "bg-poker-gold text-black animate-pulseGlow" : "bg-white/10 text-white"}`}>
      第 {round} 轮 · {phase}
    </span>
  );
  items.push(
    <span key="t" className="chip bg-poker-gold/20 text-poker-gold">主：{tr}</span>
  );
  if (banker) {
    items.push(
      <span key="b" className="chip bg-emerald-700/50 text-emerald-100">
        <User className="w-3 h-3 mr-1 inline" />
        庄：{banker.name}(P{state.banker_seat + 1})
      </span>
    );
  }
  if (partner) {
    items.push(
      <span key="bp" className="chip bg-emerald-700/30 text-emerald-100/90">
        <Users className="w-3 h-3 mr-1 inline" />
        对：{partner.name}(P{state.banker_partner_seat + 1})
      </span>
    );
  }
  items.push(
    <span key="d" className={`chip ${defScore >= 35 ? "bg-rose-600/70 text-white" : "bg-rose-500/20 text-rose-200"}`}>
      <Trophy className="w-3 h-3 mr-1 inline" />
      副家{defTeam}：{defScore}/100
    </span>
  );
  if (!["settlement", "waiting", "reveal_bottom"].includes(state.phase) && currentSeat != null) {
    const isMe = currentSeat === viewerSeat;
    items.push(
      <span key="cur" className={`chip ml-auto ${isMe ? "bg-poker-gold text-black" : "bg-white/5 text-white/70"}`}>
        <ArrowRightCircle className="w-3 h-3 mr-1 inline" />
        当前：{currentPlayer?.name || "-"}(P{currentSeat + 1}{isMe ? "·你" : ""})
      </span>
    );
  }
  return (
    <div className="panel px-3 md:px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs md:text-sm min-h-[44px]">
      {items}
    </div>
  );
}
