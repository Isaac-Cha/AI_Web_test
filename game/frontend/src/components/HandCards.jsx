import React, { useMemo } from "react";
import PlayingCard from "./PlayingCard";
import { cn, sortHand, isTrump, cardScore } from "@/utils/cardUtils";

const OVERLAP_RATIO = 0.32;
const OFFSET_SELECT_PX = 20;

export default function HandCards({
  cards = [],
  trumpSuit = null,
  selectedIds = [],
  onToggle = () => {},
  disabled = false,
  maxSelect = null,
  selectedLimitHint = "",
  compact = false,
}) {
  const ordered = useMemo(() => sortHand(cards, trumpSuit), [cards, trumpSuit]);
  const total = ordered.reduce((s, c) => s + cardScore(c), 0);
  const countTrumps = ordered.filter(c => isTrump(c, trumpSuit)).length;
  const size = compact ? "sm" : "md";
  const n = ordered.length;

  const widthPx = size === "sm" ? 51 : 70;
  const overlapStep = widthPx * OVERLAP_RATIO;
  const totalPx = n > 0 ? (n - 1) * overlapStep + widthPx : 0;

  return (
    <div className={cn("panel p-3 md:p-4", compact ? "" : "min-h-[160px]")}>
      <div className="flex items-center justify-between mb-2 text-xs text-white/80">
        <span className="flex items-center gap-2">
          <span className="chip bg-white/10 text-white">手牌 {n}</span>
          <span className="chip bg-poker-gold/20 text-poker-gold">主 {countTrumps}</span>
          <span className="chip bg-red-500/20 text-red-200">分 {total}</span>
          {selectedLimitHint && <span className="chip bg-sky-500/20 text-sky-200">{selectedLimitHint}</span>}
        </span>
        {selectedIds.length > 0 && (
          <span className="chip bg-emerald-500/20 text-emerald-200">已选 {selectedIds.length}</span>
        )}
      </div>
      <div className="flex justify-center">
        <div
          className="relative hand-wrap"
          style={{ width: totalPx || 1, height: size === "sm" ? 80 : 120 }}
        >
          {ordered.map((c, idx) => {
            const selected = selectedIds.includes(c.id);
            const overLimit = maxSelect != null && !selected && selectedIds.length >= maxSelect;
            return (
              <div
                key={c.id}
                className="absolute top-0"
                style={{
                  left: idx * overlapStep,
                  zIndex: idx + 1,
                  transform: selected ? `translateY(-${OFFSET_SELECT_PX}px)` : "none",
                  transition: "transform 120ms ease, left 120ms ease",
                }}
              >
                <PlayingCard
                  card={c}
                  trumpSuit={trumpSuit}
                  selected={selected}
                  size={size}
                  onClick={disabled || overLimit ? undefined : () => onToggle(c.id)}
                />
              </div>
            );
          })}
          {!n && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">空</div>
          )}
        </div>
      </div>
    </div>
  );
}
