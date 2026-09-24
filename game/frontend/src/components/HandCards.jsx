import React, { useMemo } from "react";
import PlayingCard from "./PlayingCard";
import { cn, sortHand, isTrump, cardScore } from "@/utils/cardUtils";

/**
 * 自己的手牌（可多选，可点击）
 */
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
  // 扇形偏移
  const n = ordered.length;
  return (
    <div className={cn("panel p-3 md:p-4", compact ? "" : "min-h-[180px]")}>
      <div className="flex items-center justify-between mb-2 text-xs text-white/80">
        <span className="flex items-center gap-2">
          <span className="chip bg-white/10 text-white">手牌 {n}</span>
          <span className="chip bg-poker-gold/20 text-poker-gold">主 {countTrumps}</span>
          <span className="chip bg-red-500/20 text-red-200">分 {total}</span>
          {selectedLimitHint && <span className="chip bg-sky-500/20 text-sky-200">{selectedLimitHint}</span>}
        </span>
        {selectedIds.length > 0 && (
          <span className="chip bg-purple-500/20 text-purple-200">已选 {selectedIds.length}</span>
        )}
      </div>
      <div className="hand-wrap flex flex-wrap justify-center gap-1.5 md:gap-2 pt-6">
        {ordered.map((c, idx) => {
          const selected = selectedIds.includes(c.id);
          const overLimit = maxSelect != null && !selected && selectedIds.length >= maxSelect;
          return (
            <div
              key={c.id}
              style={{
                transform: `translateY(${Math.sin(idx / Math.max(1, n - 1) * Math.PI) * (compact ? 6 : 14)}px)`,
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
          <div className="text-white/50 text-sm py-8">空</div>
        )}
      </div>
    </div>
  );
}
