// 办二：翻底 / 扣底 / 最后一手翻底展示 / 抠底得分 / 上供表规则文字
// 全部集中在这里，用户可直接改，保存后 HMR 立即生效。
// 注意：保留左边的结构字段名不要改；右边的中文（字符串 / 数组元素内容）都可以自由改。

const DECK_RULES = {
  // ========== 翻底定主（flip_bottom 阶段）==========
  flipBottom: {
    btn: "翻第一张底（定主）",
    tip: "首张出现的 2 即定主花色；否则取 4 花缺门；若 4 花齐全则本副牌重洗，本局默认不换庄/不上供",
    header: "翻底定主",
    headerSuffix: " / 4 张",   // 显示在 TopInfoBar / DeckArea 副标题
  },

  // ========== 扣底（discard_bottom 阶段）==========
  discardBottom: {
    // 庄家视角的扣底建议提示
    bankerTip: "选 6 张扣到底牌（建议：保留主牌+最大副牌，先扣小副分/无分小副）",
    // 底分行文（显示在 DeckArea 顶部行）
    scoreLineTemplate: (bottomScore, discardScore, total) =>
      `底分：${total}（原底 ${bottomScore} + 扣 ${discardScore}）`,
    // 可见性提示（小标签）
    visibilityNote_banker: "仅庄家（扣底）",
    visibilityNote_settlement: "所有人（结算）",
    visibilityNote_hidden: "仅背面",
  },

  // ========== 结算前最后一手：展示底牌（reveal_bottom 阶段）==========
  revealBottom: {
    // ActionButtons 里左文字
    tip: "展示 6 张底牌 · 庄家/赢家队点「翻下一张」一张一张翻",
    // DeckArea 标题
    header: "展示底牌（结算前）",
  },

  // ========== 抠底 / 赢最后一手（ResultModal + DeckArea + Settlement 顶栏说明）==========
  captureBottom: {
    // 抠底成功条件文字
    conditionZh: "最后一手：赢家为副家队 且 副家队该手打出的牌中至少有 1 张是主牌（副家有主）→ 抠底成功，取得 6 张底牌分",
    // 抠底成功时 ResultModal Stat 行附加小字
    successNote: "（副家最后一手赢且有主牌，底牌归副家）",
    // 抠底失败两种情况
    failNote_bankerWin: "（副家未赢最后一手，底牌作废）",
    failNote_notTrumpWin: "（副家赢了最后一手但该手副家打出的牌里无主牌，底牌作废）",
    // 不翻倍说明（已改为永久不翻倍，不单独说明"不翻倍"也可以；想保留就留着）
    noDoubleNote: "（办二 V1：抠底不翻倍；只加原始底牌分）",
  },

  // ========== 上供表（ResultModal 底部规则说明）==========
  tributeTable: {
    header: "查上供表（规则 5.1）：副家得分 → 供几张 / 是否换庄",
    // 按行显示，每一行一条。可自由重排/重写文字
    rows: [
      "副家 0 分 → 供 3 张 · 不换庄",
      "副家 1 ~ 10 分 → 供 2 张 · 不换庄",
      "副家 11 ~ 24 分 → 供 1 张 · 不换庄",
      "副家 25 ~ 34 分 → 供 0 张 · 不换庄",
      "副家 35 ~ 39 分 → 供 0 张 · 换庄",
      "副家 40 ~ 49 分 → 供 1 张 · 换庄",
      "副家 50 ~ 59 分 → 供 2 张 · 换庄",
      "副家 ≥ 60 分 → 供 3 张 · 换庄",
    ],
    // 结果描述行（ResultModal L10 行附加一行文字）
    finalNote: "副家最后一手全主赢 = 抠底成功，底牌分计入副家总分；抠底不翻倍。",
  },

  // ========== DeckArea 左列标题 ==========
  deckArea: {
    leftColTitle: "本方累计得分牌（花面）",
    originalBottomColTitle: "原底 6",
    discardedColTitle: "扣底 6",
    drawingTitle: (remain) => `牌堆剩余 ${remain} 张 · 摸牌按顺序进行`,
  },
};

export default DECK_RULES;
