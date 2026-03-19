import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { reviewsRepository } from "@/db/repositories/reviewsRepository";
import {
  ReviewAggregateRecord,
  ReviewAggregateItem,
  ReviewRecord,
} from "@/types/entry";
import { subscribeEntriesChanged } from "@/utils/entryEvents";
import { getSceneLabel } from "@/utils/guides";
import { getPeriodRange } from "@/utils/reviewPeriods";

interface ReviewEditorProps {
  reviewType: "weekly" | "monthly";
  title: string;
  description: string;
}

interface ReviewForm {
  summaryText: string;
  commitmentText: string;
}

const EMPTY_AGGREGATE: ReviewAggregateRecord = {
  totalEntries: 0,
  topStones: [],
  topScenes: [],
  intensityDistribution: [],
  sampleEntries: [],
};

function renderList(items: ReviewAggregateItem[], emptyText: string, scene = false) {
  if (items.length === 0) {
    return <div className="list-item">{emptyText}</div>;
  }

  return items.map((item) => (
    <div className="list-item" key={item.label}>
      {scene ? getSceneLabel(item.label) : item.label} · {item.count} 次
    </div>
  ));
}

function ReviewEditor({ reviewType, title, description }: ReviewEditorProps) {
  const [aggregate, setAggregate] = useState<ReviewAggregateRecord>(EMPTY_AGGREGATE);
  const [savedReview, setSavedReview] = useState<ReviewRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { start, end } = getPeriodRange(reviewType);

  const { register, reset, handleSubmit } = useForm<ReviewForm>({
    defaultValues: {
      summaryText: "",
      commitmentText: "",
    },
  });

  useEffect(() => {
    async function loadReview() {
      setIsLoading(true);
      const [stats, review] = await Promise.all([
        reviewsRepository.getAggregate(start, end),
        reviewsRepository.findByPeriod(reviewType, start, end),
      ]);

      setAggregate(stats);
      setSavedReview(review);
      reset({
        summaryText: review?.summaryText ?? "",
        commitmentText: review?.commitmentText ?? "",
      });
      setIsLoading(false);
    }

    void loadReview();
    return subscribeEntriesChanged(() => {
      void loadReview();
    });
  }, [end, reset, reviewType, start]);

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await reviewsRepository.saveReview({
        reviewType,
        periodStart: start,
        periodEnd: end,
        totalEntries: aggregate.totalEntries,
        topStones: aggregate.topStones,
        topScenes: aggregate.topScenes,
        summaryText: values.summaryText,
        commitmentText: values.commitmentText,
      });
      setSavedReview(saved);
      setMessage("复盘已保存。");
    } catch (error) {
      console.error(error);
      setMessage("保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <section className="panel review-card">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <p className="muted">统计区间：{start} 至 {end}</p>
      {isLoading ? <p className="muted">加载中...</p> : null}

      <div className="stats-row">
        <div className="metric">
          <strong>{aggregate.totalEntries}</strong>
          已完成记录
        </div>
        <div className="metric">
          <strong>{aggregate.topStones[0]?.label ?? "暂无"}</strong>
          高频石头
        </div>
        <div className="metric">
          <strong>
            {aggregate.topScenes[0] ? getSceneLabel(aggregate.topScenes[0].label) : "暂无"}
          </strong>
          高频场景
        </div>
      </div>

      <div className="list" style={{ marginTop: 16 }}>
        <div className="list-item"><strong>Top Stones</strong></div>
        {renderList(aggregate.topStones, "暂无石头统计")}
        <div className="list-item"><strong>Top Scenes</strong></div>
        {renderList(aggregate.topScenes, "暂无场景统计", true)}
        <div className="list-item"><strong>强度分布</strong></div>
        {renderList(aggregate.intensityDistribution, "暂无强度统计")}
        <div className="list-item"><strong>典型记录</strong></div>
        {aggregate.sampleEntries.length === 0 ? (
          <div className="list-item">暂无样本记录</div>
        ) : (
          aggregate.sampleEntries.map((entry) => (
            <div className="list-item" key={entry.id}>
              {entry.entryDate} · {entry.stoneTextSnapshot || "未指定石头"} · {entry.eventText}
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit}>
        <textarea
          className="field-textarea compact"
          placeholder="填写本阶段最重复的模式总结"
          style={{ marginTop: 16 }}
          {...register("summaryText")}
        />
        <textarea
          className="field-textarea compact"
          placeholder="填写下一阶段想盯防的石头或一个具体行动"
          style={{ marginTop: 16 }}
          {...register("commitmentText")}
        />
        {message ? (
          <p
            className="muted"
            style={{
              color: message.includes("失败") ? "var(--danger)" : "var(--text-soft)",
            }}
          >
            {message}
          </p>
        ) : null}
        {savedReview ? (
          <p className="muted">上次保存：{savedReview.updatedAt.slice(0, 16).replace("T", " ")}</p>
        ) : null}
        <div className="toolbar" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={isSaving || isLoading}>
            {isSaving ? "保存中..." : "保存复盘"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ReviewsPage() {
  return (
    <div className="reviews-grid two-col">
      <ReviewEditor
        reviewType="weekly"
        title="周复盘"
        description="自动统计最近 7 天已完成记录的高频模式。"
      />
      <ReviewEditor
        reviewType="monthly"
        title="月复盘"
        description="默认统计最近 30 天，以文字摘要为主。"
      />
    </div>
  );
}
