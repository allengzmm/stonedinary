import { create } from "zustand";
import { setActiveDatabaseUri, closeDatabase } from "@/db/client";
import { authRepository } from "@/db/repositories/authRepository";
import { runUserMigrations } from "@/db/migrate";
import { resolveAccountDbUri } from "@/services/databaseService";
import { logDebug, toErrorMessage } from "@/services/logger";
import { AccountRecord } from "@/types/auth";
import { sha256 } from "@/utils/security";

type AuthMode = "loading" | "setup" | "login" | "ready";

interface AuthState {
  initialized: boolean;
  mode: AuthMode;
  bootError: string | null;
  accounts: AccountRecord[];
  currentAccount: AccountRecord | null;
  adminConfigured: boolean;
  initialize: () => Promise<void>;
  setupFirstAccount: (
    adminPassword: string,
    username: string,
    password: string,
  ) => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createAccount: (
    adminPassword: string,
    username: string,
    password: string,
  ) => Promise<void>;
  resetAccountPassword: (
    adminPassword: string,
    username: string,
    newPassword: string,
  ) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  resetAuthData: () => Promise<void>;
  failBoot: (message: string) => void;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function dbKeyForUsername(username: string) {
  const base = normalizeUsername(username).replace(/[^a-z0-9_-]/g, "_");
  return `account_${base || crypto.randomUUID()}.db`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  mode: "loading",
  bootError: null,
  accounts: [],
  currentAccount: null,
  adminConfigured: false,
  initialize: async () => {
    try {
      await logDebug("authStore", "initialize start");
      const state = await authRepository.getBootstrapState();
      const adminConfigured = Boolean(state.adminPasswordHash);
      const accounts = state.accounts;
      const lastActiveAccount = state.lastActiveUsername
        ? accounts.find((account) => account.username === state.lastActiveUsername) ?? null
        : null;

      if (lastActiveAccount) {
        const databaseUri = await resolveAccountDbUri(lastActiveAccount.dbKey);
        await logDebug("authStore", `restore session db uri: ${databaseUri}`);
        setActiveDatabaseUri(databaseUri);
        await runUserMigrations();
      }

      set({
        initialized: true,
        mode: lastActiveAccount ? "ready" : adminConfigured && accounts.length > 0 ? "login" : "setup",
        bootError: null,
        accounts,
        currentAccount: lastActiveAccount,
        adminConfigured,
      });
      await logDebug(
        "authStore",
        `initialize complete; mode=${lastActiveAccount ? "ready" : adminConfigured && accounts.length > 0 ? "login" : "setup"}`,
      );
    } catch (error) {
      console.error(error);
      set({
        initialized: true,
        mode: "setup",
        bootError: `本地认证初始化失败：${toErrorMessage(error)}`,
      });
      await logDebug("authStore", `initialize failed: ${toErrorMessage(error)}`);
    }
  },
  setupFirstAccount: async (adminPassword, username, password) => {
    try {
      await logDebug(
        "authStore",
        `setupFirstAccount start; username=${normalizeUsername(username)}`,
      );
      const adminHash = await sha256(adminPassword);
      const userHash = await sha256(password);
      const normalizedUsername = normalizeUsername(username);
      const dbKey = dbKeyForUsername(normalizedUsername);
      await authRepository.setAdminPasswordHash(adminHash);
      const account = await authRepository.createAccount(
        normalizedUsername,
        userHash,
        dbKey,
      );
      const databaseUri = await resolveAccountDbUri(account.dbKey);
      await logDebug("authStore", `resolved account db uri: ${databaseUri}`);
      setActiveDatabaseUri(databaseUri);
      await runUserMigrations();
      await authRepository.setLastActiveUsername(account.username);
      const accounts = await authRepository.listAccounts();
      set({
        initialized: true,
        mode: "ready",
        bootError: null,
        accounts,
        currentAccount: account,
        adminConfigured: true,
      });
      await logDebug(
        "authStore",
        `setupFirstAccount complete; username=${account.username}`,
      );
    } catch (error) {
      await logDebug("authStore", `setupFirstAccount failed: ${toErrorMessage(error)}`);
      throw error;
    }
  },
  login: async (username, password) => {
    try {
      await logDebug("authStore", `login start; username=${normalizeUsername(username)}`);
      const account = await authRepository.findAccountByUsername(
        normalizeUsername(username),
      );
      if (!account) {
        await logDebug(
          "authStore",
          `login failed; account not found: ${normalizeUsername(username)}`,
        );
        return false;
      }

      const hash = await sha256(password);
      if (hash !== account.passwordHash) {
        await logDebug("authStore", `login failed; password mismatch: ${account.username}`);
        return false;
      }

      const databaseUri = await resolveAccountDbUri(account.dbKey);
      await logDebug("authStore", `resolved login db uri: ${databaseUri}`);
      setActiveDatabaseUri(databaseUri);
      await runUserMigrations();
      await authRepository.setLastActiveUsername(account.username);
      set({
        initialized: true,
        mode: "ready",
        currentAccount: account,
        bootError: null,
      });
      await logDebug(
        "authStore",
        `login success; username=${account.username}; db=${account.dbKey}`,
      );
      return true;
    } catch (error) {
      await logDebug("authStore", `login failed with exception: ${toErrorMessage(error)}`);
      throw error;
    }
  },
  logout: async () => {
    await logDebug("authStore", "logout");
    await closeDatabase();
    await authRepository.setLastActiveUsername(null);
    set({
      mode: "login",
      currentAccount: null,
    });
  },
  createAccount: async (adminPassword, username, password) => {
    const bootstrap = await authRepository.getBootstrapState();
    const adminHash = await sha256(adminPassword);
    if (adminHash !== bootstrap.adminPasswordHash) {
      throw new Error("管理员密码不正确。");
    }

    const normalizedUsername = normalizeUsername(username);
    const existing = await authRepository.findAccountByUsername(normalizedUsername);
    if (existing) {
      throw new Error("账号已存在。");
    }

    await authRepository.createAccount(
      normalizedUsername,
      await sha256(password),
      dbKeyForUsername(normalizedUsername),
    );
    await get().refreshAccounts();
  },
  resetAccountPassword: async (adminPassword, username, newPassword) => {
    const bootstrap = await authRepository.getBootstrapState();
    const adminHash = await sha256(adminPassword);
    if (adminHash !== bootstrap.adminPasswordHash) {
      throw new Error("管理员密码不正确。");
    }

    const normalizedUsername = normalizeUsername(username);
    const existing = await authRepository.findAccountByUsername(normalizedUsername);
    if (!existing) {
      throw new Error("账号不存在。");
    }

    await authRepository.updateAccountPassword(
      normalizedUsername,
      await sha256(newPassword),
    );
    await get().refreshAccounts();
  },
  refreshAccounts: async () => {
    const bootstrap = await authRepository.getBootstrapState();
    set({
      accounts: bootstrap.accounts,
      adminConfigured: Boolean(bootstrap.adminPasswordHash),
    });
  },
  resetAuthData: async () => {
    await logDebug("authStore", "resetAuthData start");
    await closeDatabase();
    await authRepository.resetAll();
    set({
      initialized: true,
      mode: "setup",
      bootError: null,
      accounts: [],
      currentAccount: null,
      adminConfigured: false,
    });
    await logDebug("authStore", "resetAuthData complete");
  },
  failBoot: (message) =>
    set({
      initialized: true,
      mode: "setup",
      bootError: message,
    }),
}));
