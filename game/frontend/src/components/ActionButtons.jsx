import React, { useMemo } from "react";
import {
  Sparkles, Plus, FlipVertical, CheckCircle, Share2, Undo2, ThumbsDown,
  Eye, ArrowRightCircle, Play, Crown
} from "lucide-react";
import { cn, getBestTributeCardIds } from "@/utils/cardUtils";
import DECK_RULES from "@/config/deck_rules";

const AB_TIP_CHIP = "chip bg-white/5 text-white/70 !px-2 !py-0.5 backdrop-blur";

/**
 * 操作按钮组：根据 phase + 座位动态显示
 * 所有动作均是 client -> server（动作见 routes_ws.py）
 * 去掉了整块从左到右半透明 panel 大背景，按钮直接排 + 必要信息小 chip
 */
export default function ActionButtons({
  state, viewerSeat, selectedIds, setSelectedIds,
  viewerHand, actions,
  setLastDistributePick, lastDistributePick,
}) {
  if (!state) return <div className="text-white/50 text-sm py-2">连接中…</div>;
  const phase = state.phase;
  const me = state.players?.find(p => p.seat === viewerSeat);
  const isCurrentSeat = state.current_seat === viewerSeat;
  const disabled = !me || me.is_ai || me.disconnected;

  // waiting
  if (phase === "waiting") {
    return (
      <div className="flex flex-wrap items-center gap-2 justify-between py-1">
        <div className="text-sm flex items-center gap-2">
          <span className={AB_TIP_CHIP}>房间 {state.room_id?.slice?.(0, 6)}</span>
          <span className="text-white/80">等待开始（{state.players.filter(p => !p.is_ai).length} 真人 / {state.players.filter(p => p.is_ai).length} AI）</span>
        </div>
        <button className="btn btn-primary" onClick={actions.start} disabled={disabled || state.players.length < 2}>
          <Play className="w-4 h-4" /> 开始游戏
        </button>
      </div>
    );
  }

  // settlement：准备按钮
  if (phase === "settlement") {
    const pr = state.prev_result;
    const readySeats = Array.isArray(state.ready_seats) ? state.ready_seats : [];
    const humanPlayers = (state.players || []).filter(p => !p.is_ai);
    const humanTotal = humanPlayers.length || 1;
    const humanReady = humanPlayers.filter(p => readySeats.includes(p.seat)).length;
    const isReady = readySeats.includes(viewerSeat);
    const allHumanReady = humanReady >= humanTotal;
    return (
      <div className="flex flex-wrap gap-2 items-center justify-between py-1">
        <div className="text-sm flex flex-wrap items-center gap-2">
          <span className="chip bg-amber-500/20 text-amber-200">
            <Crown className="w-3 h-3 inline mr-1" />第 {state.round_number} 轮结算
          </span>
          <span className="text-white/80">
            {(pr?.tribute_count ?? 0) > 0
              ? `下一轮：上供 ${pr?.tribute_count ?? 0} 张 · 换庄=${pr?.change_banker ? "是" : "否"}`
              : pr?.change_banker ? "下一轮：换庄继续" : "下一轮：不换庄，继续"}
          </span>
          <span className="chip bg-emerald-500/20 text-emerald-200">已准备 {humanReady}/{humanTotal}（AI 自动准备）</span>
          {!allHumanReady && <span className="text-xs text-white/50">30 秒未准备完自动开</span>}
        </div>
        <button className={isReady ? "btn btn-success opacity-80" : "btn btn-primary"}
          onClick={actions.ready} disabled={disabled || isReady}>
          <CheckCircle className="w-4 h-4" /> {isReady ? "已准备 ✓" : "准备"}
        </button>
      </div>
    );
  }

  if (phase === "drawing") {
    const sel2 = viewerHand.find(c => selectedIds.includes(c.id) && c.rank === "2" && !c.is_joker);
    const hasRank2 = viewerHand.some(c => c.rank === "2" && !c.is_joker);
    return (
      <div className="flex flex-wrap gap-2 items-center py-1">
        <button className="btn btn-primary" onClick={actions.drawCard} disabled={disabled || !isCurrentSeat}>
          <Plus className="w-4 h-4" /> 摸牌（顺序）
        </button>
        {hasRank2 && (
          <button className="btn btn-info"
            onClick={() => sel2 && actions.declareBan2(sel2.id)}
            disabled={disabled || !sel2 || !isCurrentSeat}>
            <Sparkles className="w-4 h-4" /> 办二{sel2 ? `（已选 2${sel2.suit ? ` · ${sel2.suit}` : ""}）` : ""}
          </button>
        )}
      </div>
    );
  }

  if (phase === "flip_bottom") {
    return (
      <div className="flex flex-wrap gap-2 items-center py-1">
        <button className="btn btn-primary" onClick={actions.flipBottom} disabled={disabled || !isCurrentSeat}>
          <FlipVertical className="w-4 h-4" /> {DECK_RULES.flipBottom.btn}
        </button>
        <div className="text-xs text-white/60">{DECK_RULES.flipBottom.tip}</div>
      </div>
    );
  }

  if (phase === "discard_bottom") {
    const isBanker = state.banker_seat === viewerSeat;
    const ok = selectedIds.length === 6;
    return (
      <div className="flex flex-wrap gap-2 items-center justify-between py-1">
        <div className="text-sm text-white/80 flex items-center gap-2">
          <span>{isBanker ? DECK_RULES.discardBottom.bankerTip : "等待庄家扣底…"}</span>
          <span className="chip bg-purple-500/20 text-purple-200">已选 {selectedIds.length}/6</span>
        </div>
        {isBanker && (
          <button className="btn btn-primary" onClick={() => actions.discardBottom(selectedIds)} disabled={disabled || !ok}>
            <CheckCircle className="w-4 h-4" /> 确认扣底
          </button>
        )}
      </div>
    );
  }

  if (phase === "tribute_select") {
    const isGiver = state.tribute_giver_seat === viewerSeat;
    const N = state.tribute_count;
    const best = useMemo(
      () => getBestTributeCardIds(viewerHand, N, state.trump_suit),
      [viewerHand, N, state.trump_suit]
    );
    return (
      <div className="flex flex-wrap gap-2 items-center justify-between py-1">
        <div className="text-sm text-white/80">
          {isGiver ? `必须上供 N=${N} 张，严格最大 N 张主牌且非 5/10/K` : `等待上供…`}
        </div>
        {isGiver && (
          <>
            <button className="btn btn-ghost" onClick={() => setSelectedIds(best)} disabled={disabled}>
              <Eye className="w-4 h-4" /> 自动选择最大 {N} 张
            </button>
            <button className="btn btn-primary"
              onClick={() => actions.selectTribute(selectedIds)}
              disabled={disabled || selectedIds.length !== N}>
              <CheckCircle className="w-4 h-4" /> 确认上供
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "tribute_distribute") {
    const isBanker = state.banker_seat === viewerSeat;
    const dist = state.tribute_distribution || {};
    const sel = state.tribute_selected_cards || [];
    const unassigned = sel.filter(c => dist[c.id] == null).length;
    const banker = state.banker_seat;
    const partner = state.banker_partner_seat;
    const picked = lastDistributePick;
    return (
      <div className="flex flex-wrap gap-2 items-center justify-between py-1">
        <div className="text-sm text-white/80">
          {isBanker ? `先点一张上供牌→再点下方「分给对家 / 自留」，未分配 ${unassigned} 张` : "等待庄家分配…"}
        </div>
        {isBanker && (
          <>
            <button className="btn btn-ghost" disabled={disabled || !picked}
              onClick={() => { actions.distributeTribute({ [picked]: partner }); setLastDistributePick(null); }}>
              <Share2 className="w-4 h-4" /> 分给对家 P{partner + 1}
            </button>
            <button className="btn btn-info" disabled={disabled || !picked}
              onClick={() => { actions.distributeTribute({ [picked]: banker }); setLastDistributePick(null); }}>
              <Crown className="w-4 h-4" /> 自留
            </button>
            <button className="btn btn-primary"
              onClick={() => actions.distributeTribute({})}
              disabled={disabled || unassigned > 0}>
              <CheckCircle className="w-4 h-4" /> 确认分配
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "tribute_return") {
    const N = state.tribute_count;
    const isMeB = state.banker_seat === viewerSeat;
    const isMeBP = state.banker_partner_seat === viewerSeat;
    const role = isMeB ? "banker" : (isMeBP ? "partner" : null);
    const ok = selectedIds.length === N;
    const declineable = role === "banker" || role === "partner";
    return (
      <div className="flex flex-wrap gap-2 items-center justify-between py-1">
        <div className="text-sm text-white/80">
          {role
            ? (isMeBP ? `还牌（${N} 张花色互不相同）` : `还牌（${N} 张，建议给对家主牌）`) + ` · 已选 ${selectedIds.length}/${N}`
            : "等待庄家与对家还牌…"}
        </div>
        {role && (
          <>
            <button className="btn btn-danger" onClick={actions.declineCards} disabled={disabled || !declineable}
              title="对当前上供不满意，退回供家重选">
              <ThumbsDown className="w-4 h-4" /> 不要进牌（退回重选）
            </button>
            <button className="btn btn-primary"
              onClick={() => actions.selectReturn(selectedIds)}
              disabled={disabled || !ok}>
              <CheckCircle className="w-4 h-4" /> 确认还牌
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "playing") {
    const canAct = isCurrentSeat && !disabled;
    return (
      <div className="flex flex-wrap gap-2 items-center justify-between py-1">
        <div className="text-sm text-white/80 flex items-center gap-2">
          <span>
            {canAct
              ? (state.current_trick?.play_order?.length
                ? "请跟牌（同花色/同数量，若缺则自由垫）"
                : "请领出（可单张 / 甩多张三张同等级 或 长套）")
              : `等待 P${(state.current_seat ?? -1) + 1} 出牌…`}
          </span>
          {selectedIds.length > 0 && (
            <span className="chip bg-purple-500/20 text-purple-200">已选 {selectedIds.length}</span>
          )}
        </div>
        <button className="btn btn-primary"
          onClick={() => actions.playCards(selectedIds)}
          disabled={!canAct || selectedIds.length === 0}>
          <CheckCircle className="w-4 h-4" /> 出牌
        </button>
      </div>
    );
  }

  if (phase === "reveal_bottom") {
    return (
      <div className="flex flex-wrap gap-2 items-center justify-between py-1">
        <div className="text-sm text-white/80">{DECK_RULES.revealBottom.tip}</div>
        <button className="btn btn-primary" onClick={actions.revealNext} disabled={disabled || !isCurrentSeat}>
          <FlipVertical className="w-4 h-4" /> 翻下一张
        </button>
      </div>
    );
  }

  return <div className="text-white/60 py-2">—</div>;
}
