import React, { useMemo } from "react";
import OpponentHandStack from "./OpponentHandStack";
import PlayingCard from "./PlayingCard";
import PlayArea from "./PlayArea";
import DeckArea from "./DeckArea";
import TributeArea from "./TributeArea";
import HandCards from "./HandCards";
import ActionButtons from "./ActionButtons";
import { Crown } from "lucide-react";

const seatToDp = (seat, viewer) => (seat - viewer + 4) % 4;

function OpponentPanel({ meta, trump, side = "top", isBanker = false, banerCard = null, partner = false }) {
  if (!meta) return null;
  const label =
    "P" + (meta.seat + 1) +
    (meta.banker ? " 庄" : "") +
    (meta.partner ? " 对家" : "") +
    (meta.team ? " · " + meta.team : "") +
    (meta.ai ? " · AI" : "");
  const sub =
    (meta.name || `P${meta.seat + 1}`) + (meta.ai ? " 🤖" : "") +
    (meta.count != null ? ` · ${meta.count}张` : "");
  return (
    <div className="panel p-2 md:p-2.5 w-full h-full flex flex-col gap-1">
      <div className="flex gap-1.5 items-start" style={{ flexDirection: banerCard && side !== "top" ? "row" : "column" }}>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] md:text-xs text-white/70 mb-0.5 truncate font-medium">
            {isBanker ? (
              <span className="inline-flex items-center gap-0.5 text-poker-gold">
                <Crown className="w-3 h-3" /> {label}
              </span>
            ) : label}
          </div>
          <OpponentHandStack
            count={meta.count}
            trumpSuit={trump}
            label=""
            subLabel=""
            horizontal={side !== "top" || partner}
            compact
            partner={partner}
          />
        </div>
        {banerCard && (
          <div className="flex flex-col gap-0.5 shrink-0 items-center pt-0.5 min-w-[3.5rem]">
            <span className="chip bg-emerald-500/25 text-emerald-100 whitespace-nowrap w-max text-[9px] md:text-[10px] px-1.5 py-0.5">办二</span>
            <PlayingCard
              card={{ id: "baner-op-" + meta.seat, rank: banerCard.rank, suit: banerCard.suit, is_joker: false }}
              trumpSuit={trump}
              size="xs"
              faceDown={false}
            />
          </div>
        )}
      </div>
      <div className="text-[9px] md:text-[10px] text-white/50 truncate">{sub}</div>
    </div>
  );
}

