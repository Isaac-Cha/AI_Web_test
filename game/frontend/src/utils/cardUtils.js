import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...xs) {
  return twMerge(clsx(xs));
}

// ========== 扑克牌渲染工具（与后端 card_utils.py 对应）==========
export const SUIT_SYMBOL = {
  spade: "♠", heart: "♥", club: "♣", diamond: "♦", joker: "🃏",
};
export const SUIT_NAME = {
  spade: "黑桃", heart: "红桃", club: "梅花", diamond: "方块", joker: "王",
};
export const SUIT_COLOR = {
  spade: "#0a0a0a", heart: "#dc2626", club: "#0a0a0a", diamond: "#dc2626", joker: "#6b21a8",
};

export function isJoker(card) {
  return !!card && card.suit === "joker";
}
export function isRank2(card) {
  return !!card && !isJoker(card) && card.rank === "2";
}
export function isScore(card) {
  return !!card && ["5", "10", "K"].includes(card.rank);
}
export function cardScore(card) {
  if (!card) return 0;
  if (card.rank === "5") return 5;
  if (card.rank === "10" || card.rank === "K") return 10;
  return 0;
}

/**
 * 判断是否主牌（trump_suit=null 时全不算主）
 * 主牌：大小王 + 所有 2 + 主花色
 */
export function isTrump(card, trumpSuit) {
  if (!card || !trumpSuit) return false;
  if (isJoker(card)) return true;
  if (isRank2(card)) return true;
  return card.suit === trumpSuit;
}

/** 手牌展示排序：主牌在前（主大小降），副牌按花色分组组内降 */
export function sortHand(cards, trumpSuit) {
  if (!cards || !cards.length) return [];
  const tr = [], sides = {};
  for (const c of cards) {
    if (isTrump(c, trumpSuit)) tr.push(c);
    else {
      if (!sides[c.suit]) sides[c.suit] = [];
      sides[c.suit].push(c);
    }
  }
  const order = ["spade", "heart", "club", "diamond"];
  // 主牌降序（trump rank 值越大越前）
  tr.sort((a, b) => trumpValue(b, trumpSuit) - trumpValue(a, trumpSuit));
  const out = [...tr];
  for (const s of order) {
    const grp = sides[s] || [];
    grp.sort((a, b) => sideValue(b) - sideValue(a));
    out.push(...grp);
  }
  return out;
}

// 与后端同序的主/副大小值（值越大越大）
const TR_RANK = {
  "5": 100000, big: 90000, small: 80000, "2": 70000,
  A: 60000, K: 59000, Q: 58000, J: 57000, "10": 56000,
  "9": 55000, "8": 54000, "7": 53000, "6": 52000,
  "4": 51000, "3": 50000,
};
const SD_RANK = {
  "2": 120, A: 110, K: 100, Q: 90, J: 80, "10": 70,
  "9": 60, "8": 50, "7": 40, "6": 30, "5": 20, "4": 10, "3": 0,
};
export function trumpValue(card, trumpSuit, strict = false) {
  if (!isTrump(card, trumpSuit)) return -1;
  let base = TR_RANK[card.rank] || 0;
  if (!isJoker(card) && card.rank === "2" && card.suit === trumpSuit) {
    base += 10000; // 主2
  }
  if (!strict && !isJoker(card)) {
    base += { spade: 40, heart: 30, club: 20, diamond: 10, joker: 0 }[card.suit] || 0;
  }
  return base;
}
export function sideValue(card) {
  return SD_RANK[card.rank] || 0;
}

/** UI：返回 {big, small, color} */
export function renderCard(card, trumpSuit) {
  if (!card) return null;
  if (isJoker(card)) {
    return {
      big: card.rank === "big" ? "大王" : "小王",
      small: "",
      symbol: "🃏",
      color: card.rank === "big" ? "#a21caf" : "#1e293b",
      isTrump: true,
    };
  }
  return {
    big: card.rank,
    small: "",
    symbol: SUIT_SYMBOL[card.suit],
    color: SUIT_COLOR[card.suit],
    isTrump: isTrump(card, trumpSuit),
  };
}

/** 上供选牌时：返回「合规且最大的 N 张 id 数组」*/
export function getBestTributeCardIds(hand, N, trumpSuit) {
  if (!trumpSuit || N <= 0) return [];
  const eligible = hand
    .filter((c) => isTrump(c, trumpSuit) && !isScore(cardScore(c)))
    .filter((c) => !!c);
  eligible.sort((a, b) => trumpValue(b, trumpSuit, true) - trumpValue(a, trumpSuit, true));
  const k = Math.min(N, eligible.length);
  return eligible.slice(0, k).map((c) => c.id);
}

/** localStorage 小工具 */
const KEY = "show-thumb:player";
export function savePlayerMap(roomId, seat, playerId, name) {
  try {
    const cur = JSON.parse(localStorage.getItem(KEY) || "{}");
    cur[roomId] = { seat, playerId, name, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(cur));
  } catch {}
}
export function getPlayerMap(roomId) {
  try {
    const cur = JSON.parse(localStorage.getItem(KEY) || "{}");
    return cur[roomId] || null;
  } catch {
    return null;
  }
}
