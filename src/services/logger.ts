import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/platform/runtime";

let logPath: string | null = null;

export async function logDebug(scope: string, message: string) {
  const line = `[${scope}] ${message}`;
  console.log(line);
  if (!isTauriRuntime()) {
    return;
  }
  try {
    const path = await invoke<string>("append_debug_log", { message: line });
    logPath = path;
  } catch (error) {
    console.error("debug log write failed", error);
  }
}

export function getDebugLogPath() {
  return logPath;
}

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
