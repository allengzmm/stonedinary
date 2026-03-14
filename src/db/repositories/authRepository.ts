import { AccountRecord, AuthBootstrapState } from "@/types/auth";
import { logDebug } from "@/services/logger";

const AUTH_STORAGE_KEY = "stone-diary.auth-meta.v1";

interface AuthStorageShape {
  adminPasswordHash: string;
  accounts: AccountRecord[];
}

function getDefaultStorage(): AuthStorageShape {
  return {
    adminPasswordHash: "",
    accounts: [],
  };
}

function readStorage(): AuthStorageShape {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return getDefaultStorage();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthStorageShape>;
    return {
      adminPasswordHash: parsed.adminPasswordHash ?? "",
      accounts: parsed.accounts ?? [],
    };
  } catch (error) {
    console.error(error);
    return getDefaultStorage();
  }
}

function writeStorage(next: AuthStorageShape) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
}

export class AuthRepository {
  async migrate() {
    await logDebug("authRepository", "migrate start");
    const current = readStorage();
    writeStorage(current);
    await logDebug(
      "authRepository",
      `migrate complete; accounts=${current.accounts.length}; admin=${current.adminPasswordHash ? "set" : "empty"}`,
    );
  }

  async getBootstrapState(): Promise<AuthBootstrapState> {
    const state = readStorage();
    await logDebug(
      "authRepository",
      `bootstrap state loaded; accounts=${state.accounts.length}; admin=${state.adminPasswordHash ? "set" : "empty"}`,
    );
    return {
      adminPasswordHash: state.adminPasswordHash,
      accounts: [...state.accounts].sort((a, b) => a.username.localeCompare(b.username)),
    };
  }

  async listAccounts(): Promise<AccountRecord[]> {
    return (await this.getBootstrapState()).accounts;
  }

  async findAccountByUsername(username: string): Promise<AccountRecord | null> {
    const state = readStorage();
    return state.accounts.find((account) => account.username === username) ?? null;
  }

  async setAdminPasswordHash(passwordHash: string) {
    const state = readStorage();
    writeStorage({
      ...state,
      adminPasswordHash: passwordHash,
    });
  }

  async createAccount(username: string, passwordHash: string, dbKey: string) {
    const state = readStorage();
    const now = new Date().toISOString();
    const account = {
      id: crypto.randomUUID(),
      username,
      passwordHash,
      dbKey,
      createdAt: now,
      updatedAt: now,
    } satisfies AccountRecord;

    writeStorage({
      ...state,
      accounts: [...state.accounts, account],
    });
    await logDebug("authRepository", `account created: ${username}; db=${dbKey}`);

    return account;
  }

  async updateAccountPassword(username: string, passwordHash: string) {
    const state = readStorage();
    writeStorage({
      ...state,
      accounts: state.accounts.map((account) =>
        account.username === username
          ? {
              ...account,
              passwordHash,
              updatedAt: new Date().toISOString(),
            }
          : account,
        ),
    });
  }

  async resetAll() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    await logDebug("authRepository", "local auth storage cleared");
  }
}

export const authRepository = new AuthRepository();
