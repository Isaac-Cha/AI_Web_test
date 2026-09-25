import React from "react";
import PlayingCard from "./PlayingCard";
import { cardScore, SUIT_SYMBOL, isScore } from "@/utils/cardUtils";
import DECK_RULES from "@/config/deck_rules";

/**
 * 底牌区（drawing/flip_bottom 阶段显示背面若干；扣底后：左列「得分牌花面」+ 右列「扣底牌 庄正他背」同一行）
 * - viewerSeat: 当前视角座位（决定扣底是否可见）
 * - capturedScoreCards: 本方队累计已吃墩得分牌（5/10/K 花面缩略）
 * 所有文字集中在 @/config/deck_rules.js，用户可直接改
 */
export default function DeckArea({ state, viewerSeat = null, capturedScoreCards = [] }) {
  if (!state) return null;
  const phase = state.phase;
  const bottom = state.bottom_cards || [];

  if (phase === "drawing") {
    const remain = state.deck_remaining ?? 0;
    return (
      <div className="panel p-2 md:p-3">
        <div className="text-xs text-white/70 mb-2">{DECK_RULES.deckArea.drawingTitle(remain)}</div>
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
    const flipIdx = state.reveal_flip_index || 0;
    return (
      <div className="panel p-2 md:p-3">
        <div className="text-xs text-white/70 mb-2">
          {DECK_RULES.flipBottom.header}：第 {Math.min(flipIdx + 1, 4)}{DECK_RULES.flipBottom.headerSuffix}
        </div>
        <div className="flex justify-center gap-2">
          {bottom.map((c, i) => {
            const visible = i < flipIdx || state.trump_suit != null;
            const justFlipped = i === flipIdx - 1;
            return (
              <div key={i} className={justFlipped ? "animate-flip" : ""}>
                <PlayingCard card={c} trumpSuit={state.trump_suit} faceDown={!visible} size="sm" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === "reveal_bottom") {
    const flipIdx = state.reveal_flip_index || 0;
    return (
      <div className="panel p-2 md:p-3">
        <div className="text-xs text-white/70 mb-2">
          {DECK_RULES.revealBottom.header}：第 {Math.min(flipIdx + 1, bottom.length)} / {bottom.length} 张
        </div>
        <div className="flex justify-center gap-2">
          {bottom.map((c, i) => (
            <div key={i} className={i === flipIdx - 1 ? "animate-flip" : ""}>
              <PlayingCard card={c} trumpSuit={state.trump_suit} faceDown={i >= flipIdx} size="sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const discardSize = 6;
  const disc = state.discarded_bottom || [];
  const totalBottom = bottom.reduce((s, c) => s + cardScore(c), 0);
  const discardTotal = disc.reduce((s, c) => s + cardScore(c), 0);
  const bs = state.banker_seat;
  const isBankerView = viewerSeat != null && bs != null && viewerSeat === bs;
  // 庄家扎牌完成（进入 tribute_* / playing / reveal_bottom 之后）：非结算非庄家视角 原底 6 张一律不显示
  // （结算 settlement 时才所有人可见；扣底 discard_bottom 过程中庄家自己可见）
  const hideOriginalBottomAfterDiscard = (
    phase !== "flip_bottom" &&
    phase !== "discard_bottom" &&
    phase !== "settlement"
  );
  const showFace = (phase === "settlement" || isBankerView) && !hideOriginalBottomAfterDiscard;

  const visibleScores = capturedScoreCards.filter(c => isScore(c));
  const MAX_DISPLAY = 14;
  const moreCount = visibleScores.length > MAX_DISPLAY ? visibleScores.length - MAX_DISPLAY : 0;

  const visibilityLabel =
    phase === "settlement" ? DECK_RULES.discardBottom.visibilityNote_settlement :
    isBankerView ? DECK_RULES.discardBottom.visibilityNote_banker :
    DECK_RULES.discardBottom.visibilityNote_hidden;

  // 庄家队：完全不显示「本方得分 / 本方累计得分牌花面」（规则：庄家不计分也不显示得分）
  const viewerIsBankerTeam = (
    viewerSeat != null &&
    state.banker_seat != null &&
    (viewerSeat === state.banker_seat || viewerSeat === state.banker_partner_seat)
  );

  return (
    <div className="panel p-2 md:p-3">
      <div className="flex flex-wrap gap-3 text-xs text-white/80 mb-2 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {!viewerIsBankerTeam && (
            <span className="chip bg-red-500/20 text-red-200">
              本方得分 {capturedScoreCards.reduce((s,c)=>s+cardScore(c),0)}
            </span>
          )}
          {viewerIsBankerTeam && (
            <span className="chip bg-white/5 text-white/50">庄家不计分 / 不显示得分</span>
          )}
          <span>{DECK_RULES.discardBottom.scoreLineTemplate(totalBottom, discardTotal, discardTotal + totalBottom)}</span>
          <span className="text-white/60">可见性：{visibilityLabel}</span>
        </div>
      </div>

      <div className="flex flex-nowrap justify-between items-start gap-3 w-full min-h-[100px]">
        {/* 左列：本方得分牌（花面） */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="text-[11px] text-white/60">
            {viewerIsBankerTeam ? "庄家不计分 / 不累计得分牌" : DECK_RULES.deckArea.leftColTitle}
          </div>
          <div className="flex flex-wrap gap-1 items-end">
            {viewerIsBankerTeam && <span className="text-white/40 text-xs">（无）</span>}
            {!viewerIsBankerTeam && visibleScores.length === 0 && (
              <span className="text-white/40 text-xs">—</span>
            )}
            {!viewerIsBankerTeam && visibleScores.slice(0, MAX_DISPLAY).map((c, i) => (
              <PlayingCard key={c.id || i} card={c} trumpSuit={state.trump_suit} size="xs" faceDown={false} />
            ))}
            {!viewerIsBankerTeam && moreCount > 0 && (
              <span className="chip bg-white/10 text-white/70 ml-1 shrink-0">+{moreCount}</span>
            )}
          </div>
        </div>

        {/* 右列：扣底 + 原底（合一组，庄正他背；扎牌后非庄非结算不显示原底）*/}
        <div className="flex gap-3 shrink-0 items-start">
          <div className="flex flex-col items-center gap-1">
            <div className="text-[11px] text-white/60">{DECK_RULES.deckArea.originalBottomColTitle}</div>
            <div className="flex gap-1 flex-wrap max-w-[12rem] justify-end">
              {!hideOriginalBottomAfterDiscard && bottom.map((c, i) => (
                <PlayingCard key={i} card={c} trumpSuit={state.trump_suit} faceDown={!showFace} size="xs" />
              ))}
              {hideOriginalBottomAfterDiscard && <span className="text-white/40 text-xs">（扎牌后已隐藏）</span>}
              {!hideOriginalBottomAfterDiscard && bottom.length === 0 && <span className="text-white/40 text-xs">—</span>}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[11px] text-white/60">{DECK_RULES.deckArea.discardedColTitle}</div>
            <div className="flex gap-1 flex-wrap max-w-[17rem] justify-end">
              {Array.from({ length: discardSize }).map((_, i) => (
                <PlayingCard
                  key={i}
                  card={disc[i] || null}
                  trumpSuit={state.trump_suit}
                  faceDown={!showFace || !disc[i]}
                  size="xs"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
