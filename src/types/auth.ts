export interface AccountRecord {
  id: string;
  username: string;
  passwordHash: string;
  dbKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthBootstrapState {
  adminPasswordHash: string;
  accounts: AccountRecord[];
}
