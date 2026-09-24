import React from "react";
import PlayingCard from "./PlayingCard";
import { cardScore } from "@/utils/cardUtils";

/**
 * 上供 / 分配 / 还牌区域
 *   tribute_select：高亮「待选的上供最大 N 张 id」提示
 *   tribute_distribute：显示已选上供牌 + 可拖/点分配给 [banker_seat, banker_partner_seat]
 *   tribute_return：显示「庄家」「庄家对家」各自的 N 张还牌卡片（未确认前可编辑，确认后显示已选）
 */
export default function TributeArea({ state, viewerSeat, viewerHand, selectedIds, onToggle }) {
  if (!state) return null;
  const p = state.phase;
  if (!["tribute_select", "tribute_distribute", "tribute_return"].includes(p)) return null;
  const N = state.tribute_count || 0;
  if (p === "tribute_select") {
    const giver = state.tribute_giver_seat;
    const isMe = giver === viewerSeat;
    const title = isMe ? "请选出必须上供的最大 N 张主非分牌" : `等待 P${(giver ?? -1) + 1} 上供`;
    return (
      <div className="panel p-3 md:p-4">
        <div className="text-sm mb-2 text-white/80 flex items-center gap-2">
          <span className="chip bg-poker-gold/20 text-poker-gold">上供 N={N}</span>
          {title}
        </div>
        {isMe && (
          <div className="text-xs text-poker-gold mb-2">
            ⚠ 系统已按规则强制帮你选好最大 N 张主非分，可直接确认。手选不匹配规则会被服务端拒绝。
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 min-h-[100px] items-center">
          {viewerHand.filter(c => selectedIds.includes(c.id)).map(c => (
            <PlayingCard key={c.id} card={c} trumpSuit={state.trump_suit} size="sm" />
          ))}
          {selectedIds.length === 0 && <div className="text-white/40 text-xs">（所选牌会在此实时预览）</div>}
        </div>
      </div>
    );
  }
  if (p === "tribute_distribute") {
    const dist = state.tribute_distribution || {};
    const allSelected = state.tribute_selected_cards || [];
    const meIsBanker = viewerSeat === state.banker_seat;
    return (
      <div className="panel p-3 md:p-4 space-y-2">
        <div className="text-sm text-white/80 flex items-center gap-2">
          <span className="chip bg-purple-500/20 text-purple-200">分配上供牌 N={N}</span>
          {meIsBanker
            ? "点击上供牌，再点击目标 seat 分配（建议对家 1-2 张最大主牌）"
            : `等待庄家 P${(state.banker_seat ?? -1) + 1} 分配`}
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <div className="text-xs text-white/60 mb-1">上供原牌（共 {allSelected.length}）</div>
            <div className="flex gap-2 flex-wrap">
              {allSelected.map(c => {
                const assign = Object.entries(dist).find(([_, s]) => _ === c.id);
                const assigned = assign ? assign[1] : null;
                return (
                  <div key={c.id} className="flex flex-col items-center">
                    <PlayingCard card={c} trumpSuit={state.trump_suit} size="sm"
                      onClick={meIsBanker ? () => onToggle?.(c.id, "distribute-pick") : undefined}
                      className={selectedIds.includes(c.id) ? "ring-2 ring-poker-gold" : ""}
                    />
                    <div className="text-[10px] mt-1 text-white/70">
                      {assigned != null ? `→ P${assigned + 1}` : "未分配"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="panel p-2">
              <div className="text-xs text-white/70 mb-1">庄家 P{(state.banker_seat ?? -1) + 1} 收到</div>
              <div className="flex flex-wrap gap-1.5 min-h-[70px]">
                {allSelected.filter(c => dist[c.id] === state.banker_seat).map(c => (
                  <PlayingCard key={c.id} card={c} trumpSuit={state.trump_suit} size="sm" />
                ))}
              </div>
            </div>
            <div className="panel p-2">
              <div className="text-xs text-white/70 mb-1">对家 P{(state.banker_partner_seat ?? -1) + 1} 收到</div>
              <div className="flex flex-wrap gap-1.5 min-h-[70px]">
                {allSelected.filter(c => dist[c.id] === state.banker_partner_seat).map(c => (
                  <PlayingCard key={c.id} card={c} trumpSuit={state.trump_suit} size="sm" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // tribute_return
  const bReturn = (state.banker_returned || []);
  const bpReturn = (state.banker_partner_returned || []);
  const me = state.players?.find(x => x.seat === viewerSeat);
  return (
    <div className="panel p-3 md:p-4 space-y-2">
      <div className="text-sm text-white/80 flex items-center gap-2">
        <span className="chip bg-amber-500/20 text-amber-200">还牌 N={N}</span>
        庄家、庄家对家各还 N 张。庄家对家必须 4 张（或 N 张）花色互不相同
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="panel p-2">
          <div className="text-xs text-white/70 mb-1">
            庄家 P{(state.banker_seat ?? -1) + 1} 返还 {bReturn.length}/{N}
            {me?.seat === state.banker_seat && "（我）"}
          </div>
          <div className="flex gap-1.5 min-h-[70px] items-center">
            {bReturn.length
              ? bReturn.map(c => <PlayingCard key={c.id} card={c} trumpSuit={state.trump_suit} size="sm" />)
              : me?.seat === state.banker_seat ? (
                viewerHand.filter(c => selectedIds.includes(c.id)).map(c =>
                  <PlayingCard key={c.id} card={c} trumpSuit={state.trump_suit} size="sm" />
                )
              ) : <div className="text-white/40 text-xs">等待…</div>}
          </div>
        </div>
        <div className="panel p-2">
          <div className="text-xs text-white/70 mb-1">
            对家 P{(state.banker_partner_seat ?? -1) + 1} 返还 {bpReturn.length}/{N}
            {me?.seat === state.banker_partner_seat && "（我）"}
          </div>
          <div className="flex gap-1.5 min-h-[70px] items-center">
            {bpReturn.length
              ? bpReturn.map(c => <PlayingCard key={c.id} card={c} trumpSuit={state.trump_suit} size="sm" />)
              : me?.seat === state.banker_partner_seat ? (
                viewerHand.filter(c => selectedIds.includes(c.id)).map(c =>
                  <PlayingCard key={c.id} card={c} trumpSuit={state.trump_suit} size="sm" />
                )
              ) : <div className="text-white/40 text-xs">等待…</div>}
          </div>
        </div>
        <div className="panel p-2 min-w-[180px]">
          <div className="text-xs text-white/70 mb-1">庄家队（收到上供）</div>
          <div className="text-sm">「不要进牌」按钮可退回并重选</div>
        </div>
      </div>
    </div>
  );
}
