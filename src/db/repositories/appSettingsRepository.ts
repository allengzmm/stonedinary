import { getDatabase } from "@/db/client";
import { AppSettingsRecord } from "@/types/entry";

interface AppSettingsRow {
  id: number;
  theme: string;
  autoSaveEnabled: boolean | number;
  showWritingHints: boolean | number;
  defaultExportPath: string;
  dbPath: string;
  updatedAt: string;
}

function mapSettings(row: AppSettingsRow): AppSettingsRecord {
  return {
    ...row,
    autoSaveEnabled: Boolean(row.autoSaveEnabled),
    showWritingHints: Boolean(row.showWritingHints),
  };
}

export class AppSettingsRepository {
  async get(): Promise<AppSettingsRecord> {
    const db = await getDatabase();
    const rows = await db.select<AppSettingsRow[]>(
      `
        SELECT
          id,
          theme,
          auto_save_enabled AS autoSaveEnabled,
          show_writing_hints AS showWritingHints,
          default_export_path AS defaultExportPath,
          db_path AS dbPath,
          updated_at AS updatedAt
        FROM app_settings
        WHERE id = 1
        LIMIT 1
      `,
    );

    return mapSettings(rows[0]);
  }
}

export const appSettingsRepository = new AppSettingsRepository();
