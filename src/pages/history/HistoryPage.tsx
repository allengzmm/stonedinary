import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { entriesRepository } from "@/db/repositories/entriesRepository";
import { EntryRecord, EntryStatus } from "@/types/entry";
import { notifyEntriesChanged, subscribeEntriesChanged } from "@/utils/entryEvents";
import { getSceneLabel, SCENE_OPTIONS } from "@/utils/guides";

interface HistoryEditForm {
  sceneType: string;
  intensity: number;
  eventText: string;
  firstReaction: string;
  hiddenDesire: string;
  hiddenFear: string;
  selfJustification: string;
  stoneTextSnapshot: string;
  nextAction: string;
  customTags: string;
  status: EntryStatus;
}

function toCustomTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function HistoryPage() {
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sceneTypeFilter, setSceneTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EntryStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { register, reset, handleSubmit } = useForm<HistoryEditForm>({
    defaultValues: {
      sceneType: "work",
      intensity: 3,
      eventText: "",
      firstReaction: "",
      hiddenDesire: "",
      hiddenFear: "",
      selfJustification: "",
      stoneTextSnapshot: "",
      nextAction: "",
      customTags: "",
      status: "draft",
    },
  });

  useEffect(() => {
    async function loadEntries(preferredId?: string | null) {
      setIsLoading(true);
      const rows = await entriesRepository.listRecent();
      setEntries(rows);
      setSelectedId((current) => preferredId ?? current ?? rows[0]?.id ?? null);
      setIsLoading(false);
    }

    void loadEntries();
    return subscribeEntriesChanged(() => {
      void loadEntries(selectedId);
    });
  }, [selectedId]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          entry.eventText,
          entry.stoneTextSnapshot,
          entry.selfJustification,
          entry.nextAction,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesScene =
        sceneTypeFilter === "all" ? true : entry.sceneType === sceneTypeFilter;
      const matchesStatus =
        statusFilter === "all" ? true : entry.status === statusFilter;
      return matchesQuery && matchesScene && matchesStatus;
    });
  }, [entries, query, sceneTypeFilter, statusFilter]);

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ??
    filteredEntries[0] ??
    null;

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    reset({
      sceneType: selectedEntry.sceneType,
      intensity: selectedEntry.intensity,
      eventText: selectedEntry.eventText,
      firstReaction: selectedEntry.firstReaction,
      hiddenDesire: selectedEntry.hiddenDesire,
      hiddenFear: selectedEntry.hiddenFear,
      selfJustification: selectedEntry.selfJustification,
      stoneTextSnapshot: selectedEntry.stoneTextSnapshot,
      nextAction: selectedEntry.nextAction,
      customTags: selectedEntry.customTags.join(", "),
      status: selectedEntry.status,
    });
    setMessage(null);
  }, [reset, selectedEntry]);

  async function reloadEntries(preferredId?: string | null) {
    const rows = await entriesRepository.listRecent();
    setEntries(rows);
    setSelectedId(preferredId ?? rows[0]?.id ?? null);
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedEntry) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await entriesRepository.save({
        entryDate: selectedEntry.entryDate,
        sceneType: values.sceneType,
        intensity: values.intensity,
        eventText: values.eventText.trim(),
        firstReaction: values.firstReaction.trim(),
        hiddenDesire: values.hiddenDesire.trim(),
        hiddenFear: values.hiddenFear.trim(),
        selfJustification: values.selfJustification.trim(),
        stoneTextSnapshot: values.stoneTextSnapshot.trim(),
        nextAction: values.nextAction.trim(),
        customTags: toCustomTags(values.customTags),
        status: values.status,
      });
      await reloadEntries(selectedEntry.id);
      notifyEntriesChanged();
      setMessage("记录已保存。");
    } catch (error) {
      console.error(error);
      setMessage("保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  });

  async function handleDelete() {
    if (!selectedEntry || !window.confirm("确认删除这条记录？")) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await entriesRepository.deleteById(selectedEntry.id);
      await reloadEntries(null);
      notifyEntriesChanged();
      setMessage("记录已删除。");
    } catch (error) {
      console.error(error);
      setMessage("删除失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="history-grid">
      <section className="panel list-card">
        <h3>搜索与筛选</h3>
        <div className="toolbar">
          <input
            className="field-input"
            placeholder="搜索事件、石头或理由"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="field-select"
            value={sceneTypeFilter}
            onChange={(event) => setSceneTypeFilter(event.target.value)}
          >
            <option value="all">全部场景</option>
            {SCENE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="field-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | EntryStatus)
            }
          >
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="draft">草稿</option>
          </select>
        </div>
      </section>
      <div className="two-col">
        <section className="panel list-card">
          <h3>历史记录</h3>
          {isLoading ? <p className="muted">加载中...</p> : null}
          {!isLoading && filteredEntries.length === 0 ? (
            <p className="muted">还没有符合条件的记录。</p>
          ) : null}
          <div className="list">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="list-item"
                style={{
                  textAlign: "left",
                  borderColor:
                    entry.id === selectedEntry?.id
                      ? "rgba(113, 86, 63, 0.45)"
                      : undefined,
                }}
                onClick={() => setSelectedId(entry.id)}
              >
                <div className="list-row">
                  <span className="chip">{entry.entryDate}</span>
                  <span className="chip">{getSceneLabel(entry.sceneType)}</span>
                  <span className="chip">强度 {entry.intensity}</span>
                  <span className="chip">
                    {entry.status === "completed" ? "已完成" : "草稿"}
                  </span>
                </div>
                <p>{entry.eventText || "未填写事件"}</p>
                <p className="muted">石头：{entry.stoneTextSnapshot || "未指定"}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="panel detail-card">
          <h3>记录详情</h3>
          {!selectedEntry ? (
            <p className="muted">选择一条记录后可查看和编辑完整内容。</p>
          ) : (
            <form className="list" onSubmit={onSubmit}>
              <div className="list-row">
                <span className="chip">日期 {selectedEntry.entryDate}</span>
                <span className="chip">创建于 {selectedEntry.createdAt.slice(0, 10)}</span>
              </div>
              <div className="inline-grid">
                <div>
                  <label className="field-label" htmlFor="history-sceneType">
                    场景
                  </label>
                  <select
                    id="history-sceneType"
                    className="field-select"
                    {...register("sceneType")}
                  >
                    {SCENE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="history-intensity">
                    波动强度
                  </label>
                  <select
                    id="history-intensity"
                    className="field-select"
                    {...register("intensity", { valueAsNumber: true })}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="history-eventText">
                  事件
                </label>
                <textarea id="history-eventText" className="field-textarea compact" {...register("eventText")} />
              </div>
              <div>
                <label className="field-label" htmlFor="history-firstReaction">
                  第一反应
                </label>
                <textarea id="history-firstReaction" className="field-textarea compact" {...register("firstReaction")} />
              </div>
              <div>
                <label className="field-label" htmlFor="history-hiddenDesire">
                  想得到什么
                </label>
                <textarea id="history-hiddenDesire" className="field-textarea compact" {...register("hiddenDesire")} />
              </div>
              <div>
                <label className="field-label" htmlFor="history-hiddenFear">
                  害怕什么
                </label>
                <textarea id="history-hiddenFear" className="field-textarea compact" {...register("hiddenFear")} />
              </div>
              <div>
                <label className="field-label" htmlFor="history-selfJustification">
                  给自己的理由
                </label>
                <textarea id="history-selfJustification" className="field-textarea compact" {...register("selfJustification")} />
              </div>
              <div>
                <label className="field-label" htmlFor="history-stoneTextSnapshot">
                  石头
                </label>
                <input id="history-stoneTextSnapshot" className="field-input" {...register("stoneTextSnapshot")} />
              </div>
              <div>
                <label className="field-label" htmlFor="history-nextAction">
                  下次怎么选
                </label>
                <textarea id="history-nextAction" className="field-textarea compact" {...register("nextAction")} />
              </div>
              <div className="inline-grid">
                <div>
                  <label className="field-label" htmlFor="history-customTags">
                    标签
                  </label>
                  <input id="history-customTags" className="field-input" {...register("customTags")} />
                </div>
                <div>
                  <label className="field-label" htmlFor="history-status">
                    状态
                  </label>
                  <select id="history-status" className="field-select" {...register("status")}>
                    <option value="completed">已完成</option>
                    <option value="draft">草稿</option>
                  </select>
                </div>
              </div>
              {message ? (
                <p
                  className="muted"
                  style={{ color: message.includes("失败") ? "var(--danger)" : "var(--text-soft)" }}
                >
                  {message}
                </p>
              ) : null}
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={isSaving}
                  onClick={() => void handleDelete()}
                >
                  删除记录
                </button>
                <button type="submit" className="btn primary" disabled={isSaving}>
                  {isSaving ? "处理中..." : "保存修改"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
