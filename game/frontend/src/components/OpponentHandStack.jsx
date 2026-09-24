import React from "react";
import PlayingCard from "./PlayingCard";
import { cn } from "@/utils/cardUtils";

/**
 * 对手手牌数显示（不显示正面，以重叠堆叠展示背面张数）
 */
export default function OpponentHandStack({
  count = 0,
  trumpSuit = null,
  label = "",
  subLabel = "",
  size = "sm",
}) {
  // 用 Math.min(6, count) 张视觉表示，超出数字显示
  const visual = Math.min(6, Math.max(0, count));
  const cards = Array.from({ length: visual });
  return (
    <div className="panel p-2 md:p-3">
      <div className="flex items-center justify-between mb-1 text-xs text-white/80">
        <span className="chip bg-white/10 text-white">{label}</span>
        <span className="chip bg-poker-gold/20 text-poker-gold">×{count}</span>
      </div>
      {subLabel && <div className="text-[11px] text-white/60 mb-1.5">{subLabel}</div>}
      <div className="relative h-20 md:h-24">
        {cards.map((_, i) => {
          const offset = visual <= 1 ? 0 : (i / (visual - 1) - 0.5) * 32;
          return (
            <div
              key={i}
              className="absolute left-1/2 -translate-x-1/2"
              style={{ transform: `translate(calc(-50% + ${offset}px), ${i * 1.2}px)`, zIndex: i }}
            >
              <PlayingCard card={null} trumpSuit={trumpSuit} faceDown size={size} />
            </div>
          );
        })}
        {count === 0 && <div className="text-white/40 text-xs mt-6 text-center">已出完</div>}
      </div>
    </div>
  );
}
