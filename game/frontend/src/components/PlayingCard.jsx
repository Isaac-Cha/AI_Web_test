import React from "react";
import { cn, renderCard, isScore, cardScore } from "@/utils/cardUtils";

/**
 * 单张扑克牌组件。
 * 背面（faceDown）显示牌背。
 * 主牌自动紫色/金色边框 + 金色中心。
 */
export default function PlayingCard({
  card,
  trumpSuit,
  faceDown = false,
  selected = false,
  onClick,
  size = "md",   // sm | md | lg
  title = "",
  className = "",
}) {
  const style = SIZES[size] || SIZES.md;
  if (faceDown || !card) {
    return (
      <div
        className={cn("card card-back animate-deal", className)}
        style={style}
        title={title || "背面"}
        onClick={onClick}
      />
    );
  }
  const r = renderCard(card, trumpSuit);
  const isScoreMark = isScore(card);
  const scoreVal = cardScore(card);
  return (
    <div
      className={cn(
        "card animate-deal",
        r.color === "#dc2626" ? "card-red" : "",
        r.isTrump ? "card-trump" : "",
        selected ? "card-selected" : "",
        onClick ? "cursor-pointer" : "",
        className
      )}
      style={style}
      onClick={onClick}
      title={title || `主牌=${r.isTrump ? "是" : "否"}${isScoreMark ? " 分:" + scoreVal : ""}`}
    >
      {/* 左上角 */}
      <div className="card-corner" style={{ color: r.color }}>
        <span className="text-base">{r.big}</span>
        {!!r.symbol && <span className="text-base leading-none">{r.symbol}</span>}
        {isScoreMark && (
          <span className="mt-1 text-[10px] font-black text-poker-gold">-{scoreVal}-</span>
        )}
      </div>
      {/* 中央 */}
      <div className="card-center" style={{ color: r.color }}>
        {r.symbol || "JOKER"}
      </div>
      {/* 右下角（旋转 180） */}
      <div className="card-corner br" style={{ color: r.color }}>
        <span className="text-base">{r.big}</span>
        {!!r.symbol && <span className="text-base leading-none">{r.symbol}</span>}
      </div>
    </div>
  );
}

const SIZES = {
  sm: { width: "3.2rem", height: "4.5rem", padding: "0.22rem 0.3rem" },
  md: { width: "4.4rem", height: "6.2rem", padding: "0.35rem 0.45rem" },
  lg: { width: "5.2rem", height: "7.3rem", padding: "0.4rem 0.5rem" },
};
