import { getActiveDatabaseUri } from "@/db/client";
import { AppSettingsRecord, EntryRecord, ReviewRecord, StoneRecord } from "@/types/entry";

const MOBILE_DB_KEY_PREFIX = "stone-diary.mobile-db.";

interface MobileDbShape {
  entries: EntryRecord[];
  stones: StoneRecord[];
  reviews: ReviewRecord[];
  appSettings: AppSettingsRecord;
}

function defaultSettings(dbKey: string): AppSettingsRecord {
  return {
    id: 1,
    theme: "light",
    autoSaveEnabled: true,
    showWritingHints: true,
    defaultExportPath: "",
    dbPath: dbKey,
    updatedAt: new Date().toISOString(),
  };
}

function getStorageKey(dbKey: string) {
  return `${MOBILE_DB_KEY_PREFIX}${dbKey}`;
}

function getCurrentDbKey() {
  const dbKey = getActiveDatabaseUri();
  if (!dbKey) {
    throw new Error("No active mobile account database selected.");
  }
  return dbKey;
}

export function readMobileDb(dbKey = getCurrentDbKey()): MobileDbShape {
  const raw = window.localStorage.getItem(getStorageKey(dbKey));
  if (!raw) {
    return {
      entries: [],
      stones: [],
      reviews: [],
      appSettings: defaultSettings(dbKey),
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MobileDbShape>;
    return {
      entries: parsed.entries ?? [],
      stones: parsed.stones ?? [],
      reviews: parsed.reviews ?? [],
      appSettings: parsed.appSettings ?? defaultSettings(dbKey),
    };
  } catch (error) {
    console.error(error);
    return {
      entries: [],
      stones: [],
      reviews: [],
      appSettings: defaultSettings(dbKey),
    };
  }
}

export function writeMobileDb(next: MobileDbShape, dbKey = getCurrentDbKey()) {
  window.localStorage.setItem(getStorageKey(dbKey), JSON.stringify(next));
}

export function updateMobileDb(
  updater: (current: MobileDbShape) => MobileDbShape,
  dbKey = getCurrentDbKey(),
) {
  const current = readMobileDb(dbKey);
  const next = updater(current);
  writeMobileDb(next, dbKey);
  return next;
}

export function ensureMobileDb(dbKey = getCurrentDbKey()) {
  const current = readMobileDb(dbKey);
  writeMobileDb(current, dbKey);
  return current;
}
