import { FormEvent, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toErrorMessage } from "@/services/logger";

export function AuthScreen() {
  const mode = useAuthStore((state) => state.mode);
  const accounts = useAuthStore((state) => state.accounts);
  const setupFirstAccount = useAuthStore((state) => state.setupFirstAccount);
  const login = useAuthStore((state) => state.login);
  const resetAccountPassword = useAuthStore((state) => state.resetAccountPassword);
  const resetAuthData = useAuthStore((state) => state.resetAuthData);

  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [adminPassword, setAdminPassword] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetAdminPassword, setResetAdminPassword] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  async function handleSetup(event: FormEvent) {
    event.preventDefault();
    if (!adminPassword || adminPassword.length < 4) {
      setMessage("管理员密码至少需要 4 位。");
      return;
    }
    if (!username.trim()) {
      setMessage("请输入账号名。");
      return;
    }
    if (!password || password.length < 4) {
      setMessage("账号密码至少需要 4 位。");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("两次输入的账号密码不一致。");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await setupFirstAccount(adminPassword, username, password);
    } catch (error) {
      console.error(error);
      setMessage(`初始化账号失败：${toErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const ok = await login(username, password);
      if (!ok) {
        setMessage("账号或密码不正确。");
      }
    } catch (error) {
      console.error(error);
      setMessage(`登录失败：${toErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    if (!resetPassword || resetPassword.length < 4) {
      setMessage("新密码至少需要 4 位。");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await resetAccountPassword(resetAdminPassword, resetUsername, resetPassword);
      setMessage("账号密码已通过管理员密码重置。");
      setResetAdminPassword("");
      setResetUsername("");
      setResetPassword("");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : `重置失败：${toErrorMessage(error)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetAuthData() {
    const confirmed = window.confirm(
      "这会清空本地账号、管理员密码和登录状态，并重新进入首次初始化。是否继续？",
    );
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await resetAuthData();
      setAdminPassword("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setResetAdminPassword("");
      setResetUsername("");
      setResetPassword("");
      setMessage("本地认证信息已清空，请重新初始化。");
    } catch (error) {
      console.error(error);
      setMessage(`清空本地认证失败：${toErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="two-col" style={{ width: "min(980px, 100%)" }}>
        <form
          className="panel settings-card"
          onSubmit={mode === "setup" ? handleSetup : handleLogin}
        >
          <h2 style={{ marginTop: 0 }}>
            {mode === "setup" ? "初始化本地账号" : "账号登录"}
          </h2>
          <p className="muted">
            {mode === "setup"
              ? "首次使用需要设置管理员密码，并创建第一个账号。"
              : "每个账号使用独立数据库。"}
          </p>

          {mode === "setup" ? (
            <>
              <label className="field-label" htmlFor="admin-password">
                管理员密码
              </label>
              <input
                id="admin-password"
                className="field-input"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
              />
            </>
          ) : null}

          <label className="field-label" htmlFor="auth-username" style={{ marginTop: 16 }}>
            账号
          </label>
          <input
            id="auth-username"
            className="field-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            list={mode === "login" ? "accounts" : undefined}
          />

          {mode === "login" ? (
            <datalist id="accounts">
              {accounts.map((account) => (
                <option key={account.id} value={account.username} />
              ))}
            </datalist>
          ) : null}

          <label className="field-label" htmlFor="auth-password" style={{ marginTop: 16 }}>
            {mode === "setup" ? "账号密码" : "密码"}
          </label>
          <input
            id="auth-password"
            className="field-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {mode === "setup" ? (
            <>
              <label
                className="field-label"
                htmlFor="auth-confirm-password"
                style={{ marginTop: 16 }}
              >
                确认账号密码
              </label>
              <input
                id="auth-confirm-password"
                className="field-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </>
          ) : null}

          {message ? (
            <p className="muted" style={{ color: "var(--danger)" }}>
              {message}
            </p>
          ) : null}

          <div className="toolbar" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            {mode === "login" ? (
              <button
                className="btn"
                type="button"
                onClick={handleResetAuthData}
                disabled={isSubmitting}
              >
                清空本地认证并重新初始化
              </button>
            ) : null}
            <button className="btn primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "处理中..." : mode === "setup" ? "完成初始化" : "登录"}
            </button>
          </div>
        </form>

        <form className="panel settings-card" onSubmit={handleReset}>
          <h2 style={{ marginTop: 0 }}>管理员找回 / 重置密码</h2>
          <p className="muted">通过管理员密码为任意本地账号重置密码。</p>
          <label className="field-label" htmlFor="reset-admin-password">
            管理员密码
          </label>
          <input
            id="reset-admin-password"
            className="field-input"
            type="password"
            value={resetAdminPassword}
            onChange={(event) => setResetAdminPassword(event.target.value)}
          />
          <label className="field-label" htmlFor="reset-username" style={{ marginTop: 16 }}>
            目标账号
          </label>
          <input
            id="reset-username"
            className="field-input"
            value={resetUsername}
            onChange={(event) => setResetUsername(event.target.value)}
          />
          <label className="field-label" htmlFor="reset-password" style={{ marginTop: 16 }}>
            新密码
          </label>
          <input
            id="reset-password"
            className="field-input"
            type="password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
          />
          <div className="toolbar" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "处理中..." : "重置账号密码"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
