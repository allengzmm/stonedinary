import { invoke } from "@tauri-apps/api/core";
import { closeDatabase } from "@/db/client";
import { BackupRecord } from "@/types/entry";

export async function createBackup(dbKey: string, password?: string) {
  return invoke<string>("create_database_backup", {
    dbKey,
    password: password && password.length > 0 ? password : null,
  });
}

export async function listBackups(dbKey: string) {
  return invoke<BackupRecord[]>("list_database_backups", { dbKey });
}

export async function restoreBackup(
  dbKey: string,
  filename: string,
  password?: string,
) {
  await closeDatabase();
  await invoke("restore_database_backup", {
    dbKey,
    filename,
    password: password && password.length > 0 ? password : null,
  });
}
