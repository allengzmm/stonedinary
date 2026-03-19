import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { bootstrapApp } from "@/services/bootstrap";
import { getDebugLogPath } from "@/services/logger";
import { useAuthStore } from "@/stores/authStore";
import "@/styles.css";

function AppRoot() {
  const initialized = useAuthStore((state) => state.initialized);
  const mode = useAuthStore((state) => state.mode);
  const bootError = useAuthStore((state) => state.bootError);

  useEffect(() => {
    void bootstrapApp();
  }, []);

  if (!initialized) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="chip">正在初始化本地认证数据...</div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div className="panel settings-card" style={{ width: "min(520px, 100%)" }}>
          <h2 style={{ marginTop: 0 }}>启动失败</h2>
          <p className="muted">{bootError}</p>
          <p className="muted">
            调试日志： {getDebugLogPath() ?? "应用数据目录中的 debug.log"}
          </p>
        </div>
      </div>
    );
  }

  if (mode !== "ready") {
    return <AuthScreen />;
  }

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);
