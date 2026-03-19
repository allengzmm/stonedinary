import { invoke } from "@tauri-apps/api/core";
import { closeDatabase } from "@/db/client";
import { BackupRecord } from "@/types/entry";
import { isTauriRuntime } from "@/platform/runtime";

function unsupported() {
  throw new Error("Android/Web 版暂不支持数据库文件级备份，请使用 JSON 导出与导入迁移数据。");
}

export async function createBackup(dbKey: string, password?: string) {
  if (!isTauriRuntime()) {
    unsupported();
  }
  return invoke<string>("create_database_backup", {
    dbKey,
    password: password && password.length > 0 ? password : null,
  });
}

export async function listBackups(dbKey: string) {
  if (!isTauriRuntime()) {
    return [];
  }
  return invoke<BackupRecord[]>("list_database_backups", { dbKey });
}

export async function restoreBackup(
  dbKey: string,
  filename: string,
  password?: string,
) {
  if (!isTauriRuntime()) {
    unsupported();
  }
  await closeDatabase();
  await invoke("restore_database_backup", {
    dbKey,
    filename,
    password: password && password.length > 0 ? password : null,
  });
}
