import { authRepository } from "@/db/repositories/authRepository";
import { logDebug, toErrorMessage } from "@/services/logger";
import { useAuthStore } from "@/stores/authStore";

export async function bootstrapApp() {
  try {
    await logDebug("bootstrap", "bootstrap start");
    await authRepository.migrate();
    await logDebug("bootstrap", "auth repository migrated");
    await useAuthStore.getState().initialize();
    await logDebug("bootstrap", "auth store initialized");
  } catch (error) {
    console.error(error);
    const message = `本地认证初始化失败：${toErrorMessage(error)}`;
    await logDebug("bootstrap", message);
    useAuthStore.getState().failBoot(message);
  }
}
