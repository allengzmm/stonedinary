import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createBackup, listBackups, restoreBackup } from "@/services/backupService";
import { exportJson, exportMarkdown } from "@/services/exportService";
import { importJsonSnapshot } from "@/services/importService";
import { useAuthStore } from "@/stores/authStore";
import { BackupRecord } from "@/types/entry";

export function SettingsPage() {
  const currentAccount = useAuthStore((state) => state.currentAccount);
  const accounts = useAuthStore((state) => state.accounts);
  const refreshAccounts = useAuthStore((state) => state.refreshAccounts);
  const createAccount = useAuthStore((state) => state.createAccount);
  const resetAccountPassword = useAuthStore((state) => state.resetAccountPassword);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<"json" | "markdown" | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupPassword, setBackupPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [isAdminWorking, setIsAdminWorking] = useState(false);

  async function loadBackups() {
    if (!currentAccount) {
      setBackups([]);
      return;
    }

    try {
      setBackups(await listBackups(currentAccount.dbKey));
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    void refreshAccounts();
    void loadBackups();
  }, [currentAccount, refreshAccounts]);

  async function handleExport(type: "json" | "markdown") {
    setIsExporting(type);
    setMessage(null);
    try {
      const path = type === "json" ? await exportJson() : await exportMarkdown();
      setMessage(`导出成功：${path}`);
    } catch (error) {
      console.error(error);
      setMessage("导出失败，请稍后重试。");
    } finally {
      setIsExporting(null);
    }
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage(null);
    try {
      const summary = await importJsonSnapshot(file);
      setMessage(
        `导入完成。日记 新增 ${summary.entriesInserted} / 更新 ${summary.entriesUpdated} / 跳过 ${summary.entriesSkipped}；` +
          `石头 新增 ${summary.stonesInserted} / 更新 ${summary.stonesUpdated} / 跳过 ${summary.stonesSkipped}；` +
          `复盘 新增 ${summary.reviewsInserted} / 更新 ${summary.reviewsUpdated} / 跳过 ${summary.reviewsSkipped}。`,
      );
      window.location.reload();
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "导入失败，请检查文件格式。");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleCreateBackup() {
    if (!currentAccount) {
      return;
    }
    setIsBackingUp(true);
    setMessage(null);
    try {
      const path = await createBackup(currentAccount.dbKey, backupPassword || undefined);
      await loadBackups();
      setMessage(
        backupPassword ? `加密备份已生成：${path}` : `普通备份已生成：${path}`,
      );
    } catch (error) {
      console.error(error);
      setMessage("备份失败，请稍后重试。");
    } finally {
      setIsBackingUp(false);
    }
  }

  async function handleRestore(backup: BackupRecord) {
    if (!currentAccount) {
      return;
    }

    if (!window.confirm(`确认恢复备份 ${backup.filename}？当前账号数据库会被覆盖。`)) {
      return;
    }

    if (backup.encrypted && !backupPassword) {
      setMessage("恢复加密备份前，请填写备份密码。");
      return;
    }

    setRestoringFile(backup.filename);
    setMessage(null);
    try {
      await restoreBackup(currentAccount.dbKey, backup.filename, backupPassword || undefined);
      setMessage("备份已恢复，应用即将重新加载。");
      window.location.reload();
    } catch (error) {
      console.error(error);
      setMessage("恢复失败，请检查备份密码或备份文件。");
    } finally {
      setRestoringFile(null);
    }
  }

  async function handleCreateAccount() {
    if (!newUsername.trim() || newUserPassword.length < 4) {
      setMessage("新账号和密码不能为空，且密码至少 4 位。");
      return;
    }

    setIsAdminWorking(true);
    setMessage(null);
    try {
      await createAccount(adminPassword, newUsername, newUserPassword);
      await refreshAccounts();
      setNewUsername("");
      setNewUserPassword("");
      setMessage("新账号已创建。");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "创建账号失败。");
    } finally {
      setIsAdminWorking(false);
    }
  }

  async function handleResetAccountPassword() {
    if (!resetUsername.trim() || resetPassword.length < 4) {
      setMessage("目标账号不能为空，且新密码至少 4 位。");
      return;
    }

    setIsAdminWorking(true);
    setMessage(null);
    try {
      await resetAccountPassword(adminPassword, resetUsername, resetPassword);
      setResetUsername("");
      setResetPassword("");
      setMessage("账号密码已重置。");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "重置账号密码失败。");
    } finally {
      setIsAdminWorking(false);
    }
  }

  return (
    <div className="settings-grid">
      <section className="panel settings-card">
        <h3>当前账号</h3>
        <div className="list">
          <div className="list-item">账号名：{currentAccount?.username ?? "未登录"}</div>
          <div className="list-item">数据库：{currentAccount?.dbKey ?? "未选择"}</div>
          <div className="list-item">当前已注册账号数：{accounts.length}</div>
        </div>
      </section>

      <section className="panel settings-card">
        <h3>数据导出 / 导入</h3>
        <div className="list">
          <div className="list-item">导出当前账号的日记、石头和复盘数据。</div>
          <div className="list-item">导入历史 JSON 快照时，会与现有数据按时间合并。</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleImportFileChange}
        />
        <div className="toolbar" style={{ marginTop: 16 }}>
          <button className="btn" type="button" disabled={isExporting !== null} onClick={() => void handleExport("json")}>
            {isExporting === "json" ? "导出中..." : "导出 JSON"}
          </button>
          <button className="btn" type="button" disabled={isExporting !== null} onClick={() => void handleExport("markdown")}>
            {isExporting === "markdown" ? "导出中..." : "导出 Markdown"}
          </button>
          <button
            className="btn primary"
            type="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
          >
            {isImporting ? "导入中..." : "导入历史 JSON"}
          </button>
        </div>
      </section>

      <section className="panel settings-card">
        <h3>数据库备份 / 恢复</h3>
        <p className="muted">每个账号单独备份自己的数据库。填写备份密码可生成加密备份。</p>
        <label className="field-label" htmlFor="backup-password">备份密码</label>
        <input
          id="backup-password"
          className="field-input"
          type="password"
          value={backupPassword}
          onChange={(event) => setBackupPassword(event.target.value)}
          placeholder="留空则生成普通备份"
        />
        <div className="toolbar" style={{ marginTop: 16 }}>
          <button className="btn primary" type="button" disabled={isBackingUp || !currentAccount} onClick={() => void handleCreateBackup()}>
            {isBackingUp ? "备份中..." : "创建备份"}
          </button>
        </div>
        <div className="list" style={{ marginTop: 18 }}>
          <div className="list-item"><strong>当前账号备份列表</strong></div>
          {backups.length === 0 ? (
            <div className="list-item">暂无备份。</div>
          ) : (
            backups.map((backup) => (
              <div key={backup.filename} className="list-item">
                <div className="list-row">
                  <strong>{backup.filename}</strong>
                  <span className="chip">{backup.encrypted ? "已加密" : "普通"}</span>
                  <span className="chip">{backup.size} bytes</span>
                </div>
                <p className="muted">{backup.path}</p>
                <div className="toolbar">
                  <button className="btn" type="button" disabled={restoringFile !== null} onClick={() => void handleRestore(backup)}>
                    {restoringFile === backup.filename ? "恢复中..." : "恢复此备份"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel settings-card">
        <h3>管理员账号管理</h3>
        <label className="field-label" htmlFor="admin-password">管理员密码</label>
        <input
          id="admin-password"
          className="field-input"
          type="password"
          value={adminPassword}
          onChange={(event) => setAdminPassword(event.target.value)}
        />
        <div className="two-col" style={{ marginTop: 16 }}>
          <div className="list">
            <div className="list-item"><strong>创建新账号</strong></div>
            <input className="field-input" placeholder="新账号名" value={newUsername} onChange={(event) => setNewUsername(event.target.value)} />
            <input className="field-input" type="password" placeholder="新账号密码" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
            <button className="btn primary" type="button" disabled={isAdminWorking} onClick={() => void handleCreateAccount()}>
              {isAdminWorking ? "处理中..." : "创建账号"}
            </button>
          </div>
          <div className="list">
            <div className="list-item"><strong>重置账号密码</strong></div>
            <input className="field-input" placeholder="目标账号名" value={resetUsername} onChange={(event) => setResetUsername(event.target.value)} />
            <input className="field-input" type="password" placeholder="新密码" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
            <button className="btn" type="button" disabled={isAdminWorking} onClick={() => void handleResetAccountPassword()}>
              {isAdminWorking ? "处理中..." : "重置密码"}
            </button>
          </div>
        </div>
        {message ? <p className="muted" style={{ marginTop: 16 }}>{message}</p> : null}
      </section>
    </div>
  );
}
