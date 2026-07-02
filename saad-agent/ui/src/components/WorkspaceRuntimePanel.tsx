import { useEffect, useState } from "react";

interface TrustedWorkspace {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastOpened: string;
}

interface WorkspaceSearchResult {
  type: "file" | "content";
  path: string;
  relativePath: string;
  line?: number;
  preview?: string;
  score: number;
}

const safeCommands = [
  "npm run build",
  "npm run typecheck",
  "npm run lint",
  "npm test",
  "git status",
  "git diff"
];

export function WorkspaceRuntimePanel() {
  const [workspaces, setWorkspaces] = useState<TrustedWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [status, setStatus] = useState("Loading trusted workspaces...");
  const [command, setCommand] = useState(safeCommands[0]);
  const [commandOutput, setCommandOutput] = useState("");

  const api = (window as any).electronAPI;

  const load = async () => {
    const res = await api?.listTrustedWorkspaces?.();
    if (res?.success) {
      setWorkspaces(res.workspaces || []);
      setSelectedWorkspaceId((prev) => prev || res.workspaces?.[0]?.id || "");
      setStatus(`${res.workspaces?.length || 0} trusted workspace(s) loaded.`);
    } else {
      setStatus(res?.error || "Trusted workspace backend is unavailable.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);

  const addWorkspace = async () => {
    const folder = await api?.openFolder?.();
    if (!folder) return;
    const res = await api?.addTrustedWorkspace?.(folder);
    if (res?.success) {
      setWorkspaces(res.workspaces || []);
      setSelectedWorkspaceId(res.workspace?.id || "");
      setStatus(`Trusted workspace added: ${res.workspace?.path}`);
    } else {
      setStatus(res?.error || "Failed to add trusted workspace.");
    }
  };

  const removeWorkspace = async (id: string) => {
    if (!confirm("Remove this trusted workspace? Files are not deleted.")) return;
    const res = await api?.removeTrustedWorkspace?.(id);
    if (res?.success) {
      setWorkspaces(res.workspaces || []);
      setSelectedWorkspaceId(res.workspaces?.[0]?.id || "");
      setStatus("Trusted workspace removed.");
    } else {
      setStatus(res?.error || "Failed to remove trusted workspace.");
    }
  };

  const runSearch = async () => {
    if (!selectedWorkspaceId || !query.trim()) return;
    setStatus("Searching trusted workspace...");
    const res = await api?.searchWorkspace?.(selectedWorkspaceId, query.trim(), 80);
    if (res?.success) {
      setResults(res.results || []);
      setStatus(`${res.results?.length || 0} real result(s) found.`);
    } else {
      setStatus(res?.error || "Workspace search failed.");
    }
  };

  const runCommand = async () => {
    if (!selectedWorkspaceId) return;
    setCommandOutput("Running command...");
    const res = await api?.runWorkspaceCommand?.(selectedWorkspaceId, command, [], false);
    if (res?.success) {
      setCommandOutput([
        `$ ${command}`,
        `cwd: ${res.cwd}`,
        `duration: ${res.durationMs}ms`,
        "",
        res.stdout || "",
        res.stderr ? `\n[stderr]\n${res.stderr}` : ""
      ].join("\n"));
    } else {
      setCommandOutput(`Command failed: ${res?.error || "Unknown error."}`);
    }
  };

  const openPath = (targetPath: string) => api?.openLocalPath?.(targetPath);
  const revealPath = (targetPath: string) => api?.revealLocalPath?.(targetPath);
  const copyPath = (targetPath: string) => api?.copyLocalPath?.(targetPath);

  return (
    <div className="workspace-runtime-panel">
      <div className="workspace-runtime-header">
        <div>
          <h2>Trusted Workspaces</h2>
          <p>Saad Agent can read, search, edit, and run safe commands only inside these trusted roots.</p>
        </div>
        <button className="primary-action-btn" onClick={addWorkspace}>Add Trusted Workspace</button>
      </div>

      <div className="workspace-runtime-status">{status}</div>

      <div className="workspace-runtime-grid">
        <section className="runtime-card">
          <h3>Trusted Roots</h3>
          {workspaces.length === 0 ? (
            <p className="muted-text">No trusted workspaces yet. Add a project root before using full-power tools.</p>
          ) : workspaces.map((workspace) => (
            <div key={workspace.id} className={`trusted-workspace-item ${workspace.id === selectedWorkspaceId ? "active" : ""}`}>
              <button className="trusted-workspace-main" onClick={() => setSelectedWorkspaceId(workspace.id)}>
                <strong>{workspace.name}</strong>
                <span>{workspace.path}</span>
              </button>
              <div className="path-actions">
                <button onClick={() => openPath(workspace.path)}>Open</button>
                <button onClick={() => revealPath(workspace.path)}>Reveal</button>
                <button onClick={() => copyPath(workspace.path)}>Copy</button>
                <button onClick={() => removeWorkspace(workspace.id)}>Remove</button>
              </div>
            </div>
          ))}
        </section>

        <section className="runtime-card">
          <h3>Workspace Search</h3>
          <div className="runtime-row">
            <select value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.target.value)}>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files, symbols, routes, services..." />
            <button onClick={runSearch}>Search</button>
          </div>
          <div className="search-results-list">
            {results.map((result, index) => (
              <div key={`${result.path}-${result.line || 0}-${index}`} className="search-result-item">
                <div>
                  <strong>{result.relativePath}{result.line ? `:${result.line}` : ""}</strong>
                  <span>{result.type} | score {result.score}</span>
                  {result.preview && <code>{result.preview}</code>}
                </div>
                <div className="path-actions">
                  <button onClick={() => openPath(result.path)}>Open</button>
                  <button onClick={() => revealPath(result.path)}>Reveal</button>
                  <button onClick={() => copyPath(result.path)}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="runtime-card">
        <h3>Safe Command Runner</h3>
        <p className="muted-text">Only allowlisted commands run here. Git push, delete, and dangerous operations are not automatic.</p>
        <div className="runtime-row">
          <select value={command} onChange={(event) => setCommand(event.target.value)}>
            {safeCommands.map((cmd) => <option key={cmd} value={cmd}>{cmd}</option>)}
          </select>
          <button disabled={!selectedWorkspace} onClick={runCommand}>Run</button>
        </div>
        <pre className="command-output-panel">{commandOutput || "Command output will appear here."}</pre>
      </section>
    </div>
  );
}

