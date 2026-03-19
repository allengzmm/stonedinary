import { invoke } from "@tauri-apps/api/core";
import { entriesRepository } from "@/db/repositories/entriesRepository";
import { reviewsRepository } from "@/db/repositories/reviewsRepository";
import { stonesRepository } from "@/db/repositories/stonesRepository";
import { EntryRecord, ReviewRecord, StoneRecord } from "@/types/entry";
import { getSceneLabel } from "@/utils/guides";
import { isTauriRuntime } from "@/platform/runtime";

interface ExportPayload {
  exportedAt: string;
  entries: EntryRecord[];
  stones: StoneRecord[];
  reviews: ReviewRecord[];
}

function renderEntryMarkdown(entry: EntryRecord) {
  return [
    `## ${entry.entryDate} | ${entry.status === "completed" ? "已完成" : "草稿"}`,
    "",
    `- 场景：${getSceneLabel(entry.sceneType)}`,
    `- 强度：${entry.intensity}`,
    `- 石头：${entry.stoneTextSnapshot || "未指定"}`,
    `- 标签：${entry.customTags.length ? entry.customTags.join("、") : "无"}`,
    "",
    "### 今天最起波澜的一件事",
    entry.eventText || "未填写",
    "",
    "### 当时我的第一反应",
    entry.firstReaction || "未填写",
    "",
    "### 我其实想得到什么",
    entry.hiddenDesire || "未填写",
    "",
    "### 我其实在害怕什么",
    entry.hiddenFear || "未填写",
    "",
    "### 我给自己找了什么理由",
    entry.selfJustification || "未填写",
    "",
    "### 今天捞出来的主石头",
    entry.stoneTextSnapshot || "未填写",
    "",
    "### 如果明天再遇到同样的事，我准备怎么选",
    entry.nextAction || "未填写",
    "",
  ].join("\n");
}

function renderReviewMarkdown(review: ReviewRecord) {
  const topStones = JSON.parse(review.topStonesJson || "[]") as Array<{
    label: string;
    count: number;
  }>;
  const topScenes = JSON.parse(review.topScenesJson || "[]") as Array<{
    label: string;
    count: number;
  }>;

  return [
    `## ${review.reviewType === "weekly" ? "周复盘" : "月复盘"} | ${review.periodStart} ~ ${review.periodEnd}`,
    "",
    `- 记录数：${review.totalEntries}`,
    `- 高频石头：${topStones.map((item) => `${item.label}(${item.count})`).join("、") || "无"}`,
    `- 高频场景：${topScenes.map((item) => `${getSceneLabel(item.label)}(${item.count})`).join("、") || "无"}`,
    "",
    "### 总结",
    review.summaryText || "未填写",
    "",
    "### 承诺",
    review.commitmentText || "未填写",
    "",
  ].join("\n");
}

function toMarkdown(payload: ExportPayload) {
  return [
    "# 道痕日记本 StoneDiary 导出",
    "",
    `导出时间：${payload.exportedAt}`,
    "",
    "## 概览",
    "",
    `- 日记数：${payload.entries.length}`,
    `- 石头数：${payload.stones.length}`,
    `- 复盘数：${payload.reviews.length}`,
    "",
    "## 石头库",
    "",
    ...payload.stones.map(
      (stone) =>
        `- ${stone.name}｜出现 ${stone.usageCount ?? 0} 次｜最近出现 ${stone.lastUsedAt ?? "暂无"}`,
    ),
    "",
    "## 日记记录",
    "",
    ...payload.entries.map(renderEntryMarkdown),
    "## 复盘记录",
    "",
    ...payload.reviews.map(renderReviewMarkdown),
  ].join("\n");
}

async function buildPayload(): Promise<ExportPayload> {
  const [entries, stones, reviews] = await Promise.all([
    entriesRepository.listAll(),
    stonesRepository.listAll(),
    reviewsRepository.listAll(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    entries,
    stones,
    reviews,
  };
}

function triggerBrowserDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return filename;
}

async function writeExportFile(filename: string, content: string, mimeType: string) {
  if (!isTauriRuntime()) {
    return triggerBrowserDownload(filename, content, mimeType);
  }

  return invoke<string>("write_export_file", { filename, content });
}

export async function exportJson() {
  const payload = await buildPayload();
  const filename = `stone-diary-export-${payload.exportedAt.slice(0, 10)}.json`;
  const path = await writeExportFile(
    filename,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
  return path;
}

export async function exportMarkdown() {
  const payload = await buildPayload();
  const filename = `stone-diary-export-${payload.exportedAt.slice(0, 10)}.md`;
  const path = await writeExportFile(filename, toMarkdown(payload), "text/markdown");
  return path;
}
