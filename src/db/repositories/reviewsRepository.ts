import { readMobileDb, updateMobileDb } from "@/db/mobileStore";
import { getDatabase } from "@/db/client";
import {
  ReviewAggregateItem,
  ReviewAggregateRecord,
  ReviewRecord,
} from "@/types/entry";
import { isTauriRuntime } from "@/platform/runtime";

interface ReviewStatsRow {
  id: string;
  entryDate: string;
  sceneType: string;
  intensity: number;
  eventText: string;
  stoneTextSnapshot: string;
  selfJustification: string;
}

function toCountMap(items: string[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const label = item.trim() || "未指定";
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  return map;
}

function sortCountMap(map: Map<string, number>, limit = 5): ReviewAggregateItem[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

class TauriReviewsRepository {
  async listAll(): Promise<ReviewRecord[]> {
    const db = await getDatabase();
    return db.select<ReviewRecord[]>(
      `
        SELECT
          id,
          review_type AS reviewType,
          period_start AS periodStart,
          period_end AS periodEnd,
          total_entries AS totalEntries,
          top_stones_json AS topStonesJson,
          top_scenes_json AS topScenesJson,
          summary_text AS summaryText,
          commitment_text AS commitmentText,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM reviews
        ORDER BY period_end DESC
      `,
    );
  }

  async findByPeriod(
    reviewType: "weekly" | "monthly",
    periodStart: string,
    periodEnd: string,
  ): Promise<ReviewRecord | null> {
    const db = await getDatabase();
    const rows = await db.select<ReviewRecord[]>(
      `
        SELECT
          id,
          review_type AS reviewType,
          period_start AS periodStart,
          period_end AS periodEnd,
          total_entries AS totalEntries,
          top_stones_json AS topStonesJson,
          top_scenes_json AS topScenesJson,
          summary_text AS summaryText,
          commitment_text AS commitmentText,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM reviews
        WHERE review_type = ? AND period_start = ? AND period_end = ?
        LIMIT 1
      `,
      [reviewType, periodStart, periodEnd],
    );

    return rows[0] ?? null;
  }

  async getAggregate(
    periodStart: string,
    periodEnd: string,
  ): Promise<ReviewAggregateRecord> {
    const db = await getDatabase();
    const rows = await db.select<ReviewStatsRow[]>(
      `
        SELECT
          id,
          entry_date AS entryDate,
          scene_type AS sceneType,
          intensity,
          event_text AS eventText,
          stone_text_snapshot AS stoneTextSnapshot,
          self_justification AS selfJustification
        FROM entries
        WHERE status = 'completed'
          AND entry_date >= ?
          AND entry_date <= ?
        ORDER BY entry_date DESC
      `,
      [periodStart, periodEnd],
    );

    const stoneCounts = toCountMap(rows.map((row) => row.stoneTextSnapshot));
    const sceneCounts = toCountMap(rows.map((row) => row.sceneType));
    const intensityCounts = toCountMap(rows.map((row) => String(row.intensity)));

    return {
      totalEntries: rows.length,
      topStones: sortCountMap(stoneCounts),
      topScenes: sortCountMap(sceneCounts),
      intensityDistribution: sortCountMap(intensityCounts, 5),
      sampleEntries: rows.slice(0, 5),
    };
  }

  async saveReview(input: {
    reviewType: "weekly" | "monthly";
    periodStart: string;
    periodEnd: string;
    totalEntries: number;
    topStones: ReviewAggregateItem[];
    topScenes: ReviewAggregateItem[];
    summaryText: string;
    commitmentText: string;
  }): Promise<ReviewRecord> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await this.findByPeriod(
      input.reviewType,
      input.periodStart,
      input.periodEnd,
    );

    if (existing) {
      await db.execute(
        `
          UPDATE reviews
          SET
            total_entries = ?,
            top_stones_json = ?,
            top_scenes_json = ?,
            summary_text = ?,
            commitment_text = ?,
            updated_at = ?
          WHERE id = ?
        `,
        [
          input.totalEntries,
          JSON.stringify(input.topStones),
          JSON.stringify(input.topScenes),
          input.summaryText.trim(),
          input.commitmentText.trim(),
          now,
          existing.id,
        ],
      );

      return {
        ...existing,
        totalEntries: input.totalEntries,
        topStonesJson: JSON.stringify(input.topStones),
        topScenesJson: JSON.stringify(input.topScenes),
        summaryText: input.summaryText.trim(),
        commitmentText: input.commitmentText.trim(),
        updatedAt: now,
      };
    }

    const id = crypto.randomUUID();
    await db.execute(
      `
        INSERT INTO reviews (
          id,
          review_type,
          period_start,
          period_end,
          total_entries,
          top_stones_json,
          top_scenes_json,
          summary_text,
          commitment_text,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.reviewType,
        input.periodStart,
        input.periodEnd,
        input.totalEntries,
        JSON.stringify(input.topStones),
        JSON.stringify(input.topScenes),
        input.summaryText.trim(),
        input.commitmentText.trim(),
        now,
        now,
      ],
    );

    return {
      id,
      reviewType: input.reviewType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      totalEntries: input.totalEntries,
      topStonesJson: JSON.stringify(input.topStones),
      topScenesJson: JSON.stringify(input.topScenes),
      summaryText: input.summaryText.trim(),
      commitmentText: input.commitmentText.trim(),
      createdAt: now,
      updatedAt: now,
    };
  }
}

class MobileReviewsRepository {
  async listAll(): Promise<ReviewRecord[]> {
    return [...readMobileDb().reviews].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  }

  async findByPeriod(
    reviewType: "weekly" | "monthly",
    periodStart: string,
    periodEnd: string,
  ): Promise<ReviewRecord | null> {
    return (
      readMobileDb().reviews.find(
        (review) =>
          review.reviewType === reviewType &&
          review.periodStart === periodStart &&
          review.periodEnd === periodEnd,
      ) ?? null
    );
  }

  async getAggregate(
    periodStart: string,
    periodEnd: string,
  ): Promise<ReviewAggregateRecord> {
    const rows = readMobileDb()
      .entries.filter(
        (entry) =>
          entry.status === "completed" &&
          entry.entryDate >= periodStart &&
          entry.entryDate <= periodEnd,
      )
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .map((entry) => ({
        id: entry.id,
        entryDate: entry.entryDate,
        sceneType: entry.sceneType,
        intensity: entry.intensity,
        eventText: entry.eventText,
        stoneTextSnapshot: entry.stoneTextSnapshot,
        selfJustification: entry.selfJustification,
      }));

    const stoneCounts = toCountMap(rows.map((row) => row.stoneTextSnapshot));
    const sceneCounts = toCountMap(rows.map((row) => row.sceneType));
    const intensityCounts = toCountMap(rows.map((row) => String(row.intensity)));

    return {
      totalEntries: rows.length,
      topStones: sortCountMap(stoneCounts),
      topScenes: sortCountMap(sceneCounts),
      intensityDistribution: sortCountMap(intensityCounts, 5),
      sampleEntries: rows.slice(0, 5),
    };
  }

  async saveReview(input: {
    reviewType: "weekly" | "monthly";
    periodStart: string;
    periodEnd: string;
    totalEntries: number;
    topStones: ReviewAggregateItem[];
    topScenes: ReviewAggregateItem[];
    summaryText: string;
    commitmentText: string;
  }): Promise<ReviewRecord> {
    const now = new Date().toISOString();
    const existing = await this.findByPeriod(
      input.reviewType,
      input.periodStart,
      input.periodEnd,
    );

    const record: ReviewRecord = existing
      ? {
          ...existing,
          totalEntries: input.totalEntries,
          topStonesJson: JSON.stringify(input.topStones),
          topScenesJson: JSON.stringify(input.topScenes),
          summaryText: input.summaryText.trim(),
          commitmentText: input.commitmentText.trim(),
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          reviewType: input.reviewType,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          totalEntries: input.totalEntries,
          topStonesJson: JSON.stringify(input.topStones),
          topScenesJson: JSON.stringify(input.topScenes),
          summaryText: input.summaryText.trim(),
          commitmentText: input.commitmentText.trim(),
          createdAt: now,
          updatedAt: now,
        };

    updateMobileDb((current) => ({
      ...current,
      reviews: existing
        ? current.reviews.map((review) => (review.id === record.id ? record : review))
        : [...current.reviews, record],
    }));

    return record;
  }
}

class ReviewsRepository {
  private get backend() {
    return isTauriRuntime() ? tauriBackend : mobileBackend;
  }

  async listAll() {
    return this.backend.listAll();
  }

  async findByPeriod(
    reviewType: "weekly" | "monthly",
    periodStart: string,
    periodEnd: string,
  ) {
    return this.backend.findByPeriod(reviewType, periodStart, periodEnd);
  }

  async getAggregate(periodStart: string, periodEnd: string) {
    return this.backend.getAggregate(periodStart, periodEnd);
  }

  async saveReview(input: {
    reviewType: "weekly" | "monthly";
    periodStart: string;
    periodEnd: string;
    totalEntries: number;
    topStones: ReviewAggregateItem[];
    topScenes: ReviewAggregateItem[];
    summaryText: string;
    commitmentText: string;
  }) {
    return this.backend.saveReview(input);
  }

  async importMerge(review: ReviewRecord): Promise<"inserted" | "updated" | "skipped"> {
    const existing = await this.findByPeriod(
      review.reviewType,
      review.periodStart,
      review.periodEnd,
    );

    if (existing && new Date(existing.updatedAt).getTime() >= new Date(review.updatedAt).getTime()) {
      return "skipped";
    }

    await this.saveReview({
      reviewType: review.reviewType,
      periodStart: review.periodStart,
      periodEnd: review.periodEnd,
      totalEntries: review.totalEntries,
      topStones: JSON.parse(review.topStonesJson || "[]"),
      topScenes: JSON.parse(review.topScenesJson || "[]"),
      summaryText: review.summaryText,
      commitmentText: review.commitmentText,
    });

    return existing ? "updated" : "inserted";
  }
}

const tauriBackend = new TauriReviewsRepository();
const mobileBackend = new MobileReviewsRepository();

export const reviewsRepository = new ReviewsRepository();
