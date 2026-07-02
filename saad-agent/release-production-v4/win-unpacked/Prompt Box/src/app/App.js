import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from "react";
import { Plus, RefreshCw, ChevronDown, Mic, ArrowUp, Check, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
const ACCEPTED_TEXT = [".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".html", ".css", ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".c", ".cpp", ".rs", ".go", ".pdf", ".docx", ".rtf"];
const ACCEPTED_IMAGE = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"];
function fileCategory(name) {
    const ext = "." + name.split(".").pop()?.toLowerCase();
    if (ACCEPTED_IMAGE.includes(ext))
        return "image";
    if (ACCEPTED_TEXT.includes(ext))
        return "text";
    return "other";
}
function formatSize(bytes) {
    if (bytes < 1024)
        return bytes + " B";
    if (bytes < 1024 * 1024)
        return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function FileChip({ file, onRemove }) {
    const Icon = file.type === "text" ? FileText : File;
    if (file.type === "image" && file.preview) {
        return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 }, transition: { duration: 0.15 }, className: "relative flex-shrink-0", style: { width: 72, height: 72 }, children: [_jsx("img", { src: file.preview, alt: file.name, className: "w-full h-full rounded-xl object-cover" }), _jsx("button", { onClick: onRemove, className: "absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full transition-colors", style: { background: "#555", color: "#fff" }, onMouseEnter: (e) => (e.currentTarget.style.background = "#777"), onMouseLeave: (e) => (e.currentTarget.style.background = "#555"), children: _jsx(X, { size: 11, strokeWidth: 3 }) })] }));
    }
    return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.85, y: 4 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.8 }, transition: { duration: 0.15 }, className: "flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg max-w-[200px]", style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }, children: [_jsx(Icon, { size: 14, style: { color: "#888", flexShrink: 0 }, strokeWidth: 1.75 }), _jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-[12px] leading-tight text-[#ccc] truncate", children: file.name }), _jsx("span", { className: "text-[10px] leading-tight", style: { color: "#666" }, children: formatSize(file.size) })] }), _jsx("button", { onClick: onRemove, className: "flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors", style: { color: "#666" }, onMouseEnter: (e) => (e.currentTarget.style.color = "#ccc"), onMouseLeave: (e) => (e.currentTarget.style.color = "#666"), children: _jsx(X, { size: 11, strokeWidth: 2.5 }) })] }));
}
export default function App() {
    const [value, setValue] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [approving, setApproving] = useState(false);
    const [files, setFiles] = useState([]);
    const [dragging, setDragging] = useState(false);
    const dragCounter = useRef(0);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const canSubmit = (value.trim().length > 0 || files.length > 0) && !submitted;
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta)
            return;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
    }, [value]);
    function processFiles(incoming) {
        if (!incoming)
            return;
        const next = [];
        Array.from(incoming).forEach((f) => {
            const cat = fileCategory(f.name);
            const entry = { id: crypto.randomUUID(), name: f.name, size: f.size, type: cat };
            if (cat === "image") {
                entry.preview = URL.createObjectURL(f);
            }
            next.push(entry);
        });
        setFiles((prev) => [...prev, ...next]);
    }
    function handleDragEnter(e) {
        e.preventDefault();
        dragCounter.current++;
        setDragging(true);
    }
    function handleDragLeave(e) {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0)
            setDragging(false);
    }
    function handleDragOver(e) {
        e.preventDefault();
    }
    function handleDrop(e) {
        e.preventDefault();
        dragCounter.current = 0;
        setDragging(false);
        processFiles(e.dataTransfer.files);
    }
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit)
                handleSubmit();
        }
    }
    function handleSubmit() {
        if (!canSubmit)
            return;
        setSubmitted(true);
        setTimeout(() => { setValue(""); setFiles([]); setSubmitted(false); textareaRef.current?.focus(); }, 1600);
    }
    function handleApprove() {
        setApproving(true);
        setTimeout(() => setApproving(false), 1400);
    }
    function removeFile(id) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }
    return (_jsxs("div", { className: "min-h-screen w-full flex flex-col items-center justify-center px-4", style: { background: "#1a1a1a", fontFamily: "'Inter', system-ui, sans-serif" }, onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop, children: [_jsx(AnimatePresence, { children: dragging && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 }, className: "fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none", style: { background: "rgba(20,20,20,0.88)", backdropFilter: "blur(4px)" }, children: _jsxs("div", { className: "flex flex-col items-center gap-3 px-10 py-8 rounded-2xl", style: { border: "2px dashed rgba(255,255,255,0.25)" }, children: [_jsxs("div", { className: "flex gap-3", children: [_jsx(ImageIcon, { size: 28, style: { color: "#888" }, strokeWidth: 1.5 }), _jsx(FileText, { size: 28, style: { color: "#888" }, strokeWidth: 1.5 })] }), _jsx("p", { className: "text-[15px] text-[#ccc] font-medium", children: "Drop files here" }), _jsx("p", { className: "text-[13px]", style: { color: "#666" }, children: "Images, documents, code, and more" })] }) })) }), _jsxs("div", { className: "w-full max-w-[700px]", children: [_jsxs("div", { className: "rounded-2xl overflow-visible transition-all duration-200", style: {
                            background: "#2d2d2d",
                            boxShadow: dragging ? "0 0 0 2px rgba(255,255,255,0.2)" : "none",
                        }, children: [_jsx(AnimatePresence, { children: files.length > 0 && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.2 }, className: "overflow-hidden", children: _jsx("div", { className: "flex flex-wrap gap-2 px-3 pt-3", children: _jsx(AnimatePresence, { children: files.map((f) => (_jsx(FileChip, { file: f, onRemove: () => removeFile(f.id) }, f.id))) }) }) })) }), _jsx("div", { className: "px-4 pt-3.5 pb-1", children: _jsx("textarea", { ref: textareaRef, value: value, onChange: (e) => setValue(e.target.value), onKeyDown: handleKeyDown, placeholder: "Ask for follow-up changes", rows: 1, className: "w-full resize-none bg-transparent outline-none text-[14px] leading-[1.55] placeholder:text-[#666] text-[#d4d4d4]", style: { minHeight: "24px", maxHeight: "180px", overflowY: "auto" } }) }), _jsxs("div", { className: "flex items-center justify-between px-2.5 pb-2.5 pt-1 gap-2", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: [...ACCEPTED_IMAGE, ...ACCEPTED_TEXT].join(","), className: "hidden", onChange: (e) => processFiles(e.target.files) }), _jsx("button", { onClick: () => fileInputRef.current?.click(), className: "flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150", style: { color: "#888" }, onMouseEnter: (e) => (e.currentTarget.style.color = "#ccc"), onMouseLeave: (e) => (e.currentTarget.style.color = "#888"), title: "Attach file", children: _jsx(Plus, { size: 16, strokeWidth: 2 }) }), _jsxs("button", { onClick: handleApprove, className: "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 select-none", style: { color: "#60a5fa", background: "transparent" }, onMouseEnter: (e) => (e.currentTarget.style.background = "rgba(96,165,250,0.1)"), onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"), children: [_jsx(motion.div, { animate: approving ? { rotate: 360 } : { rotate: 0 }, transition: approving ? { duration: 0.7, ease: "easeInOut" } : { duration: 0 }, children: _jsx(RefreshCw, { size: 13, strokeWidth: 2.25 }) }), _jsx("span", { children: "Approve for me" }), _jsx(ChevronDown, { size: 12, strokeWidth: 2.25, style: { opacity: 0.7 } })] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("button", { className: "flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150", style: { color: "#888" }, onMouseEnter: (e) => (e.currentTarget.style.color = "#ccc"), onMouseLeave: (e) => (e.currentTarget.style.color = "#888"), title: "Voice input", children: _jsx(Mic, { size: 15, strokeWidth: 1.75 }) }), _jsx(motion.button, { onClick: handleSubmit, disabled: !canSubmit, whileTap: canSubmit ? { scale: 0.88 } : {}, className: "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 overflow-hidden relative", style: {
                                                    background: canSubmit ? "#fff" : "#444",
                                                    color: canSubmit ? "#111" : "#666",
                                                    cursor: canSubmit ? "pointer" : "default",
                                                }, children: _jsx(AnimatePresence, { mode: "wait", children: submitted ? (_jsx(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, exit: { scale: 0 }, className: "absolute inset-0 flex items-center justify-center", children: _jsx(Check, { size: 13, strokeWidth: 3 }) }, "check")) : (_jsx(motion.div, { initial: { scale: 1 }, exit: { scale: 0 }, children: _jsx(ArrowUp, { size: 14, strokeWidth: 2.75 }) }, "arrow")) }) })] })] })] }), _jsxs("p", { className: "mt-2.5 text-center text-[12px]", style: { color: "#555" }, children: ["Drop files anywhere, or click ", _jsx("span", { style: { color: "#888" }, children: "+" }), " to browse"] })] })] }));
}
//# sourceMappingURL=App.js.map