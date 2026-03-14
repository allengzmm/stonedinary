import { entriesRepository } from "@/db/repositories/entriesRepository";
import { reviewsRepository } from "@/db/repositories/reviewsRepository";
import { stonesRepository } from "@/db/repositories/stonesRepository";
import { EntryRecord, ReviewRecord, StoneRecord } from "@/types/entry";

interface ImportPayload {
  exportedAt?: string;
  entries?: EntryRecord[];
  stones?: StoneRecord[];
  reviews?: ReviewRecord[];
}

export interface ImportSummary {
  entriesInserted: number;
  entriesUpdated: number;
  entriesSkipped: number;
  stonesInserted: number;
  stonesUpdated: number;
  stonesSkipped: number;
  reviewsInserted: number;
  reviewsUpdated: number;
  reviewsSkipped: number;
}

function emptySummary(): ImportSummary {
  return {
    entriesInserted: 0,
    entriesUpdated: 0,
    entriesSkipped: 0,
    stonesInserted: 0,
    stonesUpdated: 0,
    stonesSkipped: 0,
    reviewsInserted: 0,
    reviewsUpdated: 0,
    reviewsSkipped: 0,
  };
}

function assertPayload(payload: ImportPayload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("导入文件格式无效。");
  }
  if (!Array.isArray(payload.entries) && !Array.isArray(payload.stones) && !Array.isArray(payload.reviews)) {
    throw new Error("导入文件缺少可识别的数据段。");
  }
}

export async function importJsonSnapshot(file: File): Promise<ImportSummary> {
  const raw = await file.text();
  const payload = JSON.parse(raw) as ImportPayload;
  assertPayload(payload);

  const summary = emptySummary();

  for (const stone of payload.stones ?? []) {
    const result = await stonesRepository.importMerge(stone);
    if (result === "inserted") summary.stonesInserted += 1;
    if (result === "updated") summary.stonesUpdated += 1;
    if (result === "skipped") summary.stonesSkipped += 1;
  }

  for (const entry of payload.entries ?? []) {
    const result = await entriesRepository.importMerge(entry);
    if (result === "inserted") summary.entriesInserted += 1;
    if (result === "updated") summary.entriesUpdated += 1;
    if (result === "skipped") summary.entriesSkipped += 1;
  }

  for (const review of payload.reviews ?? []) {
    const result = await reviewsRepository.importMerge(review);
    if (result === "inserted") summary.reviewsInserted += 1;
    if (result === "updated") summary.reviewsUpdated += 1;
    if (result === "skipped") summary.reviewsSkipped += 1;
  }

  return summary;
}
