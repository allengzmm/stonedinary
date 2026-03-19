import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { entriesRepository } from "@/db/repositories/entriesRepository";
import { ValidationHint } from "@/components/shared/ValidationHint";
import { WritingHintCard } from "@/components/shared/WritingHintCard";
import { useEntryDraftStore } from "@/stores/entryDraftStore";
import { EntryStatus, EntryUpsertInput } from "@/types/entry";
import { notifyEntriesChanged } from "@/utils/entryEvents";
import { SCENE_OPTIONS, WRITING_GUIDES } from "@/utils/guides";
import {
  detectAbstractHint,
  detectEventHint,
  detectNextActionHint,
} from "@/utils/validation";

const STEP_FIELDS = [
  "eventText",
  "firstReaction",
  "hiddenDesire",
  "hiddenFear",
  "selfJustification",
  "stoneTextSnapshot",
  "nextAction",
] as const;

interface EntryDraftForm {
  entryDate: string;
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
}

const EMPTY_FORM: Omit<EntryDraftForm, "entryDate"> = {
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
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function toCustomTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toPersistedInput(
  values: EntryDraftForm,
  status: EntryStatus,
): EntryUpsertInput {
  return {
    entryDate: values.entryDate,
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
    status,
  };
}

export function EntryWizard() {
  const currentStep = useEntryDraftStore((state) => state.currentStep);
  const setCurrentStep = useEntryDraftStore((state) => state.setCurrentStep);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadedEntryStatus, setLoadedEntryStatus] = useState<EntryStatus | null>(
    null,
  );

  const {
    register,
    watch,
    trigger,
    reset,
    getValues,
    formState: { errors },
  } = useForm<EntryDraftForm>({
    mode: "onChange",
    defaultValues: {
      entryDate: todayString(),
      ...EMPTY_FORM,
    },
  });

  const values = watch();
  const currentField = STEP_FIELDS[currentStep];
  const currentGuide = WRITING_GUIDES[currentStep];

  useEffect(() => {
    let active = true;

    async function loadEntryByDate() {
      setIsLoading(true);
      setSaveMessage(null);

      const existingEntry = await entriesRepository.findByDate(values.entryDate);
      if (!active) {
        return;
      }

      if (existingEntry) {
        reset({
          entryDate: existingEntry.entryDate,
          sceneType: existingEntry.sceneType,
          intensity: existingEntry.intensity,
          eventText: existingEntry.eventText,
          firstReaction: existingEntry.firstReaction,
          hiddenDesire: existingEntry.hiddenDesire,
          hiddenFear: existingEntry.hiddenFear,
          selfJustification: existingEntry.selfJustification,
          stoneTextSnapshot: existingEntry.stoneTextSnapshot,
          nextAction: existingEntry.nextAction,
          customTags: existingEntry.customTags.join(", "),
        });
        setLoadedEntryStatus(existingEntry.status);
      } else {
        reset({
          entryDate: values.entryDate,
          ...EMPTY_FORM,
        });
        setLoadedEntryStatus(null);
      }

      setIsLoading(false);
    }

    void loadEntryByDate();
    return () => {
      active = false;
    };
  }, [reset, values.entryDate]);

  const hintMessage = useMemo(() => {
    if (currentField === "eventText") {
      return detectEventHint(values.eventText);
    }
    if (currentField === "nextAction") {
      return detectNextActionHint(values.nextAction);
    }
    if (
      currentField === "hiddenDesire" ||
      currentField === "hiddenFear" ||
      currentField === "selfJustification"
    ) {
      return detectAbstractHint(values[currentField]);
    }
    return null;
  }, [currentField, values]);

  async function goNext() {
    const valid = await trigger(currentField);
    if (valid && currentStep < STEP_FIELDS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function persist(status: EntryStatus) {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      if (status === "completed") {
        const valid = await trigger();
        if (!valid) {
          setSaveMessage("还有未完成的层级，无法标记为已完成。");
          return;
        }
      }

      const payload = toPersistedInput(getValues(), status);
      const savedEntry = await entriesRepository.save(payload);
      setLoadedEntryStatus(savedEntry.status);
      setSaveMessage(
        status === "draft"
          ? `草稿已保存：${savedEntry.entryDate}`
          : `今日记录已完成：${savedEntry.entryDate}`,
      );
      notifyEntriesChanged();
    } catch (error) {
      console.error(error);
      setSaveMessage("保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="today-grid">
      <aside className="panel step-list">
        <h3>七层结构</h3>
        <div className="list">
          {WRITING_GUIDES.map((guide, index) => (
            <button
              type="button"
              key={guide.title}
              className={`step-item${index === currentStep ? " active" : ""}`}
              onClick={() => setCurrentStep(index)}
            >
              {index + 1}. {guide.title}
            </button>
          ))}
        </div>
      </aside>

      <section className="panel editor-card">
        <h3>今日记录</h3>
        <p className="muted">
          {loadedEntryStatus
            ? `当前日期已有${loadedEntryStatus === "completed" ? "已完成记录" : "草稿"}`
            : "当前日期尚无记录"}
        </p>

        <div className="inline-grid">
          <div>
            <label className="field-label" htmlFor="entryDate">
              日期
            </label>
            <input
              id="entryDate"
              className="field-input"
              type="date"
              {...register("entryDate", { required: true })}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="sceneType">
              场景
            </label>
            <select
              id="sceneType"
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
        </div>

        <div className="inline-grid" style={{ marginTop: 16 }}>
          <div>
            <label className="field-label" htmlFor="intensity">
              波动强度
            </label>
            <select
              id="intensity"
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
          <div>
            <label className="field-label" htmlFor="customTags">
              标签
            </label>
            <input
              id="customTags"
              className="field-input"
              placeholder="例如：冲突, 面子"
              {...register("customTags")}
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <label className="field-label" htmlFor={currentField}>
            {currentGuide.title}
          </label>
          <textarea
            id={currentField}
            className="field-textarea"
            disabled={isLoading}
            {...register(currentField, { required: "这一层不能为空。" })}
          />
          <ValidationHint message={hintMessage} />
          {errors[currentField] ? (
            <p style={{ color: "var(--danger)" }}>
              {errors[currentField]?.message}
            </p>
          ) : null}
          {saveMessage ? (
            <p
              className="muted"
              style={{
                marginTop: 12,
                color: saveMessage.includes("失败")
                  ? "var(--danger)"
                  : "var(--text-soft)",
              }}
            >
              {saveMessage}
            </p>
          ) : null}
        </div>

        <div className="footer-actions">
          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={goPrev}>
              上一步
            </button>
            <button type="button" className="btn" onClick={goNext}>
              下一步
            </button>
          </div>
          <div className="toolbar">
            <button
              type="button"
              className="btn"
              disabled={isSaving || isLoading}
              onClick={() => void persist("draft")}
            >
              {isSaving ? "保存中..." : "保存草稿"}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={isSaving || isLoading}
              onClick={() => void persist("completed")}
            >
              {isSaving ? "保存中..." : "完成今日记录"}
            </button>
          </div>
        </div>
      </section>

      <WritingHintCard guide={currentGuide} />
    </div>
  );
}
