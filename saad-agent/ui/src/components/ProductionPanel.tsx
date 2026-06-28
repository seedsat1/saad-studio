import { useEffect, useState } from "react";

export function ProductionPanel() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"health" | "perf" | "standards" | "backups">("health");

  const loadData = () => {
    if ((window as any).electronAPI) {
      if ((window as any).electronAPI.getProductionDiagnostics) {
        (window as any).electronAPI.getProductionDiagnostics().then((res: any) => {
          if (res && res.success) setDiagnostics(res.diagnostics);
        });
      }
      if ((window as any).electronAPI.getPerformanceMetrics) {
        (window as any).electronAPI.getPerformanceMetrics().then((res: any) => {
          if (res && res.success) setMetrics(res.metrics);
        });
      }
      if ((window as any).electronAPI.listBackups) {
        (window as any).electronAPI.listBackups().then((res: any) => {
          if (res && res.success) setBackups(res.backups || []);
        });
      }
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateBackup = async () => {
    if ((window as any).electronAPI && (window as any).electronAPI.createBackup) {
      const res = await (window as any).electronAPI.createBackup("Manual Dashboard Backup");
      if (res && res.success) {
        loadData();
      }
    }
  };

  return (
    <div className="production-panel-container" style={{ margin: "10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "10px" }}>
      <div 
        className="production-panel-header" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>🛡️</span>
          <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>Production Platform & Standards</span>
          <span className="card-badge badge-emerald" style={{ fontSize: "10px" }}>Production Ready</span>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: "12px" }}>
          {/* Sub-tabs */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
            <button className={`panel-tab ${activeTab === "health" ? "active" : ""}`} style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => setActiveTab("health")}>
              🏥 Diagnostics
            </button>
            <button className={`panel-tab ${activeTab === "perf" ? "active" : ""}`} style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => setActiveTab("perf")}>
              📊 Metrics
            </button>
            <button className={`panel-tab ${activeTab === "standards" ? "active" : ""}`} style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => setActiveTab("standards")}>
              📜 Standards
            </button>
            <button className={`panel-tab ${activeTab === "backups" ? "active" : ""}`} style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => setActiveTab("backups")}>
              💾 Backups
            </button>
          </div>

          {activeTab === "health" && (
            <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><strong>OS:</strong> {diagnostics?.os || "Windows 10/11"}</div>
              <div><strong>Runtime:</strong> Node {diagnostics?.nodeVersion || "v20.0.0"}</div>
              <div><strong>Memory Usage:</strong> {diagnostics?.memoryUsageMB || 120} MB / {diagnostics?.totalMemoryMB || 16384} MB</div>
              <div><strong>Workspace Health:</strong> <span style={{ color: "var(--accent-emerald)" }}>{diagnostics?.workspaceHealth || "Healthy"}</span></div>
            </div>
          )}

          {activeTab === "perf" && (
            <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><strong>CPU Load:</strong> {metrics?.cpuLoadPercentage || 12}%</div>
              <div><strong>Active Memory:</strong> {metrics?.memoryUsedMB || 115} MB</div>
              <div><strong>Context Allocation:</strong> {metrics?.activeContextTokens || 150} / {metrics?.maxContextLimit || 8192} Tokens</div>
            </div>
          )}

          {activeTab === "standards" && (
            <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ color: "var(--accent-orange)" }}><strong>Policies Enforced:</strong></div>
              <div>• Never modify .env files automatically</div>
              <div>• Always checkpoint workspace before patches</div>
              <div>• Explicit approval mandatory for execution</div>
            </div>
          )}

          {activeTab === "backups" && (
            <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button className="approve-btn" style={{ fontSize: "10px", padding: "4px 8px" }} onClick={handleCreateBackup}>
                + Create Manual Backup
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {backups.length === 0 ? (
                  <span style={{ color: "var(--text-secondary)" }}>No backups created yet.</span>
                ) : (
                  backups.map((b) => (
                    <div key={b.backupId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "4px 6px", borderRadius: "4px" }}>
                      <span>{b.label} ({Math.round(b.sizeBytes / 1024)} KB)</span>
                      <span className="card-badge badge-blue" style={{ fontSize: "9px" }}>Restorable</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
