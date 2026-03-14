import { WritingGuide } from "@/types/writing";

export const WRITING_GUIDES: WritingGuide[] = [
  {
    title: "今天最起波澜的一件事",
    principle: "只写事实，不解释，不评价，像摄像头一样记录发生了什么。",
    prompts: ["谁做了什么？", "发生在什么场景？", "哪一刻最触发我？"],
    examples: ["会议上同事当场否定了我的方案。", "我看到了别人晋升的消息。"],
    mistakes: ["今天很糟糕。", "今天太不公平了。"],
    wordLimit: "1-3 句，建议不超过 80 字",
  },
  {
    title: "当时我的第一反应",
    principle: "写原始反应，不写后续分析。",
    prompts: ["我第一秒想做什么？", "身体有什么反应？", "最冲动的念头是什么？"],
    examples: ["我立刻想反驳。", "我一下子很想证明自己。"],
    mistakes: ["我理性分析了一下。", "我后来想通了。"],
    wordLimit: "1-2 句，建议不超过 60 字",
  },
  {
    title: "我其实想得到什么",
    principle: "写具体想得到的结果，不写抽象词。",
    prompts: ["我想让谁改变看法？", "我希望得到什么回应或位置？"],
    examples: ["我想让他承认我没错。", "我想保住这段关系。"],
    mistakes: ["我想要意义。", "我想要幸福。"],
    wordLimit: "1-2 句，建议不超过 70 字",
  },
  {
    title: "我其实在害怕什么",
    principle: "写最真实的恐惧，不绕开。",
    prompts: ["如果变坏我最怕什么？", "我最不想面对别人怎么看我？"],
    examples: ["我怕别人觉得我不专业。", "我怕承认自己其实很在意。"],
    mistakes: ["我没什么害怕的。"],
    wordLimit: "1-2 句，建议不超过 70 字",
  },
  {
    title: "我给自己找了什么理由",
    principle: "写安慰自己、包装自己的那句话。",
    prompts: ["我怎么解释自己的行为？", "我给自己套了什么体面说法？"],
    examples: ["我说自己只是讲公平。", "我说这件事不值得我在意。"],
    mistakes: ["我没有找理由。", "我只是理性。"],
    wordLimit: "1-3 句，建议不超过 100 字",
  },
  {
    title: "今天捞出来的主石头是什么",
    principle: "用短语概括今天暴露出来的核心模式。",
    prompts: ["这次反应背后重复的是什么？", "这暴露了我的什么旧模式？"],
    examples: ["怕被否定", "想证明自己", "用理性掩盖脆弱"],
    wordLimit: "建议 4-20 字",
  },
  {
    title: "如果明天再遇到同样的事，我准备怎么选",
    principle: "写一个具体动作，不写口号。",
    prompts: ["下次先做什么？", "我要停止哪个旧动作？", "我要尝试哪个新动作？"],
    examples: ["下次先问清对方依据，再决定是否反驳。", "下次先回一句简短消息。"],
    mistakes: ["我要成长。", "我要更理性。"],
    wordLimit: "1-2 句，建议不超过 80 字",
  },
];

export const SCENE_OPTIONS = [
  { value: "work", label: "工作" },
  { value: "research", label: "学术/研究" },
  { value: "family", label: "家庭" },
  { value: "relationship", label: "亲密关系" },
  { value: "social", label: "社交" },
  { value: "money", label: "金钱" },
  { value: "decision", label: "决策" },
  { value: "self_eval", label: "自我评价" },
  { value: "health", label: "健康" },
  { value: "other", label: "其他" },
] as const;

export const SCENE_LABELS = Object.fromEntries(
  SCENE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export function getSceneLabel(sceneType: string) {
  return SCENE_LABELS[sceneType] ?? sceneType;
}
