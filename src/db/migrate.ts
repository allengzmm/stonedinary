import initialMigration from "@/db/migrations/001_initial.sql?raw";
import { getDatabase } from "@/db/client";

export async function runUserMigrations() {
  const db = await getDatabase();
  await db.execute(initialMigration);
}
