import { getDatabase } from "@/db/client";
import { StoneRecord, StoneUpdateInput } from "@/types/entry";
import { mapStoneRow } from "@/utils/entryMapper";

export class StonesRepository {
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

  async importMerge(stone: StoneRecord): Promise<"inserted" | "updated" | "skipped"> {
    const existing = await this.findByName(stone.name.trim());
    if (!existing) {
      const created = await this.findOrCreateByName(stone.name.trim());
      if (stone.description.trim() || stone.isArchived) {
        const db = await getDatabase();
        await db.execute(
          `
            UPDATE stones
            SET
              description = ?,
              is_archived = ?,
              updated_at = ?
            WHERE id = ?
          `,
          [
            stone.description.trim(),
            stone.isArchived ? 1 : 0,
            stone.updatedAt,
            created.id,
          ],
        );
      }
      return "inserted";
    }

    if (new Date(existing.updatedAt).getTime() >= new Date(stone.updatedAt).getTime()) {
      return "skipped";
    }

    const db = await getDatabase();
    await db.execute(
      `
        UPDATE stones
        SET
          description = ?,
          is_archived = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [stone.description.trim(), stone.isArchived ? 1 : 0, stone.updatedAt, existing.id],
    );
    return "updated";
  }
}

export const stonesRepository = new StonesRepository();
