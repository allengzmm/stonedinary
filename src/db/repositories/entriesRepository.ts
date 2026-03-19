import { readMobileDb, updateMobileDb } from "@/db/mobileStore";
import { getDatabase } from "@/db/client";
import { EntryRecord, EntryUpsertInput } from "@/types/entry";
import { mapEntryRow } from "@/utils/entryMapper";
import { stonesRepository } from "@/db/repositories/stonesRepository";
import { isTauriRuntime } from "@/platform/runtime";

class TauriEntriesRepository {
  async listAll(): Promise<EntryRecord[]> {
    const db = await getDatabase();
    const rows = await db.select<EntryRecord[]>(
      `
        SELECT
          id,
          entry_date AS entryDate,
          scene_type AS sceneType,
          intensity,
          event_text AS eventText,
          first_reaction AS firstReaction,
          hidden_desire AS hiddenDesire,
          hidden_fear AS hiddenFear,
          self_justification AS selfJustification,
          stone_id AS stoneId,
          stone_text_snapshot AS stoneTextSnapshot,
          next_action AS nextAction,
          custom_tags_json AS customTags,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM entries
        ORDER BY entry_date DESC
      `,
    );

    return rows.map(mapEntryRow);
  }

  async listRecent(limit = 50): Promise<EntryRecord[]> {
    const db = await getDatabase();
    const rows = await db.select<EntryRecord[]>(
      `
        SELECT
          id,
          entry_date AS entryDate,
          scene_type AS sceneType,
          intensity,
          event_text AS eventText,
          first_reaction AS firstReaction,
          hidden_desire AS hiddenDesire,
          hidden_fear AS hiddenFear,
          self_justification AS selfJustification,
          stone_id AS stoneId,
          stone_text_snapshot AS stoneTextSnapshot,
          next_action AS nextAction,
          custom_tags_json AS customTags,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM entries
        ORDER BY entry_date DESC
        LIMIT ?
      `,
      [limit],
    );

    return rows.map(mapEntryRow);
  }

  async findByDate(entryDate: string): Promise<EntryRecord | null> {
    const db = await getDatabase();
    const rows = await db.select<EntryRecord[]>(
      `
        SELECT
          id,
          entry_date AS entryDate,
          scene_type AS sceneType,
          intensity,
          event_text AS eventText,
          first_reaction AS firstReaction,
          hidden_desire AS hiddenDesire,
          hidden_fear AS hiddenFear,
          self_justification AS selfJustification,
          stone_id AS stoneId,
          stone_text_snapshot AS stoneTextSnapshot,
          next_action AS nextAction,
          custom_tags_json AS customTags,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM entries
        WHERE entry_date = ?
        LIMIT 1
      `,
      [entryDate],
    );

    return rows[0] ? mapEntryRow(rows[0]) : null;
  }

  async listByStoneId(stoneId: string): Promise<EntryRecord[]> {
    const db = await getDatabase();
    const rows = await db.select<EntryRecord[]>(
      `
        SELECT
          id,
          entry_date AS entryDate,
          scene_type AS sceneType,
          intensity,
          event_text AS eventText,
          first_reaction AS firstReaction,
          hidden_desire AS hiddenDesire,
          hidden_fear AS hiddenFear,
          self_justification AS selfJustification,
          stone_id AS stoneId,
          stone_text_snapshot AS stoneTextSnapshot,
          next_action AS nextAction,
          custom_tags_json AS customTags,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM entries
        WHERE stone_id = ?
        ORDER BY entry_date DESC
      `,
      [stoneId],
    );

    return rows.map(mapEntryRow);
  }

