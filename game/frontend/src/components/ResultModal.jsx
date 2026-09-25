import React from "react";
import { X, Trophy, Medal, RefreshCw } from "lucide-react";
import DECK_RULES from "@/config/deck_rules";

/**
 * 结算弹窗：RoundResult + 按钮下一局
 * 所有规则文字集中在 @/config/deck_rules.js，用户可直接改
 */
export default function ResultModal({ state, onNext, onClose }) {
  if (!state || state.phase !== "settlement") return null;
  const r = state.prev_result;
  if (!r) return null;
  const winner = r.winner_team || (r.defender_score < 35 && !r.change_banker ? ((state.banker_seat === 0 || state.banker_seat === 2) ? "A" : "B") : r.defender_team);
  const loser = winner === "A" ? "B" : "A";

  const defenderSeats = state.defender_team_seats || [];
  const lastWinnerIsDefender = r.winner_team === r.defender_team;
  const capture = !!r.bottom_captured;

  // 抠底结果（来自 @/config/deck_rules.captureBottom）
  let captureNote;
  if (r.defender_score < 35 && !lastWinnerIsDefender) {
    captureNote = DECK_RULES.captureBottom.failNote_bankerWin;
  } else if (lastWinnerIsDefender && !capture) {
    captureNote = DECK_RULES.captureBottom.failNote_notTrumpWin;
  } else if (lastWinnerIsDefender && capture) {
    captureNote = DECK_RULES.captureBottom.successNote + " " + DECK_RULES.captureBottom.noDoubleNote;
  } else {
    captureNote = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="panel w-full max-w-2xl p-5 md:p-7 relative">
        <button className="absolute right-3 top-3 btn btn-ghost !px-2 !py-1" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
        <div className="text-center mb-4">
          <div className="chip bg-poker-gold text-black text-lg px-4 py-1 mb-2">
            <Trophy className="w-4 h-4 inline mr-1" /> 第 {state.round_number} 轮结算
          </div>
          <div className="text-2xl font-black">
            胜方：<span className="text-poker-gold2">队 {winner}</span> · 负方：队 {loser}
          </div>
          {captureNote && (
            <div className="text-sm text-white/80 mt-1">{captureNote}</div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <Stat label="副家得分" value={`${r.defender_score} / 100`} tone="rose" />
          <Stat label="底牌分" value={r.bottom_score} tone="amber" />
          <Stat label="总分" value={r.defender_score + r.bottom_score} tone="emerald" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <Stat label="下轮上供张数" value={`${r.tribute_count} 张`} tone="sky" />
          <Stat label="是否换庄" value={r.change_banker ? "换庄" : "连庄"} tone="violet" />
          <Stat label="下一局庄家" value={`P${r.new_banker_seat + 1}`} tone="lime" />
          <Stat label="上供者" value={`P${r.tribute_giver_seat + 1}`} tone="pink" />
        </div>

        <div className="text-xs text-white/70 mb-5 panel p-3">
          <div className="font-bold text-white/80 mb-1">
            {DECK_RULES.captureBottom.conditionZh}
          </div>
          <div className="font-bold text-white/80 mt-2 mb-1">
            {DECK_RULES.tributeTable.header}
          </div>
          <ul className="list-disc list-inside ml-1 space-y-0.5">
            {DECK_RULES.tributeTable.rows.map((row, i) => (
              <li key={i}>{row}</li>
            ))}
          </ul>
          <div className="mt-2 text-white/60">{DECK_RULES.tributeTable.finalNote}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>收起</button>
          <button className="btn btn-primary" onClick={onNext}>
            <RefreshCw className="w-4 h-4" /> 准备下一局
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const toneCls = {
    rose: "bg-rose-500/15 text-rose-200",
    amber: "bg-amber-500/15 text-amber-200",
    purple: "bg-purple-500/15 text-purple-200",
    emerald: "bg-emerald-500/15 text-emerald-200",
    sky: "bg-sky-500/15 text-sky-200",
    violet: "bg-violet-500/15 text-violet-200",
    lime: "bg-lime-500/15 text-lime-200",
    pink: "bg-pink-500/15 text-pink-200",
  }[tone] || "bg-white/10 text-white";
  return (
    <div className="panel p-3">
      <div className="text-[11px] text-white/60 mb-1">{label}</div>
      <div className={"chip inline-flex " + toneCls}>{String(value)}</div>
    </div>
  );
}
