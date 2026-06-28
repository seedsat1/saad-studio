import { useEffect, useState } from "react";

export interface SkillItem {
  id: string;
  name: string;
  domain: string;
  description: string;
  recommendedTools: string[];
}

export interface SkillMatchItem {
  skill: SkillItem;
  confidence: number;
  activationReason: string;
}

interface SkillsPanelProps {
  currentQuery?: string;
  affectedFiles?: string[];
}

export function SkillsPanel({ currentQuery = "", affectedFiles = [] }: SkillsPanelProps) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [activeMatches, setActiveMatches] = useState<SkillMatchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if ((window as any).electronAPI && (window as any).electronAPI.getAvailableSkills) {
      (window as any).electronAPI.getAvailableSkills().then((res: any) => {
        if (res && res.success) {
          setSkills(res.skills || []);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (currentQuery && (window as any).electronAPI && (window as any).electronAPI.matchActiveSkills) {
      (window as any).electronAPI.matchActiveSkills(currentQuery, affectedFiles).then((res: any) => {
        if (res && res.success) {
          setActiveMatches(res.matches || []);
        }
      });
    } else {
      setActiveMatches([]);
    }
  }, [currentQuery, affectedFiles]);

  return (
    <div className="skills-panel-container" style={{ margin: "10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "10px" }}>
      <div 
        className="skills-panel-header" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>🎯</span>
          <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>Engineering Domain Skills</span>
          <span className="card-badge badge-blue" style={{ fontSize: "10px" }}>{skills.length || 12} Registered</span>
          {activeMatches.length > 0 && (
            <span className="card-badge badge-emerald" style={{ fontSize: "10px" }}>⚡ {activeMatches.length} Active</span>
          )}
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeMatches.length > 0 && (
            <div style={{ background: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "6px", padding: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent-emerald)", display: "block", marginBottom: "6px" }}>
                Active Matched Skills for Current Task
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {activeMatches.map((m) => (
                  <div key={m.skill.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: "4px" }}>
                    <div>
                      <strong style={{ color: "var(--text-primary)" }}>{m.skill.name}</strong>
                      <span style={{ color: "var(--text-secondary)", marginLeft: "6px" }}>({m.skill.domain})</span>
                    </div>
                    <span className="card-badge badge-cyan" style={{ fontSize: "9px" }}>{m.confidence}% Confidence</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
            <strong>Registered Expertise Packages:</strong>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(skills.length > 0 ? skills : [
              { id: "skill-typescript", name: "TypeScript" },
              { id: "skill-react", name: "React" },
              { id: "skill-nextjs", name: "Next.js" },
              { id: "skill-electron", name: "Electron" },
              { id: "skill-python", name: "Python" },
              { id: "skill-ffmpeg", name: "FFmpeg" },
              { id: "skill-supabase", name: "Supabase" },
              { id: "skill-backblaze-b2", name: "Backblaze B2" },
              { id: "skill-vercel", name: "Vercel" },
              { id: "skill-creative-design", name: "Creative Design" },
              { id: "skill-prompt-engineering", name: "Prompt Engineering" },
              { id: "skill-adobe-premiere-cep", name: "Adobe Premiere CEP" }
            ]).map((sk: any) => (
              <span key={sk.id} className="plan-item-tag tool-tag" style={{ fontSize: "10px" }}>
                📦 {sk.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
