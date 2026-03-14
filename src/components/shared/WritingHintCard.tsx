import { WritingGuide } from "@/types/writing";

export function WritingHintCard({ guide }: { guide: WritingGuide }) {
  return (
    <section className="panel hint-card">
      <h3>{guide.title}</h3>
      <p>{guide.principle}</p>
      <p className="muted">引导问题</p>
      <ul>
        {guide.prompts.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
      <p className="muted">正确示例</p>
      <ul>
        {guide.examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
      {guide.mistakes?.length ? (
        <>
          <p className="muted">常见错误</p>
          <ul>
            {guide.mistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="muted">字数建议：{guide.wordLimit}</p>
    </section>
  );
}
