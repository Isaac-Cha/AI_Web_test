import React from "react";
import { cn, renderCard, isScore, cardScore } from "@/utils/cardUtils";

/**
 * 单张扑克牌组件。
 * 背面（faceDown）显示牌背。
 * 主牌自动金色边框 + 金色中心；选中使用绿色 3px 内描边。
 */
export default function PlayingCard({
  card,
  trumpSuit,
  faceDown = false,
  selected = false,
  onClick,
  size = "md",   // xs | sm | md | lg
  title = "",
  className = "",
}) {
  const style = SIZES[size] || SIZES.md;
  const xsStyle = (size === "xs" ? {
    fontSize: "70%",
  } : undefined);
  if (faceDown || !card) {
    return (
      <div
        className={cn("card card-back animate-deal shrink-0", className)}
        style={{ ...style, ...xsStyle }}
        title={title || "背面"}
        onClick={onClick}
      />
    );
  }
  const r = renderCard(card, trumpSuit);
  const isScoreMark = isScore(card);
  const scoreVal = cardScore(card);
  const bigCls = size === "xs" ? "text-[9px] leading-none" : size === "sm" ? "text-[13px] leading-none" : "text-base leading-none";
  const centerCls = size === "xs" ? "text-[11px] leading-none" : size === "sm" ? "text-[1.05rem] leading-none" : "text-[1.6rem] leading-none";
  const markCls = size === "xs" ? "text-[6px] leading-none" : size === "sm" ? "text-[8px] leading-none" : "text-[10px] leading-none";
  return (
    <div
      className={cn(
        "card animate-deal shrink-0",
        r.color === "#dc2626" ? "card-red" : "",
        r.isTrump ? "card-trump" : "",
        selected ? "card-selected" : "",
        onClick ? "cursor-pointer" : "",
        className
      )}
      style={{ ...style, ...xsStyle }}
      onClick={onClick}
      title={title || `主牌=${r.isTrump ? "是" : "否"}${isScoreMark ? " 分:" + scoreVal : ""}`}
    >
      <div className="card-corner" style={{ color: r.color }}>
        <span className={cn(bigCls, "block")}>{r.big}</span>
        {!!r.symbol && <span className={cn(bigCls, "block")}>{r.symbol}</span>}
        {isScoreMark && (
          <span className={cn("mt-0.5 block font-black text-poker-gold", markCls)}>-{scoreVal}-</span>
        )}
      </div>
      <div className={cn("card-center block", centerCls)} style={{ color: r.color }}>
        {r.symbol || "JOKER"}
      </div>
      <div className="card-corner br" style={{ color: r.color }}>
        <span className={cn(bigCls, "block")}>{r.big}</span>
        {!!r.symbol && <span className={cn(bigCls, "block")}>{r.symbol}</span>}
      </div>
    </div>
  );
}

const SIZES = {
  xs: { width: "2.2rem", height: "3.1rem", padding: "0.1rem 0.12rem" },
  sm: { width: "3.2rem", height: "4.5rem", padding: "0.18rem 0.24rem" },
  md: { width: "4.4rem", height: "6.2rem", padding: "0.35rem 0.45rem" },
  lg: { width: "5.2rem", height: "7.3rem", padding: "0.4rem 0.5rem" },
};
