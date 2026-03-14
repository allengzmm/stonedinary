import { invoke } from "@tauri-apps/api/core";

export async function resolveAccountDbUri(dbKey: string) {
  return invoke<string>("resolve_account_db_uri", { dbKey });
}
