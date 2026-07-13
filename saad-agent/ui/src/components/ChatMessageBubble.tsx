import React, { useMemo, useState } from "react";

export interface ChatMessageBubbleProps {
  content: string;
  timestamp?: string;
  sender?: "user" | "agent";
}

export interface ContentSegment {
  type: "text" | "code";
  language?: string;
  code?: string;
  text?: string;
}

/**
 * Fast regex utility scanning for Arabic Unicode Characters (\u0600-\u06FF)
 */
export const isArabicText = (text: string): boolean => {
  return /[\u0600-\u06FF]/.test(text);
};

/**
 * Parses raw Markdown string into structured text and code segments
 */
export const parseMessageContent = (content: string): ContentSegment[] => {
  if (!content) return [];

  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        text: content.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "code",
      language: match[1] || "plaintext",
      code: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      text: content.slice(lastIndex),
    });
  }

  return segments;
};

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  content,
  timestamp,
}) => {
  const isLongContent = content.length > 180 || content.split("\n").length > 4;
  const [isExpanded, setIsExpanded] = useState<boolean>(!isLongContent);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const segments = useMemo(() => parseMessageContent(content), [content]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      className={`message-bubble-wrapper relative w-full min-w-0 max-w-full rounded-xl transition-all duration-300 ${
        isLongContent && !isExpanded ? "cursor-pointer select-none" : ""
      }`}
      onClick={() => {
        if (isLongContent && !isExpanded) {
          setIsExpanded(true);
        }
      }}
    >
      {/* Content Container with Max Height and Fade Gradient when Collapsed */}
      <div
        className={`message-segments-container space-y-2 relative overflow-hidden transition-all duration-300 ${
          isLongContent && !isExpanded ? "max-h-44 overflow-hidden" : ""
        }`}
      >
        {segments.map((segment, index) => {
          if (segment.type === "code") {
            return (
              <div
                key={index}
                dir="ltr"
                className="code-block-wrapper my-3 overflow-hidden rounded-lg border border-slate-800/80 bg-[#070d19] text-left shadow-lg dir-ltr"
                style={{ direction: "ltr", textAlign: "left" }}
                onClick={(e) => e.stopPropagation()}
              >
                {segment.language && (
                  <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-xs font-mono text-cyan-400">
                    <span>{segment.language}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(segment.code || "");
                      }}
                      className="code-copy-btn"
                      title="Copy code block"
                    >
                      Copy
                    </button>
                  </div>
                )}
                <pre
                  className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-slate-200 custom-scrollbar whitespace-pre"
                  style={{ direction: "ltr", textAlign: "left" }}
                >
                  <code>{segment.code}</code>
                </pre>
              </div>
            );
          }

          const textContent = segment.text || "";
          const hasArabic = isArabicText(textContent);

          return (
            <div
              key={index}
              dir="ltr"
              className="text-segment leading-relaxed break-words text-slate-100 text-left dir-ltr"
              style={{
                textAlign: "left",
                direction: "ltr",
                lineHeight: "1.65",
                whiteSpace: "pre-wrap",
                fontFamily: hasArabic
                  ? "'Outfit', 'Segoe UI', system-ui, sans-serif"
                  : "inherit",
              }}
            >
              {textContent}
            </div>
          );
        })}

        {/* Gradient Overlay for Compact Collapsed Messages */}
        {isLongContent && !isExpanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0d1527] via-[#0d1527]/80 to-transparent pointer-events-none flex items-end justify-center pb-1"
            style={{
              background:
                "linear-gradient(to top, rgba(13, 21, 39, 1) 0%, rgba(13, 21, 39, 0.85) 50%, transparent 100%)",
            }}
          ></div>
        )}
      </div>

      {/* Expand Bar / Notice when collapsed */}
      {isLongContent && !isExpanded && (
        <div
          className="mt-2 flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-xs font-medium transition-all cursor-pointer"
          onClick={handleToggleExpand}
        >
          <span>🔍 اضغط لرؤية الرسالة بالكامل</span>
          <span className="text-[10px] opacity-75">(Click to Expand)</span>
        </div>
      )}

      {/* Message Footer (Timestamp & Action Icons matching Telegram/WhatsApp design) */}
      <div
        className="message-bubble-footer flex items-center justify-end gap-2.5 mt-2 pt-1 border-t border-white/5 text-[11px] text-slate-400 select-none"
        dir="ltr"
        style={{ direction: "ltr" }}
      >
        {/* Collapse toggle button if currently expanded and long */}
        {isLongContent && isExpanded && (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="collapse-footer-btn"
            title="Collapse message"
          >
            <span>🔼 تصغير</span>
          </button>
        )}

        {/* Timestamp */}
        {timestamp && <span className="message-time-footer font-mono text-[10px] opacity-75">{timestamp}</span>}

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="copy-footer-btn flex items-center justify-center p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
          title={isCopied ? "Copied!" : "Copy message text"}
        >
          {isCopied ? (
            <span className="text-emerald-400 font-bold text-xs">✓</span>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>

        {/* Expand / Details Icon */}
        {isLongContent && (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="expand-footer-btn flex items-center justify-center p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
