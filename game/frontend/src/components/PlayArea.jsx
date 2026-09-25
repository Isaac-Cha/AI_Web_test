import React, { useMemo, useEffect, useState, useRef } from "react";
import PlayingCard from "./PlayingCard";

const POSITIONS = [
  { dp: 0, outer: "bottom-2 left-1/2 -translate-x-1/2", side: "BOTTOM" },
  { dp: 1, outer: "right-2 top-1/2 -translate-y-1/2",   side: "RIGHT" },
  { dp: 2, outer: "top-2 left-1/2 -translate-x-1/2",    side: "TOP" },
  { dp: 3, outer: "left-2 top-1/2 -translate-y-1/2",    side: "LEFT" },
];

function TrickCards({ trick, viewerSeat, trumpSuit, size = "sm" }) {
  const vs = viewerSeat != null ? viewerSeat : -1;
  const seatOfDp = (dp) => (dp + vs) % 4;
  const cardsBySeat = (trick && trick.cards_played) || {};
  return (
    <>
      {POSITIONS.map(({ dp, outer, side }) => {
        const seat = seatOfDp(dp);
        const cards = cardsBySeat[seat] || [];
        return (
          <div key={dp} className={`absolute ${outer} p-1`}>
            <div className={`flex gap-1.5 flex-wrap ${side === "LEFT" ? "flex-row-reverse" : ""}`}>
              {cards.map((c, i) => (
                <PlayingCard key={i} card={c} trumpSuit={trumpSuit} size={size} />
              ))}
              {!cards.length && (
                <div className="h-[72px] w-[52px] rounded-xl border-2 border-dashed border-white/15 shrink-0" />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function PlayArea({ state, viewerSeat }) {
  if (!state) return null;

  const currentTrick = state.current_trick || { cards_played: {}, play_order: [] };
  const hasCurrent = Object.values(currentTrick.cards_played || {}).some(v => Array.isArray(v) && v.length > 0);
  const history = state.tricks_history || [];
  const lastTrick = !hasCurrent && history.length > 0 ? history[history.length - 1] : null;
  const isLastMode = !!lastTrick;
  const trick = isLastMode ? lastTrick : currentTrick;

  const [overlay, setOverlay] = useState(null);
  const lastHistoryLenRef = useRef(history.length);
  const timersRef = useRef([]);

  useEffect(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    if (history.length > lastHistoryLenRef.current && history.length > 0) {
      const prevTrick = history[history.length - 1];
      setOverlay({ trick: prevTrick, fading: false });
      const t1 = setTimeout(() => {
        setOverlay(o => (o ? { ...o, fading: true } : o));
      }, 1000);
      const t2 = setTimeout(() => {
        setOverlay(null);
      }, 1500);
      timersRef.current.push(t1, t2);
    }
    lastHistoryLenRef.current = history.length;
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, [history.length]);

  return (
    <div className="panel p-3 md:p-4 relative min-h-[260px] md:min-h-[320px]">
      <div className={isLastMode ? "opacity-70" : ""}>
        <TrickCards
          trick={trick}
          viewerSeat={viewerSeat}
          trumpSuit={state.trump_suit}
        />
      </div>
      {overlay && (
        <div
          className={
            "absolute inset-0 z-10 rounded-xl transition-opacity duration-500 ease-out " +
            (overlay.fading ? "opacity-0" : "opacity-100")
          }
        >
          <div className="absolute inset-0 bg-emerald-900/30 rounded-xl" />
          <div className="relative w-full h-full">
            <TrickCards
              trick={overlay.trick}
              viewerSeat={viewerSeat}
              trumpSuit={state.trump_suit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
