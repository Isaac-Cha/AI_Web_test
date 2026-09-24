import React, { useMemo } from "react";
import PlayingCard from "./PlayingCard";
import { cardScore, SUIT_SYMBOL } from "@/utils/cardUtils";

/**
 * 当前出牌区（2×2 按 seat 布局）：
 *   seat0=左上, seat1=右上, seat2=右下, seat3=左下 （对应文档 12 章）
 *   current_trick.play_order 表示出牌顺序（第 1 位是领出者，标 LEAD）
 *   win 上一轮赢家小角标
 */
export default function PlayArea({ state, viewerSeat, lastWinnerSeat }) {
  if (!state) return null;
  const trick = state.current_trick || { cards_played: {}, play_order: [] };
  const lead = trick.play_order?.[0];
  const cardsBySeat = trick.cards_played || {};

  // 本轮已出分数（实时累计，给玩家参考）
  const roundScore = Object.values(cardsBySeat).reduce(
    (s, list) => s + list.reduce((a, c) => a + cardScore(c), 0), 0
  );
  // 四角落布局，Pn 与座位对齐
  const positions = [
    { seat: 0, cls: "row-start-1 col-start-1 items-start justify-start" },
    { seat: 1, cls: "row-start-1 col-start-2 items-start justify-end" },
    { seat: 3, cls: "row-start-2 col-start-1 items-end justify-start" },
    { seat: 2, cls: "row-start-2 col-start-2 items-end justify-end" },
  ];
  const mySeat = viewerSeat;

  return (
    <div className="panel p-3 md:p-4 relative min-h-[260px] md:min-h-[320px]">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2">
        {positions.map(({ seat, cls }) => {
          const player = state.players?.find(p => p.seat === seat);
          const cards = cardsBySeat[seat] || [];
          const isLead = seat === lead;
          const isLastWinner = lastWinnerSeat === seat;
          const isMe = seat === mySeat;
          return (
            <div key={seat} className={`flex ${cls} relative`}>
              <div className="flex flex-col gap-1 max-w-[56%]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={
                    "chip " + (isMe ? "bg-poker-gold text-black" :
                               seat === state.current_seat ? "bg-emerald-500/30 text-emerald-100" : "bg-white/10 text-white")
                  }>
                    P{seat + 1} · {player?.name || "空"} · {player?.team || ""}
                    {player?.seat === state.banker_seat ? " 庄" : ""}
                    {player?.seat === state.banker_partner_seat ? " 对家" : ""}
                  </span>
                  {isLead && <span className="chip bg-purple-500/30 text-purple-100">领出</span>}
                  {isLastWinner && <span className="chip bg-amber-500/30 text-amber-100">上轮赢</span>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {cards.map((c, i) => (
                    <PlayingCard key={i} card={c} trumpSuit={state.trump_suit} size="sm" />
                  ))}
                  {!cards.length && (
                    <div className="h-[72px] w-[52px] rounded-xl border-2 border-dashed border-white/15" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* 中心显示累计本轮得分（提示玩家是否需要甩分） */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <span className="chip bg-poker-gold text-black text-sm">本轮 {roundScore} 分</span>
        <span className="text-[11px] text-white/60">
          已出 {trick.play_order?.length || 0}/4
        </span>
      </div>
    </div>
  );
}
