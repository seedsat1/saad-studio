interface ContextCardsProps {
  summary: {
    items: Array<{ id: string; source: string; title: string; tokensEstimate: number }>;
    tokenUsage: number;
    limit: number;
    compressionSummary: string;
    rankingSummary?: string[];
    categories?: {
      retrievedFiles: number;
      engineeringMemoryMatches: number;
      previousDecisions: number;
      failureMemories: number;
      successMemories: number;
      architectureReferences: number;
      dependencyReferences: number;
      attachmentReferences: number;
    };
  };
}

const cardStyle = {
  background: "rgba(255,255,255,0.02)",
  padding: "8px",
  borderRadius: "6px",
};

export function ContextCards({ summary }: ContextCardsProps) {
  const categories = summary.categories;
  const fallbackCount = (predicate: (item: ContextCardsProps["summary"]["items"][number]) => boolean) =>
    summary.items.filter(predicate).length;

  const cards = [
    ["Retrieved Files", categories?.retrievedFiles ?? fallbackCount((item) => item.source === "file")],
    ["Engineering Memory Matches", categories?.engineeringMemoryMatches ?? fallbackCount((item) => item.source === "memory")],
    ["Previous Decisions", categories?.previousDecisions ?? fallbackCount((item) => item.id.startsWith("memory:decision:"))],
    ["Previous Failures", categories?.failureMemories ?? fallbackCount((item) => item.id.startsWith("memory:failure:"))],
    ["Previous Successes", categories?.successMemories ?? fallbackCount((item) => item.id.startsWith("memory:success:"))],
    ["Architecture References", categories?.architectureReferences ?? fallbackCount((item) => item.id === "architecture-ref")],
    ["Dependency References", categories?.dependencyReferences ?? fallbackCount((item) => item.id === "dependency-ref")],
    ["Token Usage", `${summary.tokenUsage}/${summary.limit}`],
  ];

  return (
    <>
      <div className="context-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginBottom: "10px" }}>
        {cards.map(([label, value]) => (
          <div key={String(label)} className="context-card" style={cardStyle}>
            <strong>{label}</strong>
            <div>{value}</div>
          </div>
        ))}
        <div className="context-card" style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <strong>Context Compression Summary</strong>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{summary.compressionSummary}</div>
        </div>
      </div>
      {summary.rankingSummary && (
        <div style={{ marginBottom: "10px" }}>
          <span className="section-title">Ranking Examples</span>
          <div className="plan-items-grid" style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
            {summary.rankingSummary.slice(0, 4).map((line, idx) => (
              <div key={idx} className="context-item-row" style={{ background: "rgba(255,255,255,0.02)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
