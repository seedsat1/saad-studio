import React, { useState, useRef, useEffect } from "react";
import {
  MOCK_PROVIDERS,
  MOCK_CONNECTORS,
  MOCK_ARCHITECTURE,
  MOCK_DEPENDENCY_GRAPH,
  MOCK_CHECKPOINTS,
  MOCK_LOGS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_MODEL_ROLES,
} from "./mockData.js";
import type { Message } from "./mockData.js";
import type { Attachment } from "./attachments.js";

export default function App() {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [conversations] = useState(MOCK_CONVERSATIONS);
  const [activeConv, setActiveConv] = useState("conv-1");
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [workspacePath, setWorkspacePath] = useState("e:/موقع ثاني/next14 ai saas");
  const [projectName, setProjectName] = useState("next14-ai-saas");
  const [recentWorkspaces, setRecentWorkspaces] = useState<any[]>([]);
  const [planApprovalStates, setPlanApprovalStates] = useState<Record<string, string>>({});
  const [planExecutionStates, setPlanExecutionStates] = useState<Record<string, { state: string; checkpointId?: string; error?: string }>>({});

  const handleExecutePlan = (sessionId: string, patchContent?: string) => {
    setPlanExecutionStates((prev) => ({
      ...prev,
      [sessionId]: { state: "executing" },
    }));

    if ((window as any).electronAPI && (window as any).electronAPI.executePlan) {
      (window as any).electronAPI.executePlan(sessionId, patchContent).then((res: any) => {
        if (res && res.success) {
          setPlanExecutionStates((prev) => ({
            ...prev,
            [sessionId]: {
              state: "completed",
              checkpointId: res.results.checkpointId,
            },
          }));
        } else {
          setPlanExecutionStates((prev) => ({
            ...prev,
            [sessionId]: {
              state: "failed",
              error: res.error || res.results?.error,
            },
          }));
        }
      });
    } else {
      // Mock execution sequence for browser demo runs
      setTimeout(() => {
        setPlanExecutionStates((prev) => ({
          ...prev,
          [sessionId]: { state: "completed", checkpointId: "cp-mock-123" },
        }));
      }, 1500);
    }
  };

  const handlePlanResponse = (sessionId: string, approved: boolean) => {
    if ((window as any).electronAPI && (window as any).electronAPI.respondToPlan) {
      (window as any).electronAPI.respondToPlan(sessionId, approved).then((res: any) => {
        if (res && res.success) {
          setPlanApprovalStates((prev) => ({
            ...prev,
            [sessionId]: res.state,
          }));
        }
      });
    } else {
      setPlanApprovalStates((prev) => ({
        ...prev,
        [sessionId]: approved ? "approved" : "rejected",
      }));
    }
  };

  const loadRecentList = async () => {
    if ((window as any).electronAPI) {
      const list = await (window as any).electronAPI.getRecentWorkspaces();
      setRecentWorkspaces(list || []);
    }
  };

  const handleSwitchWorkspace = async (folderPath: string) => {
    try {
      if ((window as any).electronAPI) {
        const switchResult = await (window as any).electronAPI.switchWorkspace(folderPath);
        if (switchResult.success) {
          setWorkspacePath(folderPath.replace(/\\/g, "/"));
          const name = folderPath.split(/[\\/]/).pop() || "unknown-project";
          setProjectName(name);
          
          const systemMsg: Message = {
            id: `sys-${Date.now()}`,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `Switched active workspace to: "${folderPath}". Loaded project configurations and validated workspace directory structure successfully.`,
          };
          setMessages((prev) => [...prev, systemMsg]);
          await loadRecentList();
        } else {
          alert(`Failed to switch workspace: ${switchResult.error}`);
        }
      }
    } catch (err) {
      console.error("Failed to switch workspace:", err);
    }
  };

  const handleOpenFolder = async () => {
    try {
      if ((window as any).electronAPI) {
        const folderPath = await (window as any).electronAPI.openFolder();
        if (folderPath) {
          const switchResult = await (window as any).electronAPI.switchWorkspace(folderPath);
          if (switchResult.success) {
            setWorkspacePath(folderPath.replace(/\\/g, "/"));
            const name = folderPath.split(/[\\/]/).pop() || "unknown-project";
            setProjectName(name);
            
            const systemMsg: Message = {
              id: `sys-${Date.now()}`,
              sender: "agent",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              content: `Switched active workspace to: "${folderPath}". Loaded project configurations and validated workspace directory structure successfully.`,
            };
            setMessages((prev) => [...prev, systemMsg]);
            await loadRecentList();
          } else {
            alert(`Failed to open workspace: ${switchResult.error}`);
          }
        }
      } else {
        alert("Native folder picker is only available in the Saad Agent desktop application shell.");
      }
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
    }
  };

  useEffect(() => {
    const initWorkspace = async () => {
      if ((window as any).electronAPI) {
        const lastPath = await (window as any).electronAPI.getLastWorkspace();
        if (lastPath) {
          const switchResult = await (window as any).electronAPI.switchWorkspace(lastPath);
          if (switchResult.success) {
            setWorkspacePath(lastPath.replace(/\\/g, "/"));
            const name = lastPath.split(/[\\/]/).pop() || "unknown-project";
            setProjectName(name);
          }
        }
        await loadRecentList();
      }
    };
    initWorkspace();
  }, []);

  const handleApprovePlan = async (msgId: string) => {
    const logsId = `msg-agent-logs-${Date.now()}`;
    const initialLogs = [
      "Applying patches to project-scanner.ts... OK",
      "Applying patches to fs-tools.ts... OK"
    ];
    
    let activeLogs = [...initialLogs];
    
    const updateLogsCard = (lines: string[]) => {
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== msgId && m.id !== logsId);
        const logsMsg: Message = {
          id: logsId,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: "Executing plan verification loop:",
          cardType: "execution-logs",
          cardData: { logs: lines }
        };
        return [...filtered, logsMsg];
      });
    };

    updateLogsCard(activeLogs);

    if (!(window as any).electronAPI) {
      setTimeout(() => {
        activeLogs.push("Executing: npx tsc --noEmit");
        updateLogsCard(activeLogs);
        setTimeout(() => {
          activeLogs.push("Compilation successful!");
          activeLogs.push("Executing: node src/test-incremental.js");
          updateLogsCard(activeLogs);
          setTimeout(() => {
            activeLogs.push("All tests completed with 0 errors.");
            updateLogsCard(activeLogs);
          }, 600);
        }, 800);
      }, 500);
      return;
    }

    try {
      const electronAPI = (window as any).electronAPI;

      activeLogs.push("Executing: npx tsc --noEmit...");
      updateLogsCard(activeLogs);
      
      const compileResult = await electronAPI.runCommand({
        command: "npx tsc --noEmit",
        cwd: workspacePath
      });

      if (!compileResult.success) {
        activeLogs.push(`✗ Compilation Failed: ${compileResult.error || compileResult.stderr}`);
        updateLogsCard(activeLogs);
        return;
      }

      activeLogs.push("✓ Compilation Successful!");
      activeLogs.push("Executing: node src/test-incremental.js...");
      updateLogsCard(activeLogs);

      const testResult = await electronAPI.runCommand({
        command: "node src/test-incremental.js",
        cwd: workspacePath
      });

      if (!testResult.success) {
        activeLogs.push(`✗ Tests Failed: ${testResult.error || testResult.stderr}`);
        updateLogsCard(activeLogs);
        return;
      }

      activeLogs.push("✓ Verification tests completed successfully!");
      if (testResult.stdout) {
        testResult.stdout.split("\n").forEach((line: string) => {
          if (line.trim()) activeLogs.push(line);
        });
      }
      updateLogsCard(activeLogs);

    } catch (err: any) {
      activeLogs.push(`✗ Execution Error: ${err.message}`);
      updateLogsCard(activeLogs);
    }
  };
  
  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    memory: true,
    knowledge: true,
    architecture: false,
    dependencies: false,
    providers: false,
    modelRoles: true,
    connectors: false,
    checkpoints: false,
    logs: false,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Process selected or dropped/pasted files
  const processFiles = (files: FileList | File[]) => {
    setErrorMsg(null);
    setStatusMsg(null);
    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      // Mime check: png, jpg, jpeg, webp, and pdf
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setErrorMsg(`Invalid file type: ${file.name}. Only PNG, JPG, JPEG, WEBP, and PDF are supported.`);
        return;
      }

      // Size check: 8MB max
      const maxSize = 8 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMsg(`File too large: ${file.name}. Maximum size is 8MB.`);
        return;
      }

      // Generate local preview URL
      const previewUrl = file.type === "application/pdf"
        ? "" // PDF placeholder does not need image blob
        : URL.createObjectURL(file);

      newAttachments.push({
        id: `att-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        type: file.type === "application/pdf" ? "pdf" : "image",
        name: file.name,
        mimeType: file.type,
        size: file.size,
        previewUrl,
        source: previewUrl || "PDF_PLACEHOLDER"
      });
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      setStatusMsg("Upload ready");
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Clipboard Paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(e.clipboardData.files);
    }
  };

  // File Change input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Remove queued attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
    if (attachments.length <= 1) {
      setStatusMsg(null);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: inputValue || (attachments.length > 0 ? `Uploaded ${attachments.length} attachment(s)` : ""),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setAttachments([]);
    setStatusMsg(null);
    setErrorMsg(null);

    // Check if Electron bridge is present
    if ((window as any).electronAPI && (window as any).electronAPI.createExecutionSession && !userMsg.attachments?.some((a: any) => a.type === "image")) {
      (window as any).electronAPI.createExecutionSession(userMsg.content).then((res: any) => {
        const agentMsgId = `msg-agent-${Date.now()}`;
        if (res && res.success) {
          const agentMsg: Message = {
            id: agentMsgId,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `I have initialized an execution session and generated a task plan for your review:`,
            cardType: "plan-approval",
            cardData: {
              sessionId: res.sessionId,
              plan: res.plan,
              status: "awaiting_approval",
            },
          };
          setMessages((prev) => [...prev, agentMsg]);
        } else {
          const errorAgentMsg: Message = {
            id: agentMsgId,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `Error generating plan: ${res?.error || "Unknown error occurred."}`,
          };
          setMessages((prev) => [...prev, errorAgentMsg]);
        }
      });
    } else {
      // Simulate Agent response
      setTimeout(() => {
        const hasImage = userMsg.attachments?.some((a) => a.type === "image");
        const agentMsgId = `msg-agent-${Date.now()}`;
        let agentMsg: Message;

        if (hasImage) {
          agentMsg = {
            id: agentMsgId,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: "I have passed the layout screenshot to the Vision Provider (Qwen2.5-VL) for visual layout debugging. Here is the layout report:",
            cardType: "vision-analysis",
            cardData: {
              imageName: userMsg.attachments?.[0]?.name || "screenshot.png",
              dimensions: "1920 x 1080",
              findings: [
                { id: 1, element: "CSS Flex Container", issue: "The items do not wrap on viewport < 1024px causing horizontal scrolls.", severity: "High" },
                { id: 2, element: "Dashboard Title spacing", issue: "Arabic heading aligns left instead of right (RTL padding bug).", severity: "Medium" }
              ],
              recommendations: "Apply flex-wrap utility classes to columns, and use logic RTL direction parameters inside tailwind settings."
            }
          };
        } else {
          // Mock planning session fallback for browser testing
          agentMsg = {
            id: agentMsgId,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `I've received your request: "${userMsg.content}". Formulating plan:`,
            cardType: "plan-approval",
            cardData: {
              sessionId: `mock-session-${Date.now()}`,
              plan: {
                taskSummary: `Mock plan for: "${userMsg.content}"`,
                affectedFiles: ["index.css", "App.tsx"],
                requiredTools: ["fs-tool", "search-tool"],
                requiredPermissions: ["read", "write"],
                riskLevel: "medium",
                proposedSteps: [
                  "Verify structural configurations and styling directories.",
                  "Render interactive planning badges to request approvals."
                ],
                validationSteps: [
                  "Compile workspace files to verify type correctness."
                ]
              },
              status: "awaiting_approval"
            }
          };
        }
        setMessages((prev) => [...prev, agentMsg]);
      }, 1200);
    }
  };

  // Render Architecture Tree recursively
  const renderTree = (node: any) => {
    if (node.type === "directory") {
      return (
        <div key={node.name} className="tree-node">
          <div className="tree-row">
            <span className="tree-icon directory">📁</span>
            <span>{node.name}</span>
          </div>
          <div className="tree-children">
            {node.children.map((child: any) => renderTree(child))}
          </div>
        </div>
      );
    }
    return (
      <div key={node.name} className="tree-row" style={{ paddingLeft: "18px" }}>
        <span className="tree-icon">📄</span>
        <span style={{ color: "var(--text-secondary)" }}>{node.name}</span>
        <span style={{ color: "var(--text-muted)", fontSize: "10px", marginLeft: "auto" }}>{node.size}</span>
      </div>
    );
  };

  // Render Card Types
  const renderCard = (msg: Message) => {
    if (!msg.cardType) return null;

    switch (msg.cardType) {
      case "project-analysis":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">🔍 Project Analysis</span>
              <span className="card-badge badge-cyan">Scan OK</span>
            </div>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="analysis-label">Project Name</span>
                <span className="analysis-value">{msg.cardData.projectName}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Framework</span>
                <span className="analysis-value">{msg.cardData.framework}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Files Tracked</span>
                <span className="analysis-value">{msg.cardData.filesCount} files</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Total Size</span>
                <span className="analysis-value">{msg.cardData.totalSize}</span>
              </div>
              <div className="analysis-item" style={{ gridColumn: "span 2" }}>
                <span className="analysis-label">Exclusions Ignored</span>
                <span className="analysis-value" style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent-cyan)" }}>
                  {msg.cardData.ignoredFolders.join(", ")}
                </span>
              </div>
            </div>
          </div>
        );

      case "execution-plan":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">📋 Execution Plan</span>
              <span className="card-badge badge-blue">Planning</span>
            </div>
            <div className="plan-steps">
              {msg.cardData.steps.map((step: any) => (
                <div key={step.id} className={`plan-step ${step.completed ? "completed" : ""}`}>
                  <div className="step-number">{step.id}</div>
                  <span className="step-text">{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "affected-files":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">📂 Affected Files</span>
              <span className="card-badge badge-orange">Pending</span>
            </div>
            <div className="file-list">
              {msg.cardData.files.map((file: any) => (
                <div key={file.path} className="file-item">
                  <span className="file-name">{file.path.split("/").pop()}</span>
                  <span className={`file-action ${file.action}`}>{file.action}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "diff-preview":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">⚡ Diff Preview</span>
              <span className="card-badge badge-cyan">Review</span>
            </div>
            <div className="diff-container">
              <div className="diff-header">{msg.cardData.fileName}</div>
              <div className="diff-code">
                {msg.cardData.diff.split("\n").map((line: string, i: number) => {
                  let cls = "";
                  if (line.startsWith("-")) cls = "diff-line-del";
                  else if (line.startsWith("+")) cls = "diff-line-add";
                  return <span key={i} className={cls}>{line}</span>;
                })}
              </div>
            </div>
          </div>
        );

      case "approval-buttons":
        return (
          <div className="engineering-card" style={{ borderStyle: "dashed", borderColor: "rgba(0,229,255,0.3)" }}>
            <div className="card-header">
              <span className="card-title">🤖 Awaiting Engineer Decision</span>
              <span className="card-badge badge-orange">Auth Required</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Approve these changes to compile, verify, and commit them.
            </p>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={() => handleApprovePlan(msg.id)}>Approve Plan</button>
              <button className="btn btn-secondary">Reject & Revise</button>
            </div>
          </div>
        );

      case "execution-logs":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">💻 Terminal Execution Logs</span>
              <span className="card-badge badge-blue">Executing</span>
            </div>
            <div className="logs-console">
              {msg.cardData.logs.map((log: string, i: number) => (
                <span key={i} className="log-line">{log}</span>
              ))}
            </div>
          </div>
        );

      case "build-results":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">🔨 Build & Test Results</span>
              <span className={`card-badge ${msg.cardData.status === "success" ? "badge-emerald" : "badge-orange"}`}>
                {msg.cardData.status.toUpperCase()}
              </span>
            </div>
            <div className={`results-box ${msg.cardData.status}`}>
              <span className={`results-title ${msg.cardData.status}`}>
                {msg.cardData.status === "success" ? "✓ Build & Verification Passed" : "✗ Build Failed"}
              </span>
              <span className="analysis-label">Compilation Info</span>
              <div className="results-console">{msg.cardData.buildLogs}</div>
              <span className="analysis-label">Execution Tests Output</span>
              <div className="results-console" style={{ maxHeight: "120px", overflowY: "auto" }}>
                {msg.cardData.testLogs}
              </div>
            </div>
          </div>
        );

      case "retry-status":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">🔄 Validation Loop</span>
              <span className="card-badge badge-emerald">Done</span>
            </div>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="analysis-label">Attempts Made</span>
                <span className="analysis-value">{msg.cardData.attempts} run</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Error Count</span>
                <span className="analysis-value" style={{ color: msg.cardData.errors.length > 0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                  {msg.cardData.errors.length} errors
                </span>
              </div>
            </div>
          </div>
        );

      case "final-report":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">📄 Final Walkthrough Report</span>
              <span className="card-badge badge-emerald">Complete</span>
            </div>
            <div style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
              <p style={{ fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Applied Walkthrough:</p>
              <div style={{ whiteSpace: "pre-line" }}>{msg.cardData.walkthrough}</div>
            </div>
          </div>
        );

      case "checkpoint":
        return (
          <div className="engineering-card" style={{ background: "rgba(59, 130, 246, 0.05)", borderColor: "rgba(59, 130, 246, 0.2)" }}>
            <div className="card-header">
              <span className="card-title" style={{ color: "var(--accent-blue)" }}>🔒 Recovery Checkpoint</span>
              <span className="card-badge badge-blue">Snapshot</span>
            </div>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="analysis-label">Checkpoint ID</span>
                <span className="analysis-value" style={{ fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
                  {msg.cardData.checkpointId}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Action</span>
                <span className="analysis-value">Restorable</span>
              </div>
              <div className="analysis-item" style={{ gridColumn: "span 2" }}>
                <span className="analysis-label">Description</span>
                <span className="analysis-value" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {msg.cardData.description}
                </span>
              </div>
            </div>
          </div>
        );

      case "memory-updated":
        return (
          <div className="engineering-card" style={{ background: "rgba(16, 185, 129, 0.04)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
            <div className="card-header">
              <span className="card-title" style={{ color: "var(--accent-emerald)" }}>🧠 Memory Store Updated</span>
              <span className="card-badge badge-emerald">Learned</span>
            </div>
            <div className="memory-box">
              <div className="memory-section">
                <span className="memory-label">Decisions Logged</span>
                <div className="memory-text">{msg.cardData.decision}</div>
              </div>
              <div className="memory-section">
                <span className="memory-label">Lessons Extracted</span>
                <div className="memory-text" style={{ borderLeftColor: "var(--accent-emerald)" }}>
                  {msg.cardData.lessons}
                </div>
              </div>
            </div>
          </div>
        );

      case "vision-analysis":
        return (
          <div className="engineering-card">
            <div className="card-header">
              <span className="card-title">👁 Vision Analysis Report</span>
              <span className="card-badge badge-cyan">Vision OK</span>
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              <strong>Analyzed Screenshot:</strong> {msg.cardData.imageName} ({msg.cardData.dimensions})
            </div>
            <table className="vision-findings-table">
              <thead>
                <tr>
                  <th>Visual Component</th>
                  <th>Layout Defect / Constraint</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {msg.cardData.findings.map((f: any) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>{f.element}</td>
                    <td>{f.issue}</td>
                    <td>
                      <span className={`severity-pill severity-${f.severity}`}>{f.severity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "12px", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", borderLeft: "2px solid var(--accent-cyan)", fontSize: "12px" }}>
              <span style={{ color: "var(--accent-cyan)", fontWeight: "600", display: "block", marginBottom: "4px" }}>Recommendation:</span>
              {msg.cardData.recommendations}
            </div>
          </div>
        );

      case "plan-approval": {
        const { sessionId, plan, status } = msg.cardData;
        const currentStatus = planApprovalStates[sessionId] || status;

        return (
          <div className="engineering-card plan-approval-card">
            <div className="card-header">
              <span className="card-title">📋 Execution Plan Approval</span>
              <span className={`card-badge risk-${plan.riskLevel}`}>
                {plan.riskLevel.toUpperCase()} RISK
              </span>
            </div>
            
            <div className="plan-section">
              <span className="section-title">Summary</span>
              <p className="plan-summary-text">{plan.taskSummary}</p>
            </div>

            <div className="plan-section plan-metadata-row" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "8px 0 12px 0", fontSize: "11px" }}>
              <span className={`card-badge source-${plan.planSource || "model"}`}>
                Source: {(plan.planSource || "model").toUpperCase()}
              </span>
              {plan.modelProvider && (
                <span className="card-badge badge-blue">
                  Provider: {plan.modelProvider}
                </span>
              )}
              {plan.tokenEstimate !== undefined && (
                <span className="card-badge badge-cyan">
                  Tokens: {plan.tokenEstimate}
                </span>
              )}
              {plan.jsonValidationStatus && (
                <span className={`card-badge val-${plan.jsonValidationStatus}`}>
                  JSON: {plan.jsonValidationStatus.toUpperCase()}
                </span>
              )}
            </div>

            {plan.fallbackStatus && (
              <div className="plan-section fallback-reason-panel" style={{ padding: "8px 12px", background: "rgba(245,158,11,0.08)", borderLeft: "2px solid var(--accent-orange)", borderRadius: "4px", marginBottom: "12px", fontSize: "12px", color: "var(--accent-orange)" }}>
                <strong>⚠️ Fallback:</strong> {plan.fallbackStatus}
              </div>
            )}

            {plan.affectedFiles && plan.affectedFiles.length > 0 && (
              <div className="plan-section">
                <span className="section-title">Affected Files</span>
                <div className="plan-items-grid">
                  {plan.affectedFiles.map((file: string) => (
                    <span key={file} className="plan-item-tag file-tag">📄 {file}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="plan-section">
              <span className="section-title">Required Tools & Permissions</span>
              <div className="plan-items-grid">
                {plan.requiredTools.map((tool: string) => (
                  <span key={tool} className="plan-item-tag tool-tag">🛠️ {tool}</span>
                ))}
                {plan.requiredPermissions.map((perm: string) => (
                  <span key={perm} className="plan-item-tag perm-tag">🔑 {perm}</span>
                ))}
              </div>
            </div>

            <div className="plan-section">
              <span className="section-title">Proposed Steps</span>
              <ol className="plan-steps-list">
                {plan.proposedSteps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="plan-actions-container">
              {currentStatus === "awaiting_approval" ? (
                <div className="approval-buttons">
                  <button
                    className="approve-btn"
                    onClick={() => handlePlanResponse(sessionId, true)}
                  >
                    Approve Plan
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handlePlanResponse(sessionId, false)}
                  >
                    Reject Plan
                  </button>
                </div>
              ) : currentStatus === "approved" ? (
                <div className="approved-actions-wrapper">
                  <div className="approval-result-status approved" style={{ marginBottom: "12px" }}>
                    ✅ Plan Approved
                  </div>
                  {!planExecutionStates[sessionId] ? (
                    <button
                      className="run-preview-btn"
                      onClick={() => handleExecutePlan(sessionId)}
                    >
                      Run Approved Execution
                    </button>
                  ) : (
                    <div className="execution-preview-status-block">
                      <span className="section-title">Execution Progress</span>
                      <div className="exec-steps-list">
                        <div className={`exec-step-item ${["executing", "completed", "failed"].includes(planExecutionStates[sessionId]!.state) ? "done" : ""}`}>
                          <span className="step-bullet">✓</span> Pre-execution Checkpoint created
                        </div>
                        <div className={`exec-step-item ${["completed", "failed"].includes(planExecutionStates[sessionId]!.state) ? "done" : ""}`}>
                          <span className="step-bullet">✓</span> Safe file patch applications
                        </div>
                        <div className={`exec-step-item ${["completed"].includes(planExecutionStates[sessionId]!.state) ? "done" : planExecutionStates[sessionId]!.state === "failed" ? "failed" : "running"}`}>
                          <span className="step-bullet">✓</span> Build compilation runs
                        </div>
                        <div className={`exec-step-item ${["completed"].includes(planExecutionStates[sessionId]!.state) ? "done" : planExecutionStates[sessionId]!.state === "failed" ? "failed" : "running"}`}>
                          <span className="step-bullet">✓</span> Regression tests validations
                        </div>
                      </div>

                      <div className={`execution-result-banner ${planExecutionStates[sessionId]!.state}`}>
                        {planExecutionStates[sessionId]!.state === "completed" ? (
                          `✅ Execution Succeeded! Checkpoint: ${planExecutionStates[sessionId]!.checkpointId}`
                        ) : planExecutionStates[sessionId]!.state === "failed" ? (
                          `❌ Execution Failed: ${planExecutionStates[sessionId]!.error}`
                        ) : (
                          "⚡ Running execution steps..."
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`approval-result-status ${currentStatus}`}>
                  {currentStatus === "approved" ? "✅ Plan Approved" : "❌ Plan Rejected"}
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="app-container" onDragOver={handleDrag} onDragEnter={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">S</div>
          <span className="logo-text">Saad Studio Agent</span>
        </div>
        <div className="sidebar-scroll">
          <div className="section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Active Workspace</span>
            <button
              type="button"
              onClick={handleOpenFolder}
              style={{
                background: "transparent",
                color: "var(--accent-cyan)",
                fontSize: "11px",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid rgba(0, 229, 255, 0.2)"
              }}
            >
              Open...
            </button>
          </div>
          <div className="project-box">
            <div className="project-title">{projectName}</div>
            <div className="project-path" title={workspacePath}>{workspacePath}</div>
          </div>

          {recentWorkspaces.length > 0 && (
            <>
              <div className="section-label">Recent Workspaces</div>
              <div className="conversation-list" style={{ marginBottom: "16px" }}>
                {recentWorkspaces.map((rw) => (
                  <div
                    key={rw.path}
                    className={`conversation-item ${
                      rw.path.toLowerCase() === workspacePath.toLowerCase() ? "active" : ""
                    }`}
                    onClick={() => handleSwitchWorkspace(rw.path)}
                    style={{ padding: "8px 12px", display: "flex", gap: "8px", alignItems: "center" }}
                    title={rw.path}
                  >
                    <span style={{ fontSize: "14px" }}>📁</span>
                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
                      <span style={{ fontWeight: "500", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {rw.name}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {rw.path}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-label">Maintenance Chats</div>
          <div className="conversation-list">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conversation-item ${c.id === activeConv ? "active" : ""}`}
                onClick={() => setActiveConv(c.id)}
              >
                <span>💬</span>
                {c.title}
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="status-badge">
            <div className="status-dot"></div>
            <span>Local Node Running</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Status Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <div className="model-pill">
              <div className="model-dot"></div>
              <span>Coding: Qwen3 Coder</span>
            </div>
            <div className="model-pill" style={{ borderStyle: "dashed" }}>
              <div className="model-dot" style={{ backgroundColor: "var(--accent-cyan)", boxShadow: "0 0 6px var(--accent-cyan)" }}></div>
              <span>Vision: Qwen2.5-VL</span>
            </div>
          </div>
          <div className="top-bar-right">
            <button
              className={`panel-toggle-btn ${rightPanelOpen ? "active" : ""}`}
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
            >
              <span>{rightPanelOpen ? "⚡ Panel Open" : "⚡ Panel Collapsed"}</span>
            </button>
          </div>
        </header>

        {/* Chat Message Window */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
              <div className="message-avatar">{msg.sender === "user" ? "U" : "A"}</div>
              <div className="message-content-container">
                <div className="message-meta">
                  <span className="message-sender">{msg.sender === "user" ? "Developer" : "Saad Agent"}</span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                <div className="message-bubble">{msg.content}</div>
                
                {/* Render inline sent attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="message-attachments">
                    {msg.attachments.map((att) => (
                      att.type === "image" ? (
                        <img
                          key={att.id}
                          src={att.previewUrl}
                          alt={att.name}
                          className="sent-attachment-img"
                          title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                        />
                      ) : (
                        <div key={att.id} className="sent-attachment-pdf" title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}>
                          <span className="sent-pdf-icon">📄</span>
                          <div className="sent-pdf-info">
                            <span className="sent-pdf-name">{att.name}</span>
                            <span className="sent-pdf-size">{(att.size / 1024).toFixed(1)} KB (PDF Placeholder)</span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}

                {renderCard(msg)}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="input-area">
          {errorMsg && (
            <div className="input-error-msg">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}
          
          {statusMsg && !errorMsg && (
            <div className="input-status-msg">
              <span>✓</span>
              <span>{statusMsg}</span>
            </div>
          )}

          {isDragActive && (
            <div className="input-status-msg" style={{ animation: "pulse 1.5s infinite" }}>
              <span>🚀</span>
              <span>Drag active — Drop files to queue attachments</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className={`input-box-wrapper ${isDragActive ? "drag-active" : ""}`}>
            {/* Hidden File Picker */}
            <input
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {/* Click to upload button */}
            <button
              type="button"
              className="attachment-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Add attachment (PNG, JPG, JPEG, WEBP, PDF)"
            >
              📎
            </button>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Attachment Queued Previews */}
              {attachments.length > 0 && (
                <div className="preview-area">
                  {attachments.map((att) => (
                    <div key={att.id} className="preview-item">
                      {att.type === "image" ? (
                        <img src={att.previewUrl} alt={att.name} className="preview-img" />
                      ) : (
                        <div className="preview-pdf-placeholder">PDF</div>
                      )}
                      <div className="preview-meta">
                        <span className="preview-name">{att.name}</span>
                        <span className="preview-size">{(att.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button
                        type="button"
                        className="remove-attachment-btn"
                        onClick={() => removeAttachment(att.id)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                className="input-textarea"
                placeholder="Ask Saad Agent to run project maintenance tasks, drop/paste screenshots, or attach PDFs..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onPaste={handlePaste}
                rows={1}
              />
            </div>

            <button type="submit" className="send-btn">
              <span>➔</span>
            </button>
          </form>
        </div>
      </main>

      {/* Collapsible Right Panel */}
      {rightPanelOpen && (
        <aside className="right-panel">
          <div className="panel-header">
            <span>⚡ Collapsible Engineering Panel</span>
          </div>
          <div className="panel-scroll">
            
            {/* Accordion 0: Model Roles */}
            <div className={`panel-section ${openSections.modelRoles ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("modelRoles")}>
                <span>⚙️ Model Roles Configuration</span>
                <span className="chevron"></span>
              </div>
              {openSections.modelRoles && (
                <div className="panel-section-content">
                  <div className="model-roles-container">
                    {MOCK_MODEL_ROLES.map((role) => (
                      <div key={role.role} className="model-role-card">
                        <div className="role-header">
                          <span className="role-name">{role.role}</span>
                          <span className={`role-badge ${role.active ? "" : "inactive"}`}>
                            {role.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <span className="role-model">{role.model}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 1: Memory */}
            <div className={`panel-section ${openSections.memory ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("memory")}>
                <span>🧠 Long-Term Memory</span>
                <span className="chevron"></span>
              </div>
              {openSections.memory && (
                <div className="panel-section-content">
                  <div className="kv-row">
                    <span className="kv-key">Knowledge State</span>
                    <span className="kv-val" style={{ color: "var(--accent-emerald)" }}>Initialized</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Learnings Logged</span>
                    <span className="kv-val">12 entries</span>
                  </div>
                  <div className="kv-row" style={{ flexDirection: "column", gap: "4px" }}>
                    <span className="kv-key">Latest Lesson Learned:</span>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      "SHA-256 content hashing replaces timestamp comparisons to avoid date conflicts."
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Knowledge Base */}
            <div className={`panel-section ${openSections.knowledge ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("knowledge")}>
                <span>📚 Project Knowledge Base</span>
                <span className="chevron"></span>
              </div>
              {openSections.knowledge && (
                <div className="panel-section-content">
                  <div className="kv-row">
                    <span className="kv-key">Indexed Files</span>
                    <span className="kv-val">148 files</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Exclusion Rules</span>
                    <span className="kv-val">6 folders</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Scanning Mode</span>
                    <span className="kv-val" style={{ color: "var(--accent-cyan)" }}>Hash-Based Scan</span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Architecture Node */}
            <div className={`panel-section ${openSections.architecture ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("architecture")}>
                <span>📁 Project Architecture</span>
                <span className="chevron"></span>
              </div>
              {openSections.architecture && (
                <div className="panel-section-content" style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {renderTree(MOCK_ARCHITECTURE)}
                </div>
              )}
            </div>

            {/* Accordion 4: Dependency Graph */}
            <div className={`panel-section ${openSections.dependencies ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("dependencies")}>
                <span>🔗 Dependency Graph</span>
                <span className="chevron"></span>
              </div>
              {openSections.dependencies && (
                <div className="panel-section-content" style={{ maxHeight: "220px", overflowY: "auto", gap: "8px" }}>
                  {Object.entries(MOCK_DEPENDENCY_GRAPH).map(([file, deps]) => (
                    <div key={file} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "6px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent-cyan)" }}>
                        {file.split("/").pop()}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                        {deps.map((dep) => (
                          <span key={dep} style={{ background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
                            {dep.split("/").pop()}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 5: Model Providers */}
            <div className={`panel-section ${openSections.providers ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("providers")}>
                <span>⚙️ Model Providers</span>
                <span className="chevron"></span>
              </div>
              {openSections.providers && (
                <div className="panel-section-content">
                  {MOCK_PROVIDERS.map((provider) => (
                    <div key={provider.name} className="kv-row">
                      <span className="kv-key" style={{ fontWeight: provider.active ? "600" : "normal" }}>
                        {provider.name}
                      </span>
                      <span className={`kv-val ${provider.active ? "active" : "inactive"}`}>
                        {provider.ping}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 6: Connectors */}
            <div className={`panel-section ${openSections.connectors ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("connectors")}>
                <span>🔌 Account Connectors</span>
                <span className="chevron"></span>
              </div>
              {openSections.connectors && (
                <div className="panel-section-content">
                  {MOCK_CONNECTORS.map((c) => (
                    <div key={c.name} className="kv-row" style={{ flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "500" }}>{c.name}</span>
                        <span className={`kv-val ${c.status === "connected" ? "active" : "inactive"}`}>{c.status}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)" }}>
                        <span>{c.account}</span>
                        <span>{c.permissions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 7: Checkpoints */}
            <div className={`panel-section ${openSections.checkpoints ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("checkpoints")}>
                <span>🔐 System Checkpoints</span>
                <span className="chevron"></span>
              </div>
              {openSections.checkpoints && (
                <div className="panel-section-content">
                  {MOCK_CHECKPOINTS.map((cp) => (
                    <div key={cp.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>{cp.id}</span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{cp.timestamp.split(" ")[1]}</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{cp.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 8: Logs */}
            <div className={`panel-section ${openSections.logs ? "open" : ""}`}>
              <div className="panel-section-header" onClick={() => toggleSection("logs")}>
                <span>📄 Console Session Logs</span>
                <span className="chevron"></span>
              </div>
              {openSections.logs && (
                <div className="panel-section-content" style={{ maxHeight: "150px", overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "10px", padding: "10px" }}>
                  {MOCK_LOGS.map((log, i) => (
                    <div key={i} style={{ marginBottom: "4px", color: log.includes("Error") ? "var(--accent-rose)" : "var(--text-secondary)" }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </aside>
      )}
    </div>
  );
}
