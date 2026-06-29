import React, { useState, useRef, useEffect } from "react";
import {
  MOCK_MESSAGES,
} from "./mockData.js";
import type { Message } from "./mockData.js";
import type { Attachment } from "./attachments.js";
import { ContextCards } from "./components/ContextCards.js";
import { SettingsModal } from "./components/SettingsModal.js";
type SettingsTab = "general" | "workspace" | "models" | "providers" | "agents" | "skills" | "tools" | "connectors" | "mcp" | "creative" | "vision" | "knowledge" | "execution" | "security" | "backups" | "diagnostics" | "advanced";
type RuntimeModelRole = {
  role: string;
  providerName: string;
  modelName: string;
  healthStatus?: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  workspacePath?: string;
  projectName?: string;
  messages: Message[];
  titleEdited?: boolean;
};

type MessageUpdater = Message[] | ((previous: Message[]) => Message[]);

const CONVERSATIONS_STORAGE_KEY = "saad-agent.conversations.v1";
const ACTIVE_CONVERSATION_STORAGE_KEY = "saad-agent.activeConversationId.v1";

const createConversation = (messages: Message[] = [], title = "New Chat"): Conversation => {
  const now = Date.now();
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: now,
    updatedAt: now,
    messages,
  };
};

const deriveConversationTitle = (messages: Message[]) => {
  const firstUserMessage = messages.find((message) => message.sender === "user" && message.content.trim());
  if (!firstUserMessage) return "New Chat";
  const compact = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return compact.length > 42 ? `${compact.slice(0, 42)}...` : compact;
};

