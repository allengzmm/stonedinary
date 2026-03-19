declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
    };
  }
}

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isCapacitorRuntime() {
  return typeof window !== "undefined" && typeof window.Capacitor !== "undefined";
}

export function isNativeMobileRuntime() {
  if (!isCapacitorRuntime()) {
    return false;
  }

  const platform = window.Capacitor?.getPlatform?.();
  return platform === "android" || platform === "ios";
}

export function isWebLikeRuntime() {
  return !isTauriRuntime();
}
