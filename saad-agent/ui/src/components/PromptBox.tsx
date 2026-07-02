import { useState, useRef, useEffect } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Plus, ChevronDown, ArrowUp, Check, X, FileText, File, Hand, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ACCEPTED_TEXT = [".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".html", ".css", ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".c", ".cpp", ".rs", ".go", ".pdf", ".docx", ".rtf"];
const ACCEPTED_IMAGE = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"];

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: "image" | "text" | "pdf" | "file" | "folder" | "other";
  previewUrl?: string;
  smartLongInput?: boolean;
  detectedFileType?: string;
  lineCount?: number;
};

interface PromptBoxProps {
  value: string;
  setValue: (val: string) => void;
  files: AttachedFile[];
  onAddFiles: (fileList: FileList) => void;
  onRemoveFile: (id: string) => void;
  onLongTextInput: (content: string, sourceKind: "clipboard" | "drag_drop" | "typed_long_input") => { attached: boolean; attachmentId?: string };
  onPasteAsTextAnyway: (content: string) => void;
  onAttachCurrentTextAsFile: () => boolean;
  onSubmit: () => void;
  activeApprovalMode: "ask" | "approve_for_me" | "full_access";
  setActiveApprovalMode: (mode: "ask" | "approve_for_me" | "full_access") => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  const Icon = file.type === "text" ? FileText : File;

