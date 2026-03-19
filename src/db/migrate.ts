import initialMigration from "@/db/migrations/001_initial.sql?raw";
import { getDatabase } from "@/db/client";
import { ensureMobileDb } from "@/db/mobileStore";
import { isTauriRuntime } from "@/platform/runtime";

export async function runUserMigrations() {
  if (!isTauriRuntime()) {
    ensureMobileDb();
    return;
  }

  const db = await getDatabase();
  await db.execute(initialMigration);
}