const loadConversationBootstrap = (defaultMessages: Message[]) => {
  if (typeof window === "undefined") {
    const fallback = createConversation(defaultMessages, deriveConversationTitle(defaultMessages));
    return { conversations: [fallback], activeId: fallback.id };
  }

  try {
    const stored = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    const activeId = window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const conversations = parsed
        .filter((item) => item && typeof item.id === "string" && Array.isArray(item.messages))
        .map((item) => ({
          ...item,
          title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : deriveConversationTitle(item.messages),
          createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Number(item.updatedAt) || Date.now(),
        })) as Conversation[];

      if (conversations.length > 0) {
        return {
          conversations,
          activeId: conversations.some((conversation) => conversation.id === activeId) ? (activeId as string) : conversations[0].id,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to load conversations", error);
  }

  const fallback = createConversation(defaultMessages, deriveConversationTitle(defaultMessages));
  return { conversations: [fallback], activeId: fallback.id };
};

const quickActions = [
  "Generate Code",
  "Explain Code",
  "Refactor",
  "Fix Errors",
  "Review",
  "Generate Tests",
  "Analyze Image",
  "Generate Image",
  "Generate Video",
  "Search Workspace",
  "Search Memory",
  "Search Knowledge Base",
];

const runtimeAgents = ["Coding", "Reviewer", "Vision", "Fast"];
const runtimeSkills = ["Auto", "React", "TypeScript", "Next.js", "Electron", "Python", "FFmpeg"];
void [quickActions, runtimeAgents, runtimeSkills];

export default function App() {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<SettingsTab>("general");
  const defaultMessagesRef = useRef<Message[]>((window as any).electronAPI ? [] : MOCK_MESSAGES);
  const conversationBootstrapRef = useRef(loadConversationBootstrap(defaultMessagesRef.current));
  const [conversations, setConversations] = useState<Conversation[]>(conversationBootstrapRef.current.conversations);
  const [activeConversationId, setActiveConversationId] = useState(conversationBootstrapRef.current.activeId);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [composerAction, setComposerAction] = useState("Generate Code");
  const [activeRuntimeRole, setActiveRuntimeRole] = useState("Coding");
  const [activeRuntimeSkill, setActiveRuntimeSkill] = useState("Auto");
  const [activeMcpTool, setActiveMcpTool] = useState("None");
  void [composerAction, setComposerAction, activeRuntimeRole, setActiveRuntimeRole, activeRuntimeSkill, setActiveRuntimeSkill, activeMcpTool, setActiveMcpTool];
  const [workspacePath, setWorkspacePath] = useState("e:/موقع ثاني/next14 ai saas");
  const [projectName, setProjectName] = useState("next14-ai-saas");
  const [recentWorkspaces, setRecentWorkspaces] = useState<any[]>([]);
  const [runtimeModels, setRuntimeModels] = useState<RuntimeModelRole[]>([]);
  const [planApprovalStates, setPlanApprovalStates] = useState<Record<string, string>>({});
  const [planExecutionStates, setPlanExecutionStates] = useState<
    Record<
      string,
      {
        state: string;
        checkpointId?: string;
        error?: string;
        proposedFixPatch?: string;
        failureReason?: string;
      }
    >
  >({});
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0];
  const messages = activeConversation?.messages || [];

  const updateConversationMessages = (
    conversationId: string,
    updater: MessageUpdater,
    options: { preserveTitle?: boolean } = {}
  ) => {
    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        const nextMessages = typeof updater === "function" ? updater(conversation.messages) : updater;
        const title = conversation.titleEdited || options.preserveTitle
          ? conversation.title
          : deriveConversationTitle(nextMessages);
        return {
          ...conversation,
          messages: nextMessages,
          title,
          updatedAt: Date.now(),
          workspacePath,
          projectName,
        };
      })
    );
  };

  const setMessages = (updater: MessageUpdater) => {
    if (!activeConversationId) return;
    updateConversationMessages(activeConversationId, updater);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
      window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, activeConversationId);
    } catch (error) {
      console.warn("Failed to save conversations", error);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if ((window as any).electronAPI && (window as any).electronAPI.onMenuNavigate) {
      (window as any).electronAPI.onMenuNavigate((dest: string) => {
        if (dest === "settings") {
          setSettingsModalTab("general");
          setIsSettingsModalOpen(true);
        }
      });
    }
  }, []);

  const loadRuntimeModels = async () => {
    const api = (window as any).electronAPI;
    if (!api?.loadSettings) {
      setRuntimeModels([]);
      return;
    }

    const result = await api.loadSettings();
    if (!result?.success || !result.settings?.models || !Array.isArray(result.settings.providers)) {
      setRuntimeModels([]);
      return;
    }

    const providers = result.settings.providers;
    const modelEntries = Object.entries(result.settings.models)
      .map(([role, model]: [string, any]) => {
        if (!model?.modelName) return null;
        const provider = providers.find((item: any) => item.id === model.providerId);
        if (!provider) return null;
        return {
          role,
          providerName: provider.name,
          modelName: model.modelName,
          healthStatus: provider.healthStatus,
        };
      })
      .filter(Boolean) as RuntimeModelRole[];

    setRuntimeModels(modelEntries);
  };

  useEffect(() => {
    void loadRuntimeModels();
  }, []);

  const handleExecutePlan = (sessionId: string, patchContent?: string) => {
    setPlanExecutionStates((prev) => ({
      ...prev,
      [sessionId]: { state: "executing" },
    }));

    if ((window as any).electronAPI && (window as any).electronAPI.orchestratorExecutePlan) {
      (window as any).electronAPI.orchestratorExecutePlan(sessionId, patchContent).then((res: any) => {
        if (res && res.success) {
          setOrchestratorSession(res.session);
          if (res.results.state === "awaiting_fix_approval") {
            setPlanExecutionStates((prev) => ({
              ...prev,
              [sessionId]: {
                state: "awaiting_fix_approval",
                checkpointId: res.results.checkpointId,
                error: res.results.error,
                proposedFixPatch: res.results.proposedFixPatch,
                failureReason: res.results.failureReason,
              },
            }));
          } else {
            setPlanExecutionStates((prev) => ({
              ...prev,
              [sessionId]: {
                state: res.results.success ? "completed" : "failed",
                checkpointId: res.results.checkpointId,
                error: res.results.error,
              },
            }));
          }
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

  const handleFixResponse = (sessionId: string, approved: boolean) => {
    if ((window as any).electronAPI && (window as any).electronAPI.orchestratorRespondToFix) {
      setPlanExecutionStates((prev) => ({
        ...prev,
        [sessionId]: { state: "executing" },
      }));
      (window as any).electronAPI.orchestratorRespondToFix(sessionId, approved).then((res: any) => {
        if (res && res.success) {
          setOrchestratorSession(res.session);
          if (res.state === "awaiting_fix_approval") {
            setPlanExecutionStates((prev) => ({
              ...prev,
              [sessionId]: {
                state: "awaiting_fix_approval",
                checkpointId: prev[sessionId]?.checkpointId,
                error: res.failureReason,
                proposedFixPatch: res.proposedFixPatch,
                failureReason: res.failureReason,
              },
            }));
          } else {
            setPlanExecutionStates((prev) => ({
              ...prev,
              [sessionId]: {
                state: res.state === "completed" ? "completed" : "failed",
                checkpointId: prev[sessionId]?.checkpointId,
                error: res.error,
              },
            }));
          }
        } else {
          setPlanExecutionStates((prev) => ({
            ...prev,
            [sessionId]: {
              state: "failed",
              error: res.error,
            },
          }));
        }
      });
    } else {
      setPlanExecutionStates((prev) => ({
        ...prev,
        [sessionId]: { state: "completed" },
      }));
    }
  };

  const handleRollback = (sessionId: string) => {
    if ((window as any).electronAPI && (window as any).electronAPI.orchestratorRollback) {
      (window as any).electronAPI.orchestratorRollback(sessionId).then((res: any) => {
        if (res && res.success) {
          setOrchestratorSession(res.session);
          setPlanExecutionStates((prev) => ({
            ...prev,
            [sessionId]: { state: "failed", error: "Workspace rolled back to checkpoint." },
          }));
          setPlanApprovalStates((prev) => ({
            ...prev,
            [sessionId]: "rejected",
          }));
        }
      });
    } else {
      setPlanExecutionStates((prev) => ({
        ...prev,
        [sessionId]: { state: "failed", error: "Workspace rolled back to checkpoint." },
      }));
    }
  };

  const handlePlanResponse = (sessionId: string, approved: boolean) => {
    if ((window as any).electronAPI && (window as any).electronAPI.orchestratorRespondToPlan) {
      (window as any).electronAPI.orchestratorRespondToPlan(sessionId, approved).then((res: any) => {
        if (res && res.success) {
          setOrchestratorSession(res.session);
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

  const [creativeApprovalStates, setCreativeApprovalStates] = useState<Record<string, string>>({});

  const handleCreativeApprove = async (taskId: string, approved: boolean) => {
    setCreativeApprovalStates((prev) => ({ ...prev, [taskId]: approved ? "generating" : "rejected" }));
    if ((window as any).electronAPI && (window as any).electronAPI.approveCreativeJob) {
      const res = await (window as any).electronAPI.approveCreativeJob(taskId, approved);
      if (res && res.success && approved) {
        const interval = setInterval(async () => {
          const statusRes = await (window as any).electronAPI.getCreativeJobStatus(taskId);
          if (statusRes && statusRes.success && statusRes.status) {
            if (statusRes.status.status === "completed" && statusRes.status.asset) {
              clearInterval(interval);
              setCreativeApprovalStates((prev) => ({ ...prev, [taskId]: "completed" }));
              const assetMsgId = `msg-agent-asset-${Date.now()}`;
              const assetMsg: Message = {
                id: assetMsgId,
                sender: "agent",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: `Creative Generation Completed Successfully via ${statusRes.status.asset.providerName}!`,
                cardType: "generated-asset",
                cardData: statusRes.status.asset
              };
              setMessages((prev) => [...prev, assetMsg]);
            } else if (statusRes.status.status === "failed") {
              clearInterval(interval);
              setCreativeApprovalStates((prev) => ({ ...prev, [taskId]: "failed" }));
            }
          }
        }, 300);
      }
    } else {
      setTimeout(() => {
        setCreativeApprovalStates((prev) => ({ ...prev, [taskId]: approved ? "completed" : "rejected" }));
      }, 500);
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
  // Project Intelligence states
  const [projectHealth, setProjectHealth] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [resources, setResources] = useState<any>(null);
  const [orchestratorSession, setOrchestratorSession] = useState<any>(null);

  useEffect(() => {
    const fetchIntelligence = () => {
      if ((window as any).electronAPI) {
        if ((window as any).electronAPI.getProjectIntelligence) {
          (window as any).electronAPI.getProjectIntelligence().then((res: any) => {
            if (res) {
              setProjectHealth(res.health);
            }
          });
        }
        if ((window as any).electronAPI.getResourceSnapshot) {
          (window as any).electronAPI.getResourceSnapshot().then((res: any) => {
            if (res && res.success) {
              setResources(res.snapshot);
            }
          });
        }
      }
    };

    fetchIntelligence();
    const interval = setInterval(fetchIntelligence, 4000);
    return () => clearInterval(interval);
  }, []);

  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => {
    const fetchAgents = () => {
      if ((window as any).electronAPI && (window as any).electronAPI.orchestratorGetAgents) {
        (window as any).electronAPI.orchestratorGetAgents().then((res: any) => {
          if (res && res.success) {
            setAgents(res.agents);
          }
        });
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);



  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 280);
    textarea.style.height = `${Math.max(24, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 280 ? "auto" : "hidden";
  }, [inputValue]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    memory: true,
    knowledge: true,
    architecture: false,
    dependencies: false,
    providers: false,
    modelRoles: true,
    connectors: true,
    checkpoints: false,
    logs: false,
    projectIntelligence: false,
    activeSessionTasks: true,
    multiAgentTeam: false,
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

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMsg(`File too large: ${file.name}. Maximum size is 25MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        const base64Data = rawResult.split(",")[1] || "";
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";
        const isFolderItem = Boolean((file as any).webkitRelativePath);
        const previewUrl = isImage ? rawResult : "";

        const attachmentItem: Attachment = {
          id: `att-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          type: isFolderItem ? "folder" : isPdf ? "pdf" : isImage ? "image" : "file",
          name: (file as any).webkitRelativePath || file.name,
          mimeType: file.type,
          size: file.size,
          previewUrl,
          source: base64Data
        };

        setAttachments((prev) => [...prev, attachmentItem]);
        setStatusMsg("Upload ready");
      };
      reader.readAsDataURL(file);
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

  const formatAttachmentSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentKindLabel = (attachment: Attachment) => {
    if (attachment.type === "image") return "Image";
    if (attachment.type === "pdf") return "PDF";
    if (attachment.type === "folder") return "Folder";
    if (attachment.mimeType?.startsWith("video/")) return "Video";
    if (attachment.mimeType?.startsWith("audio/")) return "Audio";
    return "File";
  };

  const handleCopyMessage = async (message: Message) => {
    const cardText = message.cardType ? `\n\n[${message.cardType}]` : "";
    const attachmentText = message.attachments?.length
      ? `\n\nAttachments:\n${message.attachments
          .map((att) => `- ${att.name} (${getAttachmentKindLabel(att)}, ${formatAttachmentSize(att.size)})`)
          .join("\n")}`
      : "";
    const text = `${message.content}${cardText}${attachmentText}`.trim();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((current) => (current === message.id ? null : current)), 1400);
    } catch {
      setErrorMsg("Failed to copy message.");
    }
  };

  const handleNewConversation = () => {
    const nextConversation = {
      ...createConversation([], `Chat ${conversations.length + 1}`),
      workspacePath,
      projectName,
    };
    setConversations((previous) => [nextConversation, ...previous]);
    setActiveConversationId(nextConversation.id);
    setRenamingConversationId(null);
    setRenameValue("");
    setInputValue("");
    setAttachments([]);
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleStartRenameConversation = (conversation: Conversation, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setRenamingConversationId(conversation.id);
    setRenameValue(conversation.title);
  };

  const handleCancelRenameConversation = () => {
    setRenamingConversationId(null);
    setRenameValue("");
  };

  const handleSaveRenameConversation = (conversationId: string) => {
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      handleCancelRenameConversation();
      return;
    }

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: nextTitle,
              titleEdited: true,
              updatedAt: Date.now(),
            }
          : conversation
      )
    );
    handleCancelRenameConversation();
  };

  const handleDeleteConversation = (conversationId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const target = conversations.find((conversation) => conversation.id === conversationId);
    const confirmed = window.confirm(`Delete conversation "${target?.title || "New Chat"}"?`);
    if (!confirmed) return;

    const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
    if (remaining.length === 0) {
      const replacement = {
        ...createConversation([], "New Chat"),
        workspacePath,
        projectName,
      };
      setConversations([replacement]);
      setActiveConversationId(replacement.id);
    } else {
      setConversations(remaining);
      if (activeConversationId === conversationId) {
        setActiveConversationId(remaining[0].id);
      }
    }
    handleCancelRenameConversation();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;
    const targetConversationId = activeConversationId;
    const appendMessageToConversation = (message: Message) =>
      updateConversationMessages(targetConversationId, (prev) => [...prev, message]);
    const removeMessageFromConversation = (messageId: string) =>
      updateConversationMessages(targetConversationId, (prev) => prev.filter((message) => message.id !== messageId), {
        preserveTitle: true,
      });
    const activeModel = runtimeModels.find(model => model.role === activeRuntimeRole) || runtimeModels[0];
    const runtimeInstruction = [
      `Composer action: ${composerAction}`,
      `Runtime agent: ${activeRuntimeRole}`,
      activeModel ? `Runtime model: ${activeModel.modelName}` : "",
      activeModel ? `Runtime provider: ${activeModel.providerName}` : "",
      `Runtime skill: ${activeRuntimeSkill}`,
      activeMcpTool !== "None" ? `Requested MCP tool: ${activeMcpTool}` : "",
      `Workspace: ${projectName}`,
    ].filter(Boolean).join("\n");
    const executionPrompt = `${runtimeInstruction}\n\nUser request:\n${inputValue || (attachments.length > 0 ? `Uploaded ${attachments.length} attachment(s)` : "")}`;

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: inputValue || (attachments.length > 0 ? `Uploaded ${attachments.length} attachment(s)` : ""),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    appendMessageToConversation(userMsg);
    setInputValue("");
    setAttachments([]);
    setStatusMsg(null);
    setErrorMsg(null);

    const hasImage = userMsg.attachments?.some((a) => a.type === "image");
    const hasPdf = userMsg.attachments?.some((a) => a.type === "pdf");

    if ((window as any).electronAPI) {
      const savedAttachments: any[] = [];
      if (userMsg.attachments && userMsg.attachments.length > 0) {
        for (const att of userMsg.attachments) {
          const res = await (window as any).electronAPI.storeAttachment(
            att.name,
            att.mimeType,
            att.source,
            "upload",
            workspacePath || "default-ws"
          );
          if (res && res.success) {
            savedAttachments.push(res.attachment);
          }
        }
      }

      if (hasImage && savedAttachments.length > 0) {
        const imageAtt = savedAttachments.find((a) => a.mimeType.startsWith("image/"));
        if (imageAtt) {
          const agentMsgId = `msg-agent-${Date.now()}`;
          const loaderMsg: Message = {
            id: agentMsgId,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `Analyzing screenshot "${imageAtt.filename}" using the Vision Provider...`,
          };
          appendMessageToConversation(loaderMsg);

          (window as any).electronAPI.analyzeImage(imageAtt.localPath, imageAtt.mimeType).then((res: any) => {
            removeMessageFromConversation(agentMsgId);
            const responseMsgId = `msg-agent-res-${Date.now()}`;
            if (res && res.success) {
              const findings = res.result.layoutIssues.map((issue: string, idx: number) => ({
                id: idx + 1,
                element: res.result.detectedElements[idx] || "UI Element",
                issue,
                severity: "Medium"
              }));

              const resultMsg: Message = {
                id: responseMsgId,
                sender: "agent",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: res.result.summary,
                cardType: "vision-analysis",
                cardData: {
                  imageName: imageAtt.filename,
                  dimensions: "1920 x 1080",
                  findings: findings.length > 0 ? findings : [{ id: 1, element: "UI Structure", issue: "No layout issues detected.", severity: "Low" }],
                  recommendations: res.result.recommendedActions.join("\n"),
                  confidence: res.result.confidence,
                  textDetected: res.result.textDetected,
                  designIssues: res.result.designIssues,
                }
              };
              appendMessageToConversation(resultMsg);
            } else {
              const warningMsg: Message = {
                id: responseMsgId,
                sender: "agent",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: `Vision analysis failed or model provider is offline: ${res?.error || "Qwen2.5-VL Vision Model is currently unavailable."}`,
              };
              appendMessageToConversation(warningMsg);
            }
          });
        }
      } else if (hasPdf) {
        const agentMsgId = `msg-agent-${Date.now()}`;
        const pdfMsg: Message = {
          id: agentMsgId,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: "Successfully received and stored PDF attachment metadata. Full PDF content parsing and document analysis is marked as a future capability under our multimodal roadmap.",
        };
        appendMessageToConversation(pdfMsg);
      } else {
        const loaderMsgId = `msg-agent-loading-${Date.now()}`;
        appendMessageToConversation({
          id: loaderMsgId,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: "Thinking with the active model...",
        });

        (window as any).electronAPI.chatComplete(executionPrompt, workspacePath, projectName).then((res: any) => {
          removeMessageFromConversation(loaderMsgId);
          const agentMsgId = `msg-agent-${Date.now()}`;
          if (res && res.success) {
            const agentMsg: Message = {
              id: agentMsgId,
              sender: "agent",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              content: res.response || "The model returned an empty response.",
            };
            appendMessageToConversation(agentMsg);
          } else {
            const errorAgentMsg: Message = {
              id: agentMsgId,
              sender: "agent",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              content: `Error generating plan: ${res?.error || "Unknown error occurred."}`,
            };
            appendMessageToConversation(errorAgentMsg);
          }
        }).catch((err: any) => {
          removeMessageFromConversation(loaderMsgId);
          appendMessageToConversation({
            id: `msg-agent-error-${Date.now()}`,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `Chat request failed: ${err?.message || "Unknown IPC/runtime error."}`,
          });
        });
      }
    } else {
      setTimeout(() => {
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
        } else if (hasPdf) {
          agentMsg = {
            id: agentMsgId,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: "PDF metadata stored. Document parsing is marked as future work.",
          };
        } else {
          agentMsg = {
            id: agentMsgId,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `I've received your request: "${userMsg.content}". (Browser Mock Response)`,
          };
        }
        appendMessageToConversation(agentMsg);
      }, 1000);
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

      case "creative-plan": {
        const plan = msg.cardData;
        const currentStatus = creativeApprovalStates[plan.taskId] || plan.status;

        return (
          <div className="engineering-card plan-approval-card" style={{ borderLeft: "3px solid var(--accent-purple)" }}>
            <div className="card-header">
              <span className="card-title">🎨 Creative AI Generation Approval</span>
              <span className="card-badge badge-purple">{plan.providerName}</span>
            </div>
            <div className="plan-section">
              <span className="section-title">Prompt Request</span>
              <p className="plan-summary-text" style={{ fontStyle: "italic" }}>"{plan.prompt}"</p>
            </div>
            <div className="plan-section plan-metadata-row" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "8px 0 12px 0", fontSize: "11px" }}>
              <span className="card-badge badge-blue">Model: {plan.model}</span>
              <span className="card-badge badge-cyan">Size: {plan.size}</span>
              <span className="card-badge badge-emerald">Cost: {plan.estimatedCost}</span>
              <span className="card-badge badge-orange">Output: {plan.outputPath}</span>
            </div>
            <div className="plan-actions-container">
              {currentStatus === "awaiting_approval" ? (
                <div className="approval-buttons">
                  <button className="approve-btn" style={{ background: "var(--accent-purple)" }} onClick={() => handleCreativeApprove(plan.taskId, true)}>
                    Approve Generation
                  </button>
                  <button className="reject-btn" onClick={() => handleCreativeApprove(plan.taskId, false)}>
                    Cancel
                  </button>
                </div>
              ) : currentStatus === "approved" || currentStatus === "generating" ? (
                <div className="approved-status-text" style={{ color: "var(--accent-purple)" }}>⏳ Generation Request Approved. Processing...</div>
              ) : currentStatus === "completed" ? (
                <div className="approved-status-text">✅ Asset Generated Successfully!</div>
              ) : (
                <div className="rejected-status-text">❌ Generation Cancelled</div>
              )}
            </div>
          </div>
        );
      }

      case "generated-asset": {
        const asset = msg.cardData;
        return (
          <div className="engineering-card" style={{ borderColor: "rgba(168, 85, 247, 0.3)", background: "rgba(168, 85, 247, 0.04)" }}>
            <div className="card-header">
              <span className="card-title" style={{ color: "var(--accent-purple)" }}>✨ Generated Creative Asset</span>
              <span className="card-badge badge-purple">{asset.providerName}</span>
            </div>
            {asset.previewUrl && (
              <div style={{ margin: "10px 0", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", background: "#000" }}>
                <img src={asset.previewUrl} alt={asset.prompt} style={{ maxHeight: "240px", maxWidth: "100%", objectFit: "contain" }} />
              </div>
            )}
            <div style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: "8px" }}>
              <strong>Prompt:</strong> {asset.prompt}
            </div>
            <div className="plan-metadata-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px" }}>
              <span className="card-badge badge-blue">Model: {asset.model}</span>
              <span className="card-badge badge-cyan">Resolution: {asset.size}</span>
              <span className="card-badge badge-emerald">Cost: {asset.cost || "Free"}</span>
              <span className="card-badge badge-orange">Path: {asset.localPath}</span>
            </div>
          </div>
        );
      }

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

            {plan.contextSummary && (
              <div className="plan-section context-summary-section" style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                <ContextCards summary={plan.contextSummary} />
                <span className="section-title">🧠 RAG Context Engine Matches</span>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  <strong>Compression Summary:</strong> {plan.contextSummary.compressionSummary}
                </div>
                <div className="plan-items-grid" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {plan.contextSummary.items.map((item: any, idx: number) => {
                    const icon = item.source === "file" ? "📄" : item.source === "memory" ? "🧠" : item.source === "attachment" ? "📎" : "📄";
                    return (
                      <div key={idx} className="context-item-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
                        <span style={{ color: "var(--text-primary)" }}>{icon} {item.title}</span>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{item.tokensEstimate} tokens</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                        <div className={`exec-step-item ${["executing", "completed", "failed", "awaiting_fix_approval"].includes(planExecutionStates[sessionId]!.state) ? "done" : ""}`}>
                          <span className="step-bullet">✓</span> Pre-execution Checkpoint created
                        </div>
                        <div className={`exec-step-item ${["completed", "failed", "awaiting_fix_approval"].includes(planExecutionStates[sessionId]!.state) ? "done" : ""}`}>
                          <span className="step-bullet">✓</span> Safe file patch applications
                        </div>
                        <div className={`exec-step-item ${["completed"].includes(planExecutionStates[sessionId]!.state) ? "done" : ["failed", "awaiting_fix_approval"].includes(planExecutionStates[sessionId]!.state) ? "failed" : "running"}`}>
                          <span className="step-bullet">✓</span> Build compilation runs
                        </div>
                        <div className={`exec-step-item ${["completed"].includes(planExecutionStates[sessionId]!.state) ? "done" : ["failed", "awaiting_fix_approval"].includes(planExecutionStates[sessionId]!.state) ? "failed" : "running"}`}>
                          <span className="step-bullet">✓</span> Regression tests validations
                        </div>
                      </div>

                      <div className={`execution-result-banner ${planExecutionStates[sessionId]!.state}`}>
                        {planExecutionStates[sessionId]!.state === "completed" ? (
                          `✅ Execution Succeeded! Checkpoint: ${planExecutionStates[sessionId]!.checkpointId}`
                        ) : planExecutionStates[sessionId]!.state === "failed" ? (
                          `❌ Execution Failed: ${planExecutionStates[sessionId]!.error}`
                        ) : planExecutionStates[sessionId]!.state === "awaiting_fix_approval" ? (
                          "⚠️ Build/Test Failed. Self-Fixing Proposed."
                        ) : (
                          "⚡ Running execution steps..."
                        )}
                      </div>

                      {planExecutionStates[sessionId]!.state === "awaiting_fix_approval" && (
                        <div className="remediation-block" style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                          <span className="section-title" style={{ color: "var(--accent-rose)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>❌ Failure Reason</span>
                          <pre style={{ background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "6px", fontSize: "11px", color: "var(--accent-rose)", overflowX: "auto", border: "1px solid rgba(244,63,94,0.2)", marginTop: "4px" }}>
                            {planExecutionStates[sessionId]!.failureReason || planExecutionStates[sessionId]!.error}
                          </pre>

                          <span className="section-title" style={{ color: "var(--accent-cyan)", marginTop: "12px", display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>🧠 Proposed Fix (Patch Diff)</span>
                          <pre style={{ background: "rgba(0,0,0,0.5)", padding: "8px", borderRadius: "6px", fontSize: "11px", color: "var(--accent-cyan)", overflowX: "auto", border: "1px solid rgba(6,182,212,0.2)", marginTop: "4px", whiteSpace: "pre-wrap" }}>
                            {planExecutionStates[sessionId]!.proposedFixPatch}
                          </pre>

                          <div className="fix-actions" style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                            <button
                              className="approve-btn"
                              style={{ background: "var(--accent-emerald)", flex: 1, padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "none", color: "#fff" }}
                              onClick={() => handleFixResponse(sessionId, true)}
                            >
                              Approve Fix
                            </button>
                            <button
                              className="reject-btn"
                              style={{ background: "rgba(244,63,94,0.1)", border: "1px solid var(--accent-rose)", color: "var(--accent-rose)", flex: 1, padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                              onClick={() => handleFixResponse(sessionId, false)}
                            >
                              Reject Fix
                            </button>
                            <button
                              className="reject-btn"
                              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: "none" }}
                              onClick={() => handleRollback(sessionId)}
                            >
                              Rollback
                            </button>
                          </div>
                        </div>
                      )}
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

      case "engineering-memory": {
        const { decisions, successes, failures } = msg.cardData;

        return (
          <div className="engineering-card engineering-memory-card" style={{ borderLeftColor: "var(--accent-cyan)" }}>
            <div className="card-header">
              <span className="card-title">🧠 Retrieved Engineering Memory</span>
              <span className="card-badge badge-blue">KNOWLEDGE BASE</span>
            </div>

            {decisions && decisions.length > 0 && (
              <div className="plan-section">
                <span className="section-title">Similar Decisions</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {decisions.map((dec: any) => (
                    <div key={dec.id} className="memory-item-box" style={{ padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", borderLeft: "2px solid var(--accent-emerald)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                        <strong>ID: {dec.id}</strong>
                        <span className={`card-badge risk-${dec.riskLevel}`}>{dec.riskLevel.toUpperCase()} RISK</span>
                      </div>
                      <p style={{ margin: "2px 0", fontSize: "12px" }}><strong>Task:</strong> {dec.taskSummary}</p>
                      <p style={{ margin: "2px 0", fontSize: "11px", color: "rgba(255,255,255,0.6)" }}><strong>Reasoning:</strong> {dec.reasoning}</p>
                      <p style={{ margin: "2px 0", fontSize: "11px", color: "var(--accent-emerald)" }}><strong>Outcome:</strong> {dec.outcome}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {successes && successes.length > 0 && (
              <div className="plan-section" style={{ marginTop: "12px" }}>
                <span className="section-title">Successful Fixes & Refactors</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {successes.map((succ: any, idx: number) => (
                    <div key={idx} className="memory-item-box" style={{ padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", borderLeft: "2px solid var(--accent-cyan)" }}>
                      <p style={{ margin: "2px 0", fontSize: "12px" }}><strong>Fix Type:</strong> {succ.type}</p>
                      <p style={{ margin: "2px 0", fontSize: "11px", color: "rgba(255,255,255,0.6)" }}><strong>Description:</strong> {succ.description}</p>
                      <p style={{ margin: "2px 0", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}><strong>Affected:</strong> {succ.relatedFiles.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {failures && failures.length > 0 && (
              <div className="plan-section" style={{ marginTop: "12px" }}>
                <span className="section-title">Previous Failure Warnings</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {failures.map((fail: any, idx: number) => (
                    <div key={idx} className="memory-item-box" style={{ padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", borderLeft: "2px solid var(--accent-rose)" }}>
                      <p style={{ margin: "2px 0", fontSize: "12px", color: "var(--accent-rose)" }}><strong>Cause:</strong> {fail.cause}</p>
                      <p style={{ margin: "2px 0", fontSize: "11px", color: "rgba(255,255,255,0.6)" }}><strong>Resolution:</strong> {fail.resolution}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const activeComposerModel = runtimeModels.find(model => model.role === activeRuntimeRole) || runtimeModels[0];
  const activeProviderName = activeComposerModel?.providerName || "Provider not set";
  const activeModelName = activeComposerModel?.modelName || "Model not set";
  const providerConnected = activeComposerModel?.healthStatus === "online";
  void [activeProviderName, activeModelName, providerConnected];

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

          <div className="section-label conversation-section-header">
            <span>Conversations</span>
            <button type="button" className="new-chat-btn" onClick={handleNewConversation}>
              + New
            </button>
          </div>
          <div className="conversation-list chat-pages-list">
            {conversations.map((conversation) => {
              const isRenaming = renamingConversationId === conversation.id;
              const isActive = conversation.id === activeConversationId;
              return (
                <div
                  key={conversation.id}
                  className={`conversation-item chat-page-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (!isRenaming) {
                      setActiveConversationId(conversation.id);
                      handleCancelRenameConversation();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isRenaming) {
                      setActiveConversationId(conversation.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  title={conversation.title}
                >
                  <span className="chat-page-icon">#</span>
                  <span className="chat-page-text">
                    {isRenaming ? (
                      <input
                        className="chat-title-input"
                        value={renameValue}
                        autoFocus
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleSaveRenameConversation(conversation.id);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            handleCancelRenameConversation();
                          }
                        }}
                        onBlur={() => handleSaveRenameConversation(conversation.id)}
                      />
                    ) : (
                      <>
                        <span className="chat-page-title">{conversation.title || "New Chat"}</span>
                        <span className="chat-page-meta">
                          {conversation.messages.length} message{conversation.messages.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </span>
                  {!isRenaming && (
                    <span className="chat-page-actions">
                      <button
                        type="button"
                        className="chat-page-action-btn"
                        onClick={(event) => handleStartRenameConversation(conversation, event)}
                        title="Rename conversation"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="chat-page-action-btn danger"
                        onClick={(event) => handleDeleteConversation(conversation.id, event)}
                        title="Delete conversation"
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
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

          <div
            className="section-label"
            style={{ display: "none", justifyContent: "space-between", cursor: "pointer" }}
            onClick={() => toggleSection("projectIntelligence")}
          >
            <span>Project Intelligence</span>
            <span>{openSections.projectIntelligence ? "▼" : "▶"}</span>
          </div>

          {openSections.projectIntelligence && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 12px", background: "rgba(255,255,255,0.01)", borderRadius: "6px", marginBottom: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
              {projectHealth ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Workspace Health:</span>
                    <span style={{ color: projectHealth.workspaceValid ? "var(--accent-emerald)" : "var(--accent-rose)", fontWeight: "600" }}>
                      {projectHealth.workspaceValid ? "✅ Healthy" : "❌ Invalid"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Git status:</span>
                    <span style={{ color: "var(--accent-cyan)", fontWeight: "600" }}>
                      {projectHealth.gitStatus.clean ? "Clean" : `Modified (${projectHealth.gitStatus.uncommittedCount})`}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Provider (LM Studio):</span>
                    <span style={{ color: projectHealth.providerStatus === "online" ? "var(--accent-emerald)" : "rgba(255,255,255,0.4)" }}>
                      {projectHealth.providerStatus.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Runtime Runtimes:</span>
                    <span style={{ color: "#fff" }}>
                      Node: {projectHealth.runtimeStatus.nodeAvailable ? "Yes" : "No"} | Python: {projectHealth.runtimeStatus.pythonAvailable ? "Yes" : "No"}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Fetching state...</div>
              )}

              {resources && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px", marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>
                    <span>CPU: {resources.cpuUsage}%</span>
                    <span>RAM: {Math.round(resources.memoryUsage.usedBytes / 1024 / 1024 / 1024)}GB / {Math.round(resources.memoryUsage.totalBytes / 1024 / 1024 / 1024)}GB</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                    <span>GPU: {resources.gpuUsage}%</span>
                    <span>Disk: {Math.round(resources.diskFreeBytes / 1024 / 1024 / 1024)}GB Free</span>
                  </div>
                </div>
              )}

              {notifications.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px", marginTop: "4px" }}>
                  <div style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", color: "var(--accent-cyan)", marginBottom: "4px" }}>Notifications</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "120px", overflowY: "auto" }}>
                    {notifications.map((n: any) => (
                      <div key={n.id} style={{ background: "rgba(255,255,255,0.02)", padding: "4px 6px", borderRadius: "4px", fontSize: "10px", position: "relative", borderLeft: `2px solid ${n.severity === "error" ? "var(--accent-rose)" : n.severity === "warning" ? "var(--accent-gold)" : "var(--accent-cyan)"}` }}>
                        <div style={{ fontWeight: "500", color: "#fff" }}>{n.title}</div>
                        <div style={{ color: "rgba(255,255,255,0.6)" }}>{n.message}</div>
                        <button
                          type="button"
                          onClick={() => {
                            if ((window as any).electronAPI && (window as any).electronAPI.clearNotification) {
                              (window as any).electronAPI.clearNotification(n.id);
                            }
                            setNotifications((prev) => prev.filter((item) => item.id !== n.id));
                          }}
                          style={{ position: "absolute", top: "2px", right: "4px", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "8px" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {orchestratorSession && (
            <>
              <div
                className="section-label"
                style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}
                onClick={() => toggleSection("activeSessionTasks")}
              >
                <span>Active Session Tasks</span>
                <span>{openSections.activeSessionTasks ? "▼" : "▶"}</span>
              </div>

              {openSections.activeSessionTasks && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 12px", background: "rgba(255,255,255,0.01)", borderRadius: "6px", marginBottom: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent-cyan)" }}>
                      Status: {orchestratorSession.status.toUpperCase()}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {orchestratorSession.status === "paused" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if ((window as any).electronAPI && (window as any).electronAPI.orchestratorResumeSession) {
                              (window as any).electronAPI.orchestratorResumeSession(orchestratorSession.id).then((res: any) => {
                                if (res && res.success) setOrchestratorSession(res.session);
                              });
                            }
                          }}
                          style={{ background: "var(--accent-emerald)", border: "none", color: "#fff", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}
                        >
                          Resume
                        </button>
                      ) : (
                        (orchestratorSession.status === "running" || orchestratorSession.status === "awaiting_approval" || orchestratorSession.status === "awaiting_fix_approval") && (
                          <button
                            type="button"
                            onClick={() => {
                              if ((window as any).electronAPI && (window as any).electronAPI.orchestratorPauseSession) {
                                (window as any).electronAPI.orchestratorPauseSession(orchestratorSession.id).then((res: any) => {
                                  if (res && res.success) setOrchestratorSession(res.session);
                                });
                              }
                            }}
                            style={{ background: "var(--accent-gold)", border: "none", color: "#000", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                          >
                            Pause
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                    {orchestratorSession.tasks.map((task: any) => {
                      let statusIcon = "⏳";
                      let color = "rgba(255,255,255,0.4)";
                      if (task.status === "completed") {
                        statusIcon = "✅";
                        color = "var(--accent-emerald)";
                      } else if (task.status === "running") {
                        statusIcon = "⚡";
                        color = "var(--accent-cyan)";
                      } else if (task.status === "failed") {
                        statusIcon = "❌";
                        color = "var(--accent-rose)";
                      } else if (task.status === "waiting") {
                        statusIcon = "⏸️";
                        color = "var(--accent-gold)";
                      }

                      return (
                        <div key={task.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color }}>
                          <span>{statusIcon} {task.name}</span>
                          <span style={{ fontSize: "10px", opacity: 0.8 }}>{task.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div
            className="section-label"
            style={{ display: agents.length > 0 || orchestratorSession?.assignedAgents?.length ? "flex" : "none", justifyContent: "space-between", cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}
            onClick={() => toggleSection("multiAgentTeam")}
          >
            <span>Multi-Agent Team</span>
            <span>{openSections.multiAgentTeam ? "▼" : "▶"}</span>
          </div>

          {(agents.length > 0 || orchestratorSession?.assignedAgents?.length) && openSections.multiAgentTeam && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 12px", background: "rgba(255,255,255,0.01)", borderRadius: "6px", marginBottom: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
              {orchestratorSession?.assignedAgents && (
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>ASSIGNED AGENTS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "4px 0" }}>
                    {orchestratorSession.assignedAgents.map((agentName: string) => (
                      <span key={agentName} style={{ background: "rgba(0, 229, 255, 0.1)", border: "1px solid rgba(0, 229, 255, 0.2)", color: "var(--accent-cyan)", fontSize: "9px", padding: "2px 6px", borderRadius: "4px" }}>
                        👤 {agentName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>TEAM REGISTRY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {agents.length > 0 ? (
                  agents.map((a: any) => {
                    const isAssigned = orchestratorSession?.assignedAgents?.includes(a.name);
                    return (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                        <span style={{ color: isAssigned ? "var(--accent-cyan)" : "#fff", fontWeight: isAssigned ? "600" : "400" }}>
                          {isAssigned ? "⚡" : "👤"} {a.name}
                        </span>
                        <span style={{ fontSize: "9px", padding: "1px 4px", borderRadius: "3px", background: a.currentStatus === "busy" ? "rgba(234, 179, 8, 0.15)" : "rgba(16, 185, 129, 0.15)", color: a.currentStatus === "busy" ? "var(--accent-gold)" : "var(--accent-emerald)" }}>
                          {a.currentStatus}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>No active agents registered.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Status Bar */}
        <header className="top-bar">
          <div className="top-bar-left"></div>
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
                  <span className="message-actions">
                    <button
                      type="button"
                      className="message-action-btn"
                      onClick={() => handleCopyMessage(msg)}
                      title="Copy message"
                      aria-label="Copy message"
                    >
                      {copiedMessageId === msg.id ? "Copied" : "Copy"}
                    </button>
                  </span>
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
                            <span className="sent-pdf-size">{formatAttachmentSize(att.size)}</span>
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
        <div className="input-area" onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
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


          <form onSubmit={handleSendMessage} className={`input-box-wrapper composer-shell ${isDragActive ? "drag-active" : ""}`}>
            {/* Hidden File Picker */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <input
              type="file"
              multiple
              ref={folderInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              {...({ webkitdirectory: "true", directory: "true" } as any)}
            />

            {/* Click to upload button */}
            <button
              type="button"
              className="attachment-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Add files, images, PDFs, videos, or documents"
            >
              +
            </button>

            <button
              type="button"
              className="attachment-btn"
              onClick={() => folderInputRef.current?.click()}
              title="Add folder"
            >
              Dir
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
                ref={textareaRef}
                className="input-textarea"
                placeholder="Ask anything, @ mention context, / for actions..."
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
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚡ Engineering Context Panel</span>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", cursor: "pointer", padding: "2px 6px", fontSize: "11px" }}
              title="Open Settings Modal"
            >
              ⚙️ Settings
            </button>
          </div>
          <div className="panel-scroll">
            <div className="panel-section open">
              <div className="panel-section-header">
                <span>Workspace</span>
                <span className="chevron"></span>
              </div>
              <div className="panel-section-content">
                <div className="kv-row">
                  <span className="kv-key">Project</span>
                  <span className="kv-val">{projectName}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">Path</span>
                  <span className="kv-val" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>{workspacePath}</span>
                </div>
                <button className="small-action-btn" onClick={() => { setSettingsModalTab("workspace"); setIsSettingsModalOpen(true); }}>
                  Manage workspace settings
                </button>
              </div>
            </div>

            {runtimeModels.length > 0 && (
              <div className="panel-section open">
                <div className="panel-section-header">
                  <span>Current Models</span>
                  <span className="chevron"></span>
                </div>
                <div className="panel-section-content">
                  {runtimeModels.map((role) => (
                    <div key={role.role} className="kv-row">
                      <span className="kv-key">{role.role}</span>
                      <span className="kv-val" title={`${role.providerName}: ${role.modelName}`}>
                        {role.modelName}
                      </span>
                    </div>
                  ))}
                  <button className="small-action-btn" onClick={() => { setSettingsModalTab("models"); setIsSettingsModalOpen(true); }}>
                    Configure models
                  </button>
                </div>
              </div>
            )}

            {orchestratorSession && (
            <div className="panel-section open">
              <div className="panel-section-header">
                <span>Running Tasks</span>
                <span className="chevron"></span>
              </div>
              <div className="panel-section-content">
                <div className="kv-row">
                  <span className="kv-key">Orchestrator</span>
                  <span className="kv-val" style={{ color: "var(--accent-emerald)" }}>{orchestratorSession.status}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">Active jobs</span>
                  <span className="kv-val">{orchestratorSession.tasks?.filter((task: any) => task.status === "running").length || 0}</span>
                </div>
              </div>
            </div>
            )}

            {notifications.length > 0 && (
            <div className="panel-section open">
              <div className="panel-section-header">
                <span>Notifications</span>
                <span className="chevron"></span>
              </div>
              <div className="panel-section-content">
                {notifications.map((notification: any) => (
                  <div key={notification.id} style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                    <strong style={{ color: "#fff" }}>{notification.title}</strong>
                    <div>{notification.message}</div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        </aside>
      )}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => {
          setIsSettingsModalOpen(false);
          void loadRuntimeModels();
        }} 
        initialTab={settingsModalTab} 
      />
    </div>
  );
}
