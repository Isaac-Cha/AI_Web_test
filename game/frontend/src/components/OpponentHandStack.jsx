import React from "react";
import PlayingCard from "./PlayingCard";
import { cn, isScore, cardScore } from "@/utils/cardUtils";

/**
 * 对手手牌数显示（重叠堆叠展示背面张数）
 * side="top"（队友/对家）：水平堆叠（横屏，overlap 更小拉得更开）
 * side="left/right"：垂直堆叠（牌高方向叠加）
 * partner=true（队友 dp=2 对家）：强制 horizontal，overlapH 加倍放大 + 每张加 5° 扇微旋转
 */
export default function OpponentHandStack({
  count = 0,
  trumpSuit = null,
  label = "",
  subLabel = "",
  size = "sm",
  horizontal = false,
  compact = false,
  partner = false,
}) {
  const visual = Math.min(8, Math.max(0, count));
  const cards = Array.from({ length: visual });
  const stackWidth = size === "sm" ? 51 : 70;
  const stackHeight = size === "sm" ? 72 : 99;
  const overlapH = partner ? 18 : 10;
  const overlapV = 8;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1 text-xs text-white/80 min-w-0">
        <span className="chip bg-white/10 text-white truncate">{label}</span>
        <span className="chip bg-poker-gold/20 text-poker-gold shrink-0">×{count}</span>
      </div>
      {subLabel && <div className="text-[11px] text-white/60 mb-1.5 truncate">{subLabel}</div>}
      <div
        className={cn("relative mx-auto", compact ? "scale-90 origin-left" : "")}
        style={{
          width: horizontal
            ? (visual <= 1 ? stackWidth : (visual - 1) * overlapH + stackWidth + 4)
            : stackWidth,
          height: horizontal
            ? stackHeight + 8
            : (visual <= 1 ? stackHeight : (visual - 1) * overlapV + stackHeight),
        }}
      >
        {cards.map((_, i) => {
          const center = (cards.length - 1) / 2;
          const rot = partner ? ((i - center) * 2.2) : 0;
          const yOffset = partner ? Math.abs(i - center) * 1.2 : 0;
          const style = horizontal
            ? {
                left: i * overlapH,
                top: yOffset,
                zIndex: i + 1,
                transform: `rotate(${rot}deg)`,
                transformOrigin: "bottom center",
              }
            : { left: 0, top: i * overlapV, zIndex: i + 1 };
          return (
            <div key={i} className="absolute" style={style}>
              <PlayingCard card={null} trumpSuit={trumpSuit} faceDown size={size} />
            </div>
          );
        })}
        {count === 0 && <div className="absolute inset-0 text-white/40 text-xs flex items-center justify-center">已出完</div>}
      </div>
    </div>
  );
}
