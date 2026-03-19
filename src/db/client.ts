import Database from "@tauri-apps/plugin-sql";
import { isTauriRuntime } from "@/platform/runtime";

let dbPromise: Promise<Database> | null = null;
let activeDatabaseUri: string | null = null;

export function setActiveDatabaseUri(databaseUri: string) {
  if (activeDatabaseUri === databaseUri) {
    return;
  }

  activeDatabaseUri = databaseUri;
  dbPromise = null;
}

export function getActiveDatabaseUri() {
  return activeDatabaseUri;
}

export function getDatabase() {
  if (!isTauriRuntime()) {
    throw new Error("SQL database access is only available in the Tauri desktop runtime.");
  }

  if (!activeDatabaseUri) {
    throw new Error("No active account database selected.");
  }

  if (!dbPromise) {
    dbPromise = Database.load(activeDatabaseUri);
  }

  return dbPromise;
}

export async function closeDatabase() {
  if (!isTauriRuntime()) {
    dbPromise = null;
    return;
  }

  if (!dbPromise) {
    return;
  }

  const db = await dbPromise;
  await db.close();
  dbPromise = null;
}
