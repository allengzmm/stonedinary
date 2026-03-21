import { readMobileDb, updateMobileDb } from "@/db/mobileStore";
import { getDatabase } from "@/db/client";
import { StoneRecord, StoneUpdateInput } from "@/types/entry";
import { mapStoneRow } from "@/utils/entryMapper";
import { isTauriRuntime } from "@/platform/runtime";

class TauriStonesRepository {
  async listAll(): Promise<StoneRecord[]> {
    const db = await getDatabase();
    const rows = await db.select<StoneRecord[]>(
      `
        SELECT
          s.id,
          s.name,
          s.description,
          s.is_archived AS isArchived,
          s.created_at AS createdAt,
          s.updated_at AS updatedAt,
          COUNT(e.id) AS usageCount,
          MAX(e.entry_date) AS lastUsedAt
        FROM stones s
        LEFT JOIN entries e ON e.stone_id = s.id
        GROUP BY s.id
        ORDER BY usageCount DESC, s.updated_at DESC
      `,
    );

    return rows.map(mapStoneRow);
  }

  async listActive(): Promise<StoneRecord[]> {
    const db = await getDatabase();
    const rows = await db.select<StoneRecord[]>(
      `
        SELECT
          s.id,
          s.name,
          s.description,
          s.is_archived AS isArchived,
          s.created_at AS createdAt,
          s.updated_at AS updatedAt,
          COUNT(e.id) AS usageCount,
          MAX(e.entry_date) AS lastUsedAt
        FROM stones s
        LEFT JOIN entries e ON e.stone_id = s.id
        WHERE s.is_archived = 0
        GROUP BY s.id
        ORDER BY usageCount DESC, s.updated_at DESC
      `,
    );

    return rows.map(mapStoneRow);
  }

  async findByName(name: string): Promise<StoneRecord | null> {
    const db = await getDatabase();
    const rows = await db.select<StoneRecord[]>(
      `
        SELECT
          id,
          name,
          description,
          is_archived AS isArchived,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM stones
        WHERE name = ?
        LIMIT 1
      `,
      [name],
    );

    return rows[0] ? mapStoneRow(rows[0]) : null;
  }

  async findById(id: string): Promise<StoneRecord | null> {
    const db = await getDatabase();
    const rows = await db.select<StoneRecord[]>(
      `
        SELECT
          s.id,
          s.name,
          s.description,
          s.is_archived AS isArchived,
          s.created_at AS createdAt,
          s.updated_at AS updatedAt,
          COUNT(e.id) AS usageCount,
          MAX(e.entry_date) AS lastUsedAt
        FROM stones s
        LEFT JOIN entries e ON e.stone_id = s.id
        WHERE s.id = ?
        GROUP BY s.id
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ? mapStoneRow(rows[0]) : null;
  }

  async findOrCreateByName(name: string): Promise<StoneRecord> {
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db.execute(
      `
        INSERT INTO stones (
          id,
          name,
          description,
          is_archived,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 0, ?, ?)
      `,
      [id, name, "", now, now],
    );

    return {
      id,
      name,
      description: "",
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      lastUsedAt: null,
    };
  }

  async update(input: StoneUpdateInput): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `
        UPDATE stones
        SET
          name = ?,
          description = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [input.name.trim(), input.description.trim(), new Date().toISOString(), input.id],
    );
  }

  async archive(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `
        UPDATE stones
        SET
          is_archived = 1,
          updated_at = ?
        WHERE id = ?
      `,
      [new Date().toISOString(), id],
    );
  }
}

class MobileStonesRepository {
  private withUsage(stone: StoneRecord): StoneRecord {
    const normalizedStoneName = stone.name.trim().toLowerCase();
    const entries = readMobileDb().entries.filter((entry) => {
      if (entry.stoneId === stone.id) {
        return true;
      }

      // Fallback for legacy or partially merged records where the stone name
      // is consistent but the stored stoneId is stale or missing.
      return entry.stoneTextSnapshot.trim().toLowerCase() === normalizedStoneName;
    });
    const lastUsedAt = entries.length
      ? [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate))[0].entryDate
      : null;

    return {
      ...stone,
      usageCount: entries.length,
      lastUsedAt,
    };
  }

  async listAll(): Promise<StoneRecord[]> {
    return readMobileDb()
      .stones.map((stone) => this.withUsage(stone))
      .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0) || b.updatedAt.localeCompare(a.updatedAt));
  }

  async listActive(): Promise<StoneRecord[]> {
    return (await this.listAll()).filter((stone) => !stone.isArchived);
  }

  async findByName(name: string): Promise<StoneRecord | null> {
    const stone = readMobileDb().stones.find((item) => item.name === name) ?? null;
    return stone ? this.withUsage(stone) : null;
  }

  async findById(id: string): Promise<StoneRecord | null> {
    const stone = readMobileDb().stones.find((item) => item.id === id) ?? null;
    return stone ? this.withUsage(stone) : null;
  }

  async findOrCreateByName(name: string): Promise<StoneRecord> {
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const stone: StoneRecord = {
      id: crypto.randomUUID(),
      name,
      description: "",
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      lastUsedAt: null,
    };

    updateMobileDb((current) => ({
      ...current,
      stones: [...current.stones, stone],
    }));

    return stone;
  }

  async update(input: StoneUpdateInput): Promise<void> {
    updateMobileDb((current) => ({
      ...current,
      stones: current.stones.map((stone) =>
        stone.id === input.id
          ? {
              ...stone,
              name: input.name.trim(),
              description: input.description.trim(),
              updatedAt: new Date().toISOString(),
            }
          : stone,
      ),
    }));
  }

  async archive(id: string): Promise<void> {
    updateMobileDb((current) => ({
      ...current,
      stones: current.stones.map((stone) =>
        stone.id === id
          ? {
              ...stone,
              isArchived: true,
              updatedAt: new Date().toISOString(),
            }
          : stone,
      ),
    }));
  }
}

class StonesRepository {
  private get backend() {
    return isTauriRuntime() ? tauriBackend : mobileBackend;
  }

  async listAll() {
    return this.backend.listAll();
  }

  async listActive() {
    return this.backend.listActive();
  }

  async findByName(name: string) {
    return this.backend.findByName(name);
  }

  async findById(id: string) {
    return this.backend.findById(id);
  }

  async findOrCreateByName(name: string) {
    return this.backend.findOrCreateByName(name);
  }

  async update(input: StoneUpdateInput) {
    return this.backend.update(input);
  }

  async archive(id: string) {
    return this.backend.archive(id);
  }

  async importMerge(stone: StoneRecord): Promise<"inserted" | "updated" | "skipped"> {
    const existing = await this.findByName(stone.name.trim());
    if (!existing) {
      const created = await this.findOrCreateByName(stone.name.trim());
      if (stone.description.trim() || stone.isArchived) {
        await this.update({
          id: created.id,
          name: stone.name.trim(),
          description: stone.description.trim(),
        });
        if (stone.isArchived) {
          await this.archive(created.id);
        }
      }
      return "inserted";
    }

    if (new Date(existing.updatedAt).getTime() >= new Date(stone.updatedAt).getTime()) {
      return "skipped";
    }

    await this.update({
      id: existing.id,
      name: stone.name.trim(),
      description: stone.description.trim(),
    });
    if (stone.isArchived && !existing.isArchived) {
      await this.archive(existing.id);
    }
    return "updated";
  }
}

const tauriBackend = new TauriStonesRepository();
const mobileBackend = new MobileStonesRepository();

export const stonesRepository = new StonesRepository();
