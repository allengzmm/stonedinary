export type EntryStatus = "draft" | "completed";

export interface EntryRecord {
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
  customTags: string[];
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EntryUpsertInput {
  entryDate: string;
  sceneType: string;
  intensity: number;
  eventText: string;
  firstReaction: string;
  hiddenDesire: string;
  hiddenFear: string;
  selfJustification: string;
  stoneTextSnapshot: string;
  nextAction: string;
  customTags: string[];
  status: EntryStatus;
}

export interface StoneRecord {
  id: string;
  name: string;
  description: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  lastUsedAt?: string | null;
}

export interface StoneUpdateInput {
  id: string;
  name: string;
  description: string;
}

export interface ReviewRecord {
  id: string;
  reviewType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  totalEntries: number;
  topStonesJson: string;
  topScenesJson: string;
  summaryText: string;
  commitmentText: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAggregateItem {
  label: string;
  count: number;
}

export interface ReviewAggregateRecord {
  totalEntries: number;
  topStones: ReviewAggregateItem[];
  topScenes: ReviewAggregateItem[];
  intensityDistribution: ReviewAggregateItem[];
  sampleEntries: Pick<
    EntryRecord,
    "id" | "entryDate" | "eventText" | "stoneTextSnapshot" | "selfJustification"
  >[];
}

export interface AppSettingsRecord {
  id: number;
  theme: string;
  autoSaveEnabled: boolean;
  showWritingHints: boolean;
  defaultExportPath: string;
  dbPath: string;
  updatedAt: string;
}

export interface BackupRecord {
  filename: string;
  path: string;
  encrypted: boolean;
  size: number;
  updatedAt: string;
}