export default function PokerTable({
  state, viewerSeat,
  myHand, selectedIds, setSelectedIds,
  actions, lastDistributePick, setLastDistributePick,
  capturedScoreCards, onToggle,
}) {
  if (!state) return null;

  const seatMeta = useMemo(() => {
    return [0, 1, 2, 3].map(s => {
      const p = state?.players?.find(x => x.seat === s);
      return {
        seat: s,
        dp: viewerSeat == null ? null : seatToDp(s, viewerSeat),
        player: p,
        name: p?.name || `P${s + 1}空座`,
        team: p?.team || "-",
        ai: !!p?.is_ai,
        dc: !!p?.disconnected,
        banker: s === state?.banker_seat,
        partner: s === state?.banker_partner_seat,
        count: p?.hand_count ?? (p?.hand ? p.hand.length : 0),
      };
    });
  }, [state, viewerSeat]);

  const byDp = useMemo(() => {
    const out = [null, null, null, null];
    for (const m of seatMeta) if (m.dp != null) out[m.dp] = m;
    return out;
  }, [seatMeta]);

  const bankerSeat = state?.banker_seat;
  const trump = state?.trump_suit || null;

  const showBanerCard = useMemo(() => {
    if (bankerSeat == null) return null;
    if (state?.declare_method !== "ban2") return null;
    if (!state?.trump_suit) return null;
    return { rank: state.trump_rank ?? "2", suit: state.trump_suit };
  }, [bankerSeat, state?.declare_method, state?.trump_rank, state?.trump_suit]);

  const phase = state?.phase;
  const showTribute = phase === "tribute_select" || phase === "tribute_distribute" || phase === "tribute_return";

  const me = byDp[0];
  const meIsBanker = me?.seat === bankerSeat;

  return (
    <div className="poker-table relative w-full min-h-[560px] md:min-h-[660px] rounded-3xl border-2 border-emerald-800/60 p-3 md:p-5
                    bg-gradient-to-br from-emerald-950/70 via-emerald-900/60 to-green-950/70 shadow-2xl shadow-black/40">
      {/* TOP: dp=2 对家 */}
      <div className="absolute top-3 md:top-5 left-[20%] right-[20%] h-[14%] md:h-[15%]">
        <OpponentPanel meta={byDp[2]} trump={trump} side="top" partner
                       isBanker={bankerSeat != null && byDp[2]?.seat === bankerSeat}
                       banerCard={bankerSeat != null && byDp[2]?.seat === bankerSeat ? showBanerCard : null} />
      </div>

      {/* LEFT: dp=3 下家 */}
      <div className="absolute left-3 md:left-5 top-[17%] bottom-[32%] w-[18%] md:w-[15%] hidden md:block">
        <OpponentPanel meta={byDp[3]} trump={trump} side="left"
                       isBanker={bankerSeat != null && byDp[3]?.seat === bankerSeat}
                       banerCard={bankerSeat != null && byDp[3]?.seat === bankerSeat ? showBanerCard : null} />
      </div>

      {/* RIGHT: dp=1 上家 */}
      <div className="absolute right-3 md:right-5 top-[17%] bottom-[32%] w-[18%] md:w-[15%] hidden md:block">
        <OpponentPanel meta={byDp[1]} trump={trump} side="right"
                       isBanker={bankerSeat != null && byDp[1]?.seat === bankerSeat}
                       banerCard={bankerSeat != null && byDp[1]?.seat === bankerSeat ? showBanerCard : null} />
      </div>

      {/* 移动端 LEFT+RIGHT 合并到 PlayArea 上方一行 */}
      <div className="absolute left-[20%] right-[20%] top-[17%] h-[6%] grid grid-cols-2 gap-2 md:hidden">
        <OpponentPanel meta={byDp[3]} trump={trump} side="left" compact
                       isBanker={bankerSeat != null && byDp[3]?.seat === bankerSeat}
                       banerCard={bankerSeat != null && byDp[3]?.seat === bankerSeat ? showBanerCard : null} />
        <OpponentPanel meta={byDp[1]} trump={trump} side="right" compact
                       isBanker={bankerSeat != null && byDp[1]?.seat === bankerSeat}
                       banerCard={bankerSeat != null && byDp[1]?.seat === bankerSeat ? showBanerCard : null} />
      </div>

      {/* CENTER PlayArea: 出牌区 */}
      <div className="absolute left-[20%] right-[20%] top-[25%] md:top-[19%] bottom-[32%] md:bottom-[34%] hidden md:block">
        <PlayArea state={state} viewerSeat={viewerSeat} />
      </div>
      <div className="absolute left-[20%] right-[20%] top-[24%] bottom-[32%] md:hidden">
        <PlayArea state={state} viewerSeat={viewerSeat} />
      </div>

      {/* CENTER-LOWER Deck/Tribute 区 */}
      <div className="absolute left-[22%] right-[22%] md:left-[22%] md:right-[22%]
                      bottom-[27%] md:bottom-[29%] h-[4%] md:h-[5%] min-h-[36px]">
        {showTribute ? (
          <TributeArea
            state={state}
            viewerSeat={viewerSeat}
            viewerHand={myHand}
            selectedIds={selectedIds}
            onToggle={onToggle}
          />
        ) : (
          <DeckArea
            state={state}
            viewerSeat={viewerSeat}
            capturedScoreCards={capturedScoreCards}
          />
        )}
      </div>

      {/* BOTTOM: 本人 dp=0 */}
      <div className="absolute left-3 md:left-5 right-3 md:right-5 bottom-3 md:bottom-5 top-[68%] md:top-[66%]
                      flex flex-col gap-2 overflow-hidden">
        {meIsBanker && showBanerCard && (
          <div className="panel p-2 md:p-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip bg-poker-gold text-black text-xs md:text-sm">
                <Crown className="w-3 h-3 inline mr-1" />
                P{bankerSeat + 1}（我）· 庄
              </span>
              <div className="flex items-center gap-2">
                <span className="chip bg-emerald-500/25 text-emerald-100 whitespace-nowrap text-xs md:text-sm">办二</span>
                <PlayingCard
                  card={{ id: "baner-display", rank: showBanerCard.rank, suit: showBanerCard.suit, is_joker: false }}
                  trumpSuit={trump}
                  size="sm"
                />
              </div>
            </div>
          </div>
        )}
        <ActionButtons
          state={state}
          viewerSeat={viewerSeat}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          viewerHand={myHand}
          actions={actions}
          setLastDistributePick={setLastDistributePick}
          lastDistributePick={lastDistributePick}
        />
        <HandCards
          cards={myHand}
          trumpSuit={trump}
          selectedIds={selectedIds}
          onToggle={onToggle}
          selectedLimitHint={
            phase === "discard_bottom" ? "需 6 张扣底" :
            phase === "tribute_select" ? `需 ${state?.tribute_count || 0} 张最大主非分` :
            phase === "tribute_return" && (state.banker_seat === viewerSeat || state.banker_partner_seat === viewerSeat)
              ? `需 ${state?.tribute_count || 0} 张还牌` :
            phase === "playing" ? "出牌（可单张 / 甩多张）" : ""
          }
        />
      </div>
    </div>
  );
}
