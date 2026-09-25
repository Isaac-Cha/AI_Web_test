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
    <div className={cn("relative", compact ? "" : "min-h-[140px]")}>
      {/* 手牌信息小 chip（右上角浮动，不再使用整块半透明 panel）*/}
      <div className="absolute top-0 right-0 z-20 flex flex-wrap justify-end gap-1 max-w-[65%] pointer-events-none">
        <span className="chip bg-black/55 backdrop-blur text-white text-[10px] md:text-xs !px-2 !py-0.5">手牌 {n}</span>
        <span className="chip bg-poker-gold/30 backdrop-blur text-poker-gold text-[10px] md:text-xs !px-2 !py-0.5">主 {countTrumps}</span>
        <span className="chip bg-red-500/30 backdrop-blur text-red-200 text-[10px] md:text-xs !px-2 !py-0.5">分 {total}</span>
        {selectedIds.length > 0 && (
          <span className="chip bg-emerald-500/30 backdrop-blur text-emerald-200 text-[10px] md:text-xs !px-2 !py-0.5">已选 {selectedIds.length}</span>
        )}
        {selectedLimitHint && (
          <span className="chip bg-sky-500/30 backdrop-blur text-sky-200 text-[10px] md:text-xs !px-2 !py-0.5 whitespace-nowrap">
            {selectedLimitHint}
          </span>
        )}
      </div>

      <div className="flex justify-center pt-8 md:pt-9">
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
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">手牌空</div>
          )}
        </div>
      </div>
    </div>
  );
}