  async save(input: EntryUpsertInput): Promise<EntryRecord> {
    const db = await getDatabase();
    const existing = await this.findByDate(input.entryDate);
    const trimmedStone = input.stoneTextSnapshot.trim();
    const stone = trimmedStone
      ? await stonesRepository.findOrCreateByName(trimmedStone)
      : null;
    const now = new Date().toISOString();
    const customTagsJson = JSON.stringify(input.customTags);

    if (existing) {
      await db.execute(
        `
          UPDATE entries
          SET
            scene_type = ?,
            intensity = ?,
            event_text = ?,
            first_reaction = ?,
            hidden_desire = ?,
            hidden_fear = ?,
            self_justification = ?,
            stone_id = ?,
            stone_text_snapshot = ?,
            next_action = ?,
            custom_tags_json = ?,
            status = ?,
            updated_at = ?
          WHERE entry_date = ?
        `,
        [
          input.sceneType,
          input.intensity,
          input.eventText,
          input.firstReaction,
          input.hiddenDesire,
          input.hiddenFear,
          input.selfJustification,
          stone?.id ?? null,
          trimmedStone,
          input.nextAction,
          customTagsJson,
          input.status,
          now,
          input.entryDate,
        ],
      );

      return {
        ...existing,
        ...input,
        stoneId: stone?.id ?? null,
        stoneTextSnapshot: trimmedStone,
        customTags: input.customTags,
        updatedAt: now,
      };
    }

    const id = crypto.randomUUID();
    await db.execute(
      `
        INSERT INTO entries (
          id,
          entry_date,
          scene_type,
          intensity,
          event_text,
          first_reaction,
          hidden_desire,
          hidden_fear,
          self_justification,
          stone_id,
          stone_text_snapshot,
          next_action,
          custom_tags_json,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.entryDate,
        input.sceneType,
        input.intensity,
        input.eventText,
        input.firstReaction,
        input.hiddenDesire,
        input.hiddenFear,
        input.selfJustification,
        stone?.id ?? null,
        trimmedStone,
        input.nextAction,
        customTagsJson,
        input.status,
        now,
        now,
      ],
    );

    return {
      id,
      ...input,
      stoneId: stone?.id ?? null,
      stoneTextSnapshot: trimmedStone,
      customTags: input.customTags,
      createdAt: now,
      updatedAt: now,
    };
  }

  async deleteById(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM entries WHERE id = ?`, [id]);
  }
}

class MobileEntriesRepository {
  async listAll(): Promise<EntryRecord[]> {
    return [...readMobileDb().entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }

  async listRecent(limit = 50): Promise<EntryRecord[]> {
    return (await this.listAll()).slice(0, limit);
  }

  async findByDate(entryDate: string): Promise<EntryRecord | null> {
    return readMobileDb().entries.find((entry) => entry.entryDate === entryDate) ?? null;
  }

  async listByStoneId(stoneId: string): Promise<EntryRecord[]> {
    return readMobileDb()
      .entries.filter((entry) => entry.stoneId === stoneId)
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }

  async save(input: EntryUpsertInput): Promise<EntryRecord> {
    const existing = await this.findByDate(input.entryDate);
    const trimmedStone = input.stoneTextSnapshot.trim();
    const stone = trimmedStone
      ? await stonesRepository.findOrCreateByName(trimmedStone)
      : null;
    const now = new Date().toISOString();

    const record: EntryRecord = existing
      ? {
          ...existing,
          ...input,
          stoneId: stone?.id ?? null,
          stoneTextSnapshot: trimmedStone,
          customTags: input.customTags,
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          ...input,
          stoneId: stone?.id ?? null,
          stoneTextSnapshot: trimmedStone,
          customTags: input.customTags,
          createdAt: now,
          updatedAt: now,
        };

    updateMobileDb((current) => ({
      ...current,
      entries: existing
        ? current.entries.map((entry) => (entry.entryDate === record.entryDate ? record : entry))
        : [...current.entries, record],
    }));

    return record;
  }

  async deleteById(id: string): Promise<void> {
    updateMobileDb((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
  }
}

class EntriesRepository {
  private get backend() {
    return isTauriRuntime() ? tauriBackend : mobileBackend;
  }

  async listAll() {
    return this.backend.listAll();
  }

  async listRecent(limit = 50) {
    return this.backend.listRecent(limit);
  }

  async findByDate(entryDate: string) {
    return this.backend.findByDate(entryDate);
  }

  async listByStoneId(stoneId: string) {
    return this.backend.listByStoneId(stoneId);
  }

  async save(input: EntryUpsertInput) {
    return this.backend.save(input);
  }

  async deleteById(id: string) {
    return this.backend.deleteById(id);
  }

  async importMerge(entry: EntryRecord): Promise<"inserted" | "updated" | "skipped"> {
    const existing = await this.findByDate(entry.entryDate);
    if (existing && new Date(existing.updatedAt).getTime() >= new Date(entry.updatedAt).getTime()) {
      return "skipped";
    }

    await this.save({
      entryDate: entry.entryDate,
      sceneType: entry.sceneType,
      intensity: entry.intensity,
      eventText: entry.eventText,
      firstReaction: entry.firstReaction,
      hiddenDesire: entry.hiddenDesire,
      hiddenFear: entry.hiddenFear,
      selfJustification: entry.selfJustification,
      stoneTextSnapshot: entry.stoneTextSnapshot,
      nextAction: entry.nextAction,
      customTags: entry.customTags,
      status: entry.status,
    });

    return existing ? "updated" : "inserted";
  }
}

const tauriBackend = new TauriEntriesRepository();
const mobileBackend = new MobileEntriesRepository();

export const entriesRepository = new EntriesRepository();
