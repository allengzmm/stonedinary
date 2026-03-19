import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { entriesRepository } from "@/db/repositories/entriesRepository";
import { stonesRepository } from "@/db/repositories/stonesRepository";
import { EntryRecord, StoneRecord } from "@/types/entry";
import { notifyEntriesChanged, subscribeEntriesChanged } from "@/utils/entryEvents";
import { getSceneLabel } from "@/utils/guides";

interface StoneForm {
  name: string;
  description: string;
}

export function StonesPage() {
  const [stones, setStones] = useState<StoneRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [relatedEntries, setRelatedEntries] = useState<EntryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { register, reset, handleSubmit } = useForm<StoneForm>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function loadStones(preferredId?: string | null) {
    setIsLoading(true);
    const rows = await stonesRepository.listActive();
    setStones(rows);
    setSelectedId(preferredId ?? rows[0]?.id ?? null);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadStones();
    return subscribeEntriesChanged(() => {
      void loadStones(selectedId);
    });
  }, [selectedId]);

  const filteredStones = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return stones.filter((stone) =>
      !normalizedQuery
        ? true
        : `${stone.name} ${stone.description}`
            .toLowerCase()
            .includes(normalizedQuery),
    );
  }, [stones, query]);

  const selectedStone =
    filteredStones.find((stone) => stone.id === selectedId) ??
    filteredStones[0] ??
    null;

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!selectedStone) {
        reset({ name: "", description: "" });
        setRelatedEntries([]);
        return;
      }

      reset({
        name: selectedStone.name,
        description: selectedStone.description,
      });
      const rows = await entriesRepository.listByStoneId(selectedStone.id);
      if (active) {
        setRelatedEntries(rows);
      }
    }

    void loadDetail();
    return () => {
      active = false;
    };
  }, [reset, selectedStone]);

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedStone) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await stonesRepository.update({
        id: selectedStone.id,
        name: values.name,
        description: values.description,
      });
      await loadStones(selectedStone.id);
      notifyEntriesChanged();
      setMessage("石头已保存。");
    } catch (error) {
      console.error(error);
      setMessage("保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  });

  async function handleArchive() {
    if (!selectedStone || !window.confirm("确认归档这块石头？")) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await stonesRepository.archive(selectedStone.id);
      await loadStones(null);
      notifyEntriesChanged();
      setMessage("石头已归档。");
    } catch (error) {
      console.error(error);
      setMessage("归档失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="stones-grid two-col">
      <section className="panel stone-card">
        <h3>石头列表</h3>
        <div className="toolbar">
          <input
            className="field-input"
            placeholder="搜索石头名"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {isLoading ? <p className="muted">加载中...</p> : null}
        {!isLoading && filteredStones.length === 0 ? (
          <p className="muted">还没有石头数据。完成一篇记录后会自动沉淀。</p>
        ) : null}
        <div className="list" style={{ marginTop: 18 }}>
          {filteredStones.map((stone) => (
            <button
              className="list-item"
              style={{
                textAlign: "left",
                borderColor:
                  stone.id === selectedStone?.id
                    ? "rgba(113, 86, 63, 0.45)"
                    : undefined,
              }}
              key={stone.id}
              type="button"
              onClick={() => setSelectedId(stone.id)}
            >
              <div className="list-row">
                <strong>{stone.name}</strong>
                <span className="chip">{stone.usageCount ?? 0} 次</span>
              </div>
              <p className="muted">
                最近出现：{stone.lastUsedAt ?? "暂无关联记录"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="panel stone-card">
        <h3>石头详情</h3>
        {!selectedStone ? (
          <p className="muted">选择一块石头后可查看详情。</p>
        ) : (
          <form className="list" onSubmit={onSubmit}>
            <div>
              <label className="field-label" htmlFor="stone-name">石头名称</label>
              <input id="stone-name" className="field-input" {...register("name")} />
            </div>
            <div>
              <label className="field-label" htmlFor="stone-description">石头描述</label>
              <textarea
                id="stone-description"
                className="field-textarea compact"
                {...register("description")}
              />
            </div>
            <div className="stats-row">
              <div className="metric">
                <strong>{selectedStone.usageCount ?? 0}</strong>
                出现次数
              </div>
              <div className="metric">
                <strong>{selectedStone.lastUsedAt ?? "暂无"}</strong>
                最近出现时间
              </div>
            </div>
            <div className="list">
              <div className="list-item"><strong>关联日记</strong></div>
              {relatedEntries.length === 0 ? (
                <div className="list-item">暂无关联日记。</div>
              ) : (
                relatedEntries.map((entry) => (
                  <div className="list-item" key={entry.id}>
                    <div className="list-row">
                      <span className="chip">{entry.entryDate}</span>
                      <span className="chip">{getSceneLabel(entry.sceneType)}</span>
                      <span className="chip">强度 {entry.intensity}</span>
                    </div>
                    <p>{entry.eventText}</p>
                    <p className="muted">理由：{entry.selfJustification || "未填写"}</p>
                  </div>
                ))
              )}
            </div>
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
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn ghost"
                disabled={isSaving}
                onClick={() => void handleArchive()}
              >
                归档石头
              </button>
              <button type="submit" className="btn primary" disabled={isSaving}>
                {isSaving ? "处理中..." : "保存石头"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
