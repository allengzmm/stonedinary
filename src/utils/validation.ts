const ABSTRACT_WORDS = ["成长", "尊严", "意义", "幸福", "公平", "价值", "爱", "真实"];
const JUDGMENT_WORDS = ["不公平", "针对", "过分", "离谱", "恶心"];
const VAGUE_ACTION_WORDS = ["成长", "改变", "放下", "更好", "努力", "理性"];

export function detectAbstractHint(value: string): string | null {
  return ABSTRACT_WORDS.some((word) => value.includes(word))
    ? "你的表达可能过于抽象，建议改写为具体想得到什么、害怕什么或准备怎么做。"
    : null;
}

export function detectEventHint(value: string): string | null {
  return JUDGMENT_WORDS.some((word) => value.includes(word))
    ? "这一层建议只写事实，不写评价。试着只写谁在什么场景做了什么。"
    : null;
}

export function detectNextActionHint(value: string): string | null {
  return VAGUE_ACTION_WORDS.some((word) => value.includes(word))
    ? "这一层建议写具体动作，例如“先停 10 秒”或“先问一句”。"
    : null;
}
