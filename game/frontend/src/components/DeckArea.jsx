import React from "react";
import PlayingCard from "./PlayingCard";
import { cardScore, SUIT_SYMBOL } from "@/utils/cardUtils";

/**
 * 底牌区（drawing/flip_bottom 阶段显示背面若干；flip 后显示已翻张；扣底后 show_bottom_to==all||banker 显示 6 张正面）
 */
export default function DeckArea({ state }) {
  if (!state) return null;
  const phase = state.phase;
  const bottom = state.bottom_cards || [];
  // drawing 阶段显示牌堆（剩余张数）
  if (phase === "drawing") {
    const remain = (state.deck_remaining ?? 0);
    return (
      <div className="panel p-2 md:p-3">
        <div className="text-xs text-white/70 mb-2">牌堆剩余 <b className="text-poker-gold">{remain}</b> 张 · 摸牌按顺序进行</div>
        <div className="flex items-end justify-center gap-2">
          <PlayingCard faceDown size="sm" />
          <PlayingCard faceDown size="sm" />
          <PlayingCard faceDown size="sm" />
          <PlayingCard faceDown size="sm" />
        </div>
      </div>
    );
  }
  if (phase === "flip_bottom") {
    // 4 张底 + 已翻的 1 张
    const flipIdx = state.reveal_flip_index || 0;
    return (
      <div className="panel p-2 md:p-3">
        <div className="text-xs text-white/70 mb-2">翻底定主：第 {Math.min(flipIdx + 1, 4)} / 4 张</div>
        <div className="flex justify-center gap-2">
          {bottom.map((c, i) => {
            const visible = i < flipIdx || state.trump_suit != null;
            const justFlipped = i === flipIdx - 1;
            return (
              <div key={i} className={justFlipped ? "animate-flip" : ""}>
                <PlayingCard
                  card={c}
                  trumpSuit={state.trump_suit}
                  faceDown={!visible}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  // 扣底之后显示底牌面（只向庄家对家开放正面）
  const showAll = state.show_bottom_to === "all";
  const discardSize = 6;
  const disc = (state.discarded_bottom || []);
  const show = showAll;
  const totalBottom = bottom.reduce((s, c) => s + cardScore(c), 0);
  const discardTotal = disc.reduce((s, c) => s + cardScore(c), 0);
  return (
    <div className="panel p-2 md:p-3 space-y-2">
      <div className="flex flex-wrap gap-3 text-xs text-white/80">
        <span>底牌：{discardTotal + totalBottom} 分（底{totalBottom} + 扣{discardTotal}）</span>
        <span className="text-white/60">可见性：{showAll ? "所有人" : "仅庄家对家"}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <div className="flex flex-col items-center">
          <div className="text-[11px] text-white/60 mb-1">原底 4 张</div>
          <div className="flex gap-1.5">
            {bottom.map((c, i) => (
              <PlayingCard
                key={i}
                card={c}
                trumpSuit={state.trump_suit}
                faceDown={!show}
                size="sm"
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-[11px] text-white/60 mb-1">扣底 6 张</div>
          <div className="flex flex-wrap gap-1.5 max-w-[20rem] justify-center">
            {Array.from({ length: discardSize }).map((_, i) => (
              <PlayingCard
                key={i}
                card={disc[i] || null}
                trumpSuit={state.trump_suit}
                faceDown={!show || !disc[i]}
                size="sm"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
