import React, { useMemo } from "react";
import PlayingCard from "./PlayingCard";

/**
 * 当前出牌区（4 边绝对定位，按 viewer_seat 旋转）：
 *   display_position: 0=BOTTOM（我）, 1=RIGHT（上家）, 2=TOP（对家）, 3=LEFT（下家）
 *   数学：display_position(seat, viewer) = (seat - viewer + 4) % 4
 * 仅显示扑克牌，不显示任何文字标签。
 */
export default function PlayArea({ state, viewerSeat }) {
  if (!state) return null;

  const currentTrick = state.current_trick || { cards_played: {}, play_order: [] };
  const hasCurrent = Object.values(currentTrick.cards_played || {}).some(v => Array.isArray(v) && v.length > 0);
  const history = state.tricks_history || [];
  const lastTrick = !hasCurrent && history.length > 0 ? history[history.length - 1] : null;
  const isLastMode = !!lastTrick;

  const trick = isLastMode ? lastTrick : currentTrick;
  const cardsBySeat = (trick && trick.cards_played) || {};

  const positions = useMemo(() => [
    { dp: 0, outer: "bottom-2 left-1/2 -translate-x-1/2", inner: "items-center justify-end",    side: "BOTTOM" },
    { dp: 1, outer: "right-2 top-1/2 -translate-y-1/2",   inner: "items-end justify-center",    side: "RIGHT" },
    { dp: 2, outer: "top-2 left-1/2 -translate-x-1/2",    inner: "items-center justify-start",  side: "TOP" },
    { dp: 3, outer: "left-2 top-1/2 -translate-y-1/2",    inner: "items-start justify-center",  side: "LEFT" },
  ], []);

  const vs = viewerSeat != null ? viewerSeat : -1;
  const seatOfDp = (dp) => (dp + vs) % 4;

  return (
    <div className={`panel p-3 md:p-4 relative min-h-[260px] md:min-h-[320px] ${isLastMode ? "opacity-70" : ""}`}>
      {positions.map(({ dp, outer, inner, side }) => {
        const seat = seatOfDp(dp);
        const cards = cardsBySeat[seat] || [];
        const vertical = side === "LEFT" || side === "RIGHT";
        return (
          <div key={dp} className={`absolute ${outer} p-1`}>
            <div className={`flex flex-col gap-1 ${inner} ${vertical ? "max-w-[30%]" : "max-w-[56%]"}`}>
              <div className={`flex gap-1.5 flex-wrap ${side === "LEFT" ? "flex-row-reverse" : ""}`}>
                {cards.map((c, i) => (
                  <PlayingCard key={i} card={c} trumpSuit={state.trump_suit} size="sm" />
                ))}
                {!cards.length && (
                  <div className="h-[72px] w-[52px] rounded-xl border-2 border-dashed border-white/15 shrink-0" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
