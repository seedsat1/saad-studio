import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from "react";
import { Plus, RefreshCw, ChevronDown, Mic, ArrowUp, Check, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ACCEPTED_TEXT = [".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".html", ".css", ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".c", ".cpp", ".rs", ".go", ".pdf", ".docx", ".rtf"];
const ACCEPTED_IMAGE = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"];

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: "image" | "text" | "other";
  preview?: string;
};

function fileCategory(name: string): AttachedFile["type"] {
  const ext = "." + name.split(".").pop()?.toLowerCase();
  if (ACCEPTED_IMAGE.includes(ext)) return "image";
  if (ACCEPTED_TEXT.includes(ext)) return "text";
  return "other";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  const Icon = file.type === "text" ? FileText : File;

  if (file.type === "image" && file.preview) {
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
          src={file.preview}
          alt={file.name}
          className="w-full h-full rounded-xl object-cover"
        />
        <button
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

export default function App() {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [approving, setApproving] = useState(false);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !submitted;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [value]);

  function processFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next: AttachedFile[] = [];
    Array.from(incoming).forEach((f) => {
      const cat = fileCategory(f.name);
      const entry: AttachedFile = { id: crypto.randomUUID(), name: f.name, size: f.size, type: cat };
      if (cat === "image") {
        entry.preview = URL.createObjectURL(f);
      }
      next.push(entry);
    });
    setFiles((prev) => [...prev, ...next]);
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) handleSubmit();
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitted(true);
    setTimeout(() => { setValue(""); setFiles([]); setSubmitted(false); textareaRef.current?.focus(); }, 1600);
  }

  function handleApprove() {
    setApproving(true);
    setTimeout(() => setApproving(false), 1400);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
      style={{ background: "#1a1a1a", fontFamily: "'Inter', system-ui, sans-serif" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-page drop overlay */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: "rgba(20,20,20,0.88)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl"
              style={{ border: "2px dashed rgba(255,255,255,0.25)" }}
            >
              <div className="flex gap-3">
                <ImageIcon size={28} style={{ color: "#888" }} strokeWidth={1.5} />
                <FileText size={28} style={{ color: "#888" }} strokeWidth={1.5} />
              </div>
              <p className="text-[15px] text-[#ccc] font-medium">Drop files here</p>
              <p className="text-[13px]" style={{ color: "#666" }}>Images, documents, code, and more</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[700px]">
        <div
          className="rounded-2xl overflow-visible transition-all duration-200"
          style={{
            background: "#2d2d2d",
            boxShadow: dragging ? "0 0 0 2px rgba(255,255,255,0.2)" : "none",
          }}
        >
          {/* Attached files */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 px-3 pt-3">
                  <AnimatePresence>
                    {files.map((f) => (
                      <FileChip key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <div className="px-4 pt-3.5 pb-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for follow-up changes"
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[14px] leading-[1.55] placeholder:text-[#666] text-[#d4d4d4]"
              style={{ minHeight: "24px", maxHeight: "180px", overflowY: "auto" }}
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1 gap-2">
            {/* Left */}
            <div className="flex items-center gap-1">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={[...ACCEPTED_IMAGE, ...ACCEPTED_TEXT].join(",")}
                className="hidden"
                onChange={(e) => processFiles(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
                style={{ color: "#888" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
                title="Attach file"
              >
                <Plus size={16} strokeWidth={2} />
              </button>

              {/* Approve for me */}
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 select-none"
                style={{ color: "#60a5fa", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(96,165,250,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <motion.div
                  animate={approving ? { rotate: 360 } : { rotate: 0 }}
                  transition={approving ? { duration: 0.7, ease: "easeInOut" } : { duration: 0 }}
                >
                  <RefreshCw size={13} strokeWidth={2.25} />
                </motion.div>
                <span>Approve for me</span>
                <ChevronDown size={12} strokeWidth={2.25} style={{ opacity: 0.7 }} />
              </button>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5">
              {/* Mic */}
              <button
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
                style={{ color: "#888" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
                title="Voice input"
              >
                <Mic size={15} strokeWidth={1.75} />
              </button>

              {/* Send */}
              <motion.button
                onClick={handleSubmit}
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.88 } : {}}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 overflow-hidden relative"
                style={{
                  background: canSubmit ? "#fff" : "#444",
                  color: canSubmit ? "#111" : "#666",
                  cursor: canSubmit ? "pointer" : "default",
                }}
              >
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute inset-0 flex items-center justify-center">
                      <Check size={13} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div key="arrow" initial={{ scale: 1 }} exit={{ scale: 0 }}>
                      <ArrowUp size={14} strokeWidth={2.75} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="mt-2.5 text-center text-[12px]" style={{ color: "#555" }}>
          Drop files anywhere, or click <span style={{ color: "#888" }}>+</span> to browse
        </p>
      </div>
    </div>
  );
}
