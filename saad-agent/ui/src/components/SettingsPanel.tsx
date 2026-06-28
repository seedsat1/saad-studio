import { useEffect, useState } from "react";

export function SettingsPanel({ isFocused }: { isFocused?: boolean }) {
  const [theme, setTheme] = useState("dark_glass");
  const [autoCheckpoint, setAutoCheckpoint] = useState(true);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isFocused) {
      setIsOpen(true);
      const el = document.getElementById("settings-panel-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [isFocused]);

  return (
    <div 
      id="settings-panel-section"
      className="settings-panel-container" 
      style={{ 
        margin: "10px 0", 
        background: isFocused ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.02)", 
        border: isFocused ? "1px solid var(--accent-blue)" : "1px solid rgba(255, 255, 255, 0.08)", 
        borderRadius: "8px", 
        padding: "10px",
        transition: "all 0.3s ease"
      }}
    >
      <div 
        className="settings-panel-header" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>⚙️</span>
          <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>Workspace & System Settings</span>
          {isFocused && <span className="card-badge badge-blue" style={{ fontSize: "10px" }}>Focused</span>}
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "11px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ color: "var(--text-secondary)", fontWeight: "600" }}>UI Theme Preference:</label>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              style={{ background: "rgba(0,0,0,0.4)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px" }}
            >
              <option value="dark_glass">Dark Glassmorphism (Default)</option>
              <option value="dark_sleek">Dark Sleek Modern</option>
              <option value="high_contrast">High Contrast Dark</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-primary)" }}>Auto-Checkpoint Before Patches:</span>
            <input 
              type="checkbox" 
              checked={autoCheckpoint} 
              onChange={(e) => setAutoCheckpoint(e.target.checked)} 
              style={{ cursor: "pointer" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Max Context Token Limit: {maxTokens}</label>
            <input 
              type="range" 
              min={2048} 
              max={16384} 
              step={1024} 
              value={maxTokens} 
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              style={{ cursor: "pointer" }}
            />
          </div>

          <div style={{ fontSize: "10px", color: "var(--accent-emerald)", background: "rgba(16, 185, 129, 0.1)", padding: "6px", borderRadius: "4px" }}>
            ✓ Settings synchronized locally in <code>.saad-agent/config.json</code>
          </div>
        </div>
      )}
    </div>
  );
}
