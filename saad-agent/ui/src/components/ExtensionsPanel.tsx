import { useEffect, useState } from "react";

export function ExtensionsPanel() {
  const [extensions, setExtensions] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ext" | "mcp">("ext");

  const loadData = () => {
    if ((window as any).electronAPI) {
      if ((window as any).electronAPI.getExtensions) {
        (window as any).electronAPI.getExtensions().then((res: any) => {
          if (res && res.success) setExtensions(res.extensions || []);
        });
      }
      if ((window as any).electronAPI.discoverMCPServers) {
        (window as any).electronAPI.discoverMCPServers().then((res: any) => {
          if (res && res.success) {
            setMcpServers(res.servers || []);
            setMcpTools(res.tools || []);
          }
        });
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    if ((window as any).electronAPI && (window as any).electronAPI.toggleExtension) {
      const res = await (window as any).electronAPI.toggleExtension(id, !currentEnabled);
      if (res && res.success) {
        loadData();
      }
    }
  };

  return (
    <div className="extensions-panel-container" style={{ margin: "10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "10px" }}>
      <div 
        className="extensions-panel-header" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>🧩</span>
          <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>Agent SDK & MCP Ecosystem</span>
          <span className="card-badge badge-blue" style={{ fontSize: "10px" }}>Extensible</span>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
            <button className={`panel-tab ${activeTab === "ext" ? "active" : ""}`} style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => setActiveTab("ext")}>
              🔌 Installed Extensions ({extensions.length})
            </button>
            <button className={`panel-tab ${activeTab === "mcp" ? "active" : ""}`} style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => setActiveTab("mcp")}>
              🌐 MCP Servers ({mcpServers.length})
            </button>
          </div>

          {activeTab === "ext" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {extensions.length === 0 ? (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>No custom extensions loaded.</span>
              ) : (
                extensions.map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px", fontSize: "11px" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{e.name} <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>v{e.version}</span></div>
                      <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Type: {e.type} • Author: {e.author}</div>
                    </div>
                    <button 
                      style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", border: "none", cursor: "pointer", background: e.enabled ? "var(--accent-emerald)" : "rgba(255,255,255,0.1)", color: "#fff" }}
                      onClick={() => handleToggle(e.id, e.enabled)}
                    >
                      {e.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "mcp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}>
              <div style={{ fontWeight: "600", color: "var(--accent-blue)" }}>Discovered MCP Servers:</div>
              {mcpServers.map((s) => (
                <div key={s.id} style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{s.name}</strong>
                    <span className="card-badge badge-emerald" style={{ fontSize: "9px" }}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "2px" }}>Transport: {s.transport} • v{s.version}</div>
                </div>
              ))}
              <div style={{ fontWeight: "600", color: "var(--accent-orange)", marginTop: "4px" }}>Discovered MCP Tools ({mcpTools.length}):</div>
              {mcpTools.map((t) => (
                <div key={t.id} style={{ fontSize: "10px", color: "var(--text-secondary)", paddingLeft: "6px" }}>
                  • <strong>{t.name}</strong>: {t.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
