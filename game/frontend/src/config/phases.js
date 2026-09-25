// 办二游戏各阶段显示文案 —— 可直接在此文件修改，保存后前端 HMR 立即生效。
// 注意：key 名（waiting / drawing / flip_bottom / ...）必须与后端 GameState.phase 枚举保持一致，
//       不要改动左边的英文 key；右侧中文文案可按需要自由调整。

const PHASE_ZH = {
  waiting: "等待开始",
  drawing: "摸牌",
  flip_bottom: "翻底定主",
  discard_bottom: "扣底",
  tribute_select: "上供选牌",
  tribute_distribute: "分配上供",
  tribute_return: "还牌",
  playing: "出牌阶段",
  reveal_bottom: "翻底牌阶段",
  settlement: "结算",
};

export default PHASE_ZH;
