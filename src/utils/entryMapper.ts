import { EntryRecord, StoneRecord } from "@/types/entry";

interface EntryRow {
  id: string;
  entryDate: string;
  sceneType: string;
  intensity: number;
  eventText: string;
  firstReaction: string;
  hiddenDesire: string;
  hiddenFear: string;
  selfJustification: string;
  stoneId: string | null;
  stoneTextSnapshot: string;
  nextAction: string;
  customTags: string[] | string | null;
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

interface StoneRow extends Omit<StoneRecord, "isArchived" | "usageCount"> {
  isArchived: boolean | number;
  usageCount?: number | string;
}

export function mapEntryRow(row: EntryRow): EntryRecord {
  const customTags =
    typeof row.customTags === "string"
      ? JSON.parse(row.customTags || "[]")
      : Array.isArray(row.customTags)
        ? row.customTags
        : [];

  return {
    ...row,
    customTags,
  };
}

export function mapStoneRow(row: StoneRow): StoneRecord {
  return {
    ...row,
    isArchived: Boolean(row.isArchived),
    usageCount:
      typeof row.usageCount === "string"
        ? Number.parseInt(row.usageCount, 10)
        : row.usageCount,
  };
}