  if (file.type === "image" && file.previewUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        className="relative flex-shrink-0"
        style={{ width: 72, height: 72 }}
      >
        <img
          src={file.previewUrl}
          alt={file.name}
          className="w-full h-full rounded-xl object-cover"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full transition-colors"
          style={{ background: "#555", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#777")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#555")}
        >
          <X size={11} strokeWidth={3} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg max-w-[200px]"
      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <Icon size={14} style={{ color: "#888", flexShrink: 0 }} strokeWidth={1.75} />
      <div className="flex flex-col min-w-0">
        <span className="text-[12px] leading-tight text-[#ccc] truncate">{file.name}</span>
        <span className="text-[10px] leading-tight" style={{ color: "#666" }}>{formatSize(file.size)}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors"
        style={{ color: "#666" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}

export function PromptBox({
  value,
  setValue,
  files,
  onAddFiles,
  onRemoveFile,
  onLongTextInput,
  onPasteAsTextAnyway,
  onAttachCurrentTextAsFile,
  onSubmit,
  activeApprovalMode,
  setActiveApprovalMode,
  isGenerating,
  onStopGeneration,
}: PromptBoxProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [longPasteNotice, setLongPasteNotice] = useState<{ text: string; previousValue: string; attachmentId?: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !isGenerating;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    const result = onLongTextInput(text, "clipboard");
    if (!result.attached) return;

    e.preventDefault();
    const reference = "Attached long pasted content as file.";
    setValue(value.trim() ? `${value.trim()}\n${reference}` : reference);
    setLongPasteNotice({ text, previousValue: value, attachmentId: result.attachmentId });
  }

  function handleAttachCurrentText() {
    const attached = onAttachCurrentTextAsFile();
    if (attached) {
      setLongPasteNotice(null);
    }
  }

  // Icons matching options
  const approvalModeOptions = [
    {
      value: "ask" as const,
      label: "Ask for approval",
      subtitle: "Always ask to edit extensions, run commands, use network",
      icon: Hand,
    },
    {
      value: "approve_for_me" as const,
      label: "Approve for me",
      subtitle: "Only ask for actions detecting high risk",
      icon: ShieldCheck,
    },
    {
      value: "full_access" as const,
      label: "Full access",
      subtitle: "Unrestricted access to the workspace",
      icon: ShieldAlert,
    },
  ];

  const currentMode = approvalModeOptions.find((opt) => opt.value === activeApprovalMode) || approvalModeOptions[0];
  const TriggerIcon = currentMode.icon;

  return (
    <div className="saad-prompt-root">
      <div
        className="saad-prompt-shell"
      >
        {/* Attached files previews */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="saad-prompt-attachments">
                <AnimatePresence>
                  {files.map((f) => (
                    <FileChip key={f.id} file={f} onRemove={() => onRemoveFile(f.id)} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="saad-prompt-input-row">
          <AnimatePresence>
            {longPasteNotice && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-2 text-[12px] text-cyan-100"
              >
                <span>Long pasted content was attached as a file.</span>
                <button
                  type="button"
                  className="rounded-md border border-cyan-400/30 px-2 py-1 text-cyan-50 hover:bg-cyan-400/10"
                  onClick={() => setLongPasteNotice(null)}
                >
                  Attach as file
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-600 px-2 py-1 text-zinc-100 hover:bg-zinc-800"
                  onClick={() => {
                    if (longPasteNotice.attachmentId) {
                      onRemoveFile(longPasteNotice.attachmentId);
                    }
                    onPasteAsTextAnyway(longPasteNotice.previousValue.trim()
                      ? `${longPasteNotice.previousValue.trim()}\n${longPasteNotice.text}`
                      : longPasteNotice.text);
                    setLongPasteNotice(null);
                  }}
                >
                  Paste as text anyway
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Ask for follow-up changes"
            rows={1}
            className="w-full resize-none bg-transparent outline-none text-[14px] leading-[1.55] placeholder:text-[#666] text-[#d4d4d4]"
            style={{ minHeight: "28px", maxHeight: "240px", overflowY: "auto" }}
          />
        </div>

        {/* Toolbar */}
        <div className="saad-prompt-toolbar">
          {/* Left Controls */}
          <div className="saad-prompt-toolbar-left">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={[...ACCEPTED_IMAGE, ...ACCEPTED_TEXT].join(",")}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onAddFiles(e.target.files);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="saad-prompt-icon-btn"
              style={{ color: "#888" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
              title="Attach file"
            >
              <Plus size={16} strokeWidth={2} />
            </button>

            {value.trim().length > 0 && (
              <button
                type="button"
                onClick={handleAttachCurrentText}
                className="saad-prompt-text-btn"
                style={{ color: "#9ca3af", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Attach current text as file"
              >
                <FileText size={14} strokeWidth={1.9} />
                <span>Attach as file</span>
              </button>
            )}

            {/* Approval Mode Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="saad-prompt-approval-btn"
                style={{ color: "#60a5fa", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(96,165,250,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <TriggerIcon size={14} strokeWidth={2.25} />
                <span>{currentMode.label}</span>
                <ChevronDown size={12} strokeWidth={2.25} style={{ opacity: 0.7 }} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-9 left-0 w-[300px] rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xl z-50"
                  >
                    <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-500">
                      How should Codex actions be approved?
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {approvalModeOptions.map((opt) => {
                        const IconComponent = opt.icon;
                        const isSelected = activeApprovalMode === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setActiveApprovalMode(opt.value);
                              setDropdownOpen(false);
                            }}
                            className={`flex items-start gap-3 w-full p-2 rounded-lg text-left transition-colors duration-150 cursor-pointer ${
                              isSelected ? "bg-zinc-900" : "hover:bg-zinc-900/60"
                            }`}
                          >
                            <div className="mt-0.5 text-zinc-400">
                              <IconComponent size={15} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-zinc-200">
                                  {opt.label}
                                </span>
                                {isSelected && (
                                  <Check size={13} className="text-zinc-400" strokeWidth={3} />
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">
                                {opt.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Controls */}
          <div className="saad-prompt-toolbar-right">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="saad-prompt-stop-btn"
                title="Stop generation"
              >
                <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
              </button>
            ) : (
              <motion.button
                type="button"
                onClick={() => {
                  if (canSubmit) onSubmit();
                }}
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.88 } : {}}
                className={`saad-prompt-send-btn ${canSubmit ? "ready" : ""}`}
              >
                <ArrowUp size={14} strokeWidth={2.75} />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <p className="saad-prompt-drop-hint">
        Drop files anywhere, or click <span style={{ color: "#888" }}>+</span> to browse
      </p>
    </div>
  );
}
