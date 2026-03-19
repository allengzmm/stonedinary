import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/platform/runtime";

export async function resolveAccountDbUri(dbKey: string) {
  if (!isTauriRuntime()) {
    return dbKey;
  }
  return invoke<string>("resolve_account_db_uri", { dbKey });
}
