import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { el } from "../lib/dom";
import { isInsideAdobe, evalES } from "../lib/cep";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  codeToRun?: string;
  execResult?: string;
  execError?: string;
  isExecuting?: boolean;
}

const SYSTEM_PROMPT = `You are Saad AI Copilot, a helpful AI video editor operating inside Adobe Premiere Pro.
You help the user automate editing workflows. When the user asks you to perform an editing action, you MUST generate a clean JavaScript ExtendScript code block wrapped in \`\`\`javascript or \`\`\`js.
The code will be evaluated directly inside the Premiere Pro ExtendScript runtime.

Basic guidelines for writing ExtendScript code:
1. Always check if a project and active sequence exist:
   var activeSeq = app.project ? app.project.activeSequence : null;
   if (!activeSeq) {
     alert("Please open a project and select a sequence first.");
   }
2. To import media files:
   app.project.importFiles(["C:\\\\path\\\\to\\\\file.mp4"]);
3. To work with tracks and clips:
   var videoTracks = activeSeq.videoTracks;
   var firstTrack = videoTracks[0];
   var clips = firstTrack.clips;
   for (var i = 0; i < clips.numItems; i++) {
     var clip = clips[i];
     // clip.start, clip.end, clip.name, clip.duration
   }
4. Focus strictly on executing the requested timeline changes, and avoid unnecessary UI elements.
5. All code must be ES3 compatible (no ES6 features like 'const', 'let', arrow functions '() =>', or Promises). Use 'var' for variable declarations.`;

export function AICopilotPage(): HTMLElement {
  const root = el("div.saad-curves-container");
  
  const messages: ChatMessage[] = [
    {
      role: "assistant",
      content: "أهلاً بك في Saad Copilot! اكتب ما تريده باللغة الطبيعية (مثال: زامن الصوت، أو طبق فلاتر معينة) وسأقوم بتوليد الكود اللازم لتعديل التايم لاين الخاص بك فوراً."
    }
  ];
  
  let isSending = false;
  let chatBox: HTMLElement;
  let inputEl: HTMLTextAreaElement;

  function extractCodeBlock(text: string): string | undefined {
    const match = text.match(/```(?:javascript|js)?([\s\S]*?)```/);
    return match ? match[1].trim() : undefined;
  }

  function cleanMessageText(text: string): string {
    return text.replace(/```(?:javascript|js)?[\s\S]*?```/g, "").trim();
  }

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text || isSending) return;
    
    inputEl.value = "";
    isSending = true;
    
    // Add user message
    messages.push({ role: "user", content: text });
    renderMessages();

    // Query active sequence for context
    let contextStr = "";
    if (isInsideAdobe()) {
      try {
        const info = await evalES<any>("getActiveSequenceInfo");
        if (info && info.name) {
          contextStr = `\n\n[Context: Active project has sequence named "${info.name}" at ${info.fps || 29.97} FPS, size ${info.width || 1920}x${info.height || 1080}]`;
        }
      } catch (_) {}
    }

    try {
      const messagesPayload = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: text + contextStr }
      ];

      const res = await api.chat(messagesPayload);
      const answer = res.choices?.[0]?.message?.content || "";
      
      if (!answer) {
        throw new Error("لم يرجع الذكاء الاصطناعي أي رد.");
      }

      const code = extractCodeBlock(answer);
      const cleanText = cleanMessageText(answer);

      messages.push({
        role: "assistant",
        content: cleanText || "تم توليد الكود البرمجي بنجاح:",
        codeToRun: code
      });

      // Refresh credits display
      store.refreshUser().catch(() => {});
    } catch (e) {
      messages.push({
        role: "assistant",
        content: "عذراً، حدث خطأ أثناء التحدث مع الخادم: " + (e as Error).message,
        error: true
      });
    } finally {
      isSending = false;
      renderMessages();
    }
  }

  function executeCode(msg: ChatMessage) {
    if (!msg.codeToRun || msg.isExecuting) return;
    
    msg.isExecuting = true;
    msg.execResult = undefined;
    msg.execError = undefined;
    renderMessages();

    const script = msg.codeToRun;
    if (!window.__adobe_cep__) {
      setTimeout(() => {
        msg.isExecuting = false;
        msg.execResult = "نجح التشغيل (بيئة تجريبية في المتصفح)";
        renderMessages();
      }, 1000);
      return;
    }

    window.__adobe_cep__.evalScript(script, (result) => {
      msg.isExecuting = false;
      if (result === "EvalScript error." || result === "EvalScript error") {
        msg.execError = "فشل تنفيذ الأمر داخل بريمير. يرجى مراجعة الكود أو محاولة صياغته بشكل آخر.";
      } else if (result.indexOf("Error") === 0) {
        msg.execError = result;
      } else {
        msg.execResult = "تم تنفيذ الأمر على التايم لاين بنجاح!";
        toast("Applied successfully");
      }
      renderMessages();
      store.refreshUser().catch(() => {});
    });
  }

  function renderMessages() {
    chatBox.replaceChildren();

    messages.forEach((msg) => {
      const bubble = el("div", {
        style: {
          background: msg.role === "user" ? "rgba(168, 85, 247, 0.15)" : "rgba(20, 31, 41, 0.6)",
          border: msg.role === "user" ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid rgba(255,255,255,0.06)",
          borderRadius: "8px",
          padding: "12px",
          maxWidth: "85%",
          alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
          color: msg.error ? "#fca5a5" : "#e0e0e0",
          fontSize: "13px",
          lineHeight: "1.5",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          whiteSpace: "pre-wrap",
          direction: "rtl",
          textAlign: "right"
        }
      });

      bubble.appendChild(el("span", null, msg.content));

      if (msg.codeToRun) {
        const codeBlock = el("pre", {
          style: {
            background: "rgba(10,18,26,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "monospace",
            overflowX: "auto",
            maxHeight: "120px",
            color: "#60a5fa",
            direction: "ltr",
            textAlign: "left"
          }
        }, msg.codeToRun);

        const btn = el("button.btn-primary", {
          onClick: () => executeCode(msg),
          disabled: msg.isExecuting,
          style: {
            alignSelf: "flex-start",
            padding: "6px 12px",
            fontSize: "12px",
            marginTop: "4px",
            backgroundColor: "#a855f7"
          }
        }, msg.isExecuting ? "جاري التشغيل..." : "تشغيل الأمر داخل بريمير");

        bubble.appendChild(codeBlock);
        bubble.appendChild(btn);
      }

      if (msg.execResult) {
        bubble.appendChild(el("div", { style: { color: "#10b981", fontSize: "12px", fontWeight: "bold", marginTop: "4px" } }, msg.execResult));
      }

      if (msg.execError) {
        bubble.appendChild(el("div", { style: { color: "#ef4444", fontSize: "12px", fontWeight: "bold", marginTop: "4px" } }, msg.execError));
      }

      chatBox.appendChild(bubble);
    });

    if (isSending) {
      chatBox.appendChild(el("div", {
        style: {
          alignSelf: "flex-start",
          color: "#9cb2c3",
          fontSize: "12px",
          fontStyle: "italic",
          padding: "6px 12px"
        }
      }, "جاري تفكير ومزامنة Copilot..."));
    }

    setTimeout(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 50);
  }

  function render() {
    root.replaceChildren();

    root.appendChild(Header());
    root.appendChild(PageHeader("Saad Copilot"));

    const mainContent = el("div.saad-curves-layout", {
      style: {
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "calc(100% - 100px)",
        boxSizing: "border-box"
      }
    });

    // Chat Box area
    chatBox = el("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        background: "rgba(10,18,26,0.4)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
        padding: "16px",
        maxHeight: "340px",
        minHeight: "260px"
      }
    });
    mainContent.appendChild(chatBox);

    // Quick Prompts list
    const quickPrompts = el("div", {
      style: {
        display: "flex",
        gap: "6px",
        overflowX: "auto",
        paddingBottom: "4px"
      }
    });
    
    const prompts = [
      "مزامنة الصوت",
      "إضافة انتقالات للقطع",
      "إزالة الصمت من تراك 1",
      "تلوين المشهد أسود وأبيض"
    ];

    prompts.forEach((p) => {
      quickPrompts.appendChild(el("button.btn-secondary", {
        onClick: () => {
          inputEl.value = p;
          inputEl.focus();
        },
        style: {
          padding: "4px 8px",
          fontSize: "11px",
          whiteSpace: "nowrap",
          opacity: "0.8"
        }
      }, p));
    });
    mainContent.appendChild(quickPrompts);

    // Input Bar
    inputEl = el("textarea", {
      placeholder: "اكتب أمر المونتاج باللغة الطبيعية هنا...",
      style: {
        width: "100%",
        height: "50px",
        padding: "10px 12px",
        background: "rgba(10,18,26,0.8)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "6px",
        color: "#fff",
        fontSize: "13px",
        resize: "none",
        boxSizing: "border-box"
      },
      onKeydown: (ev: KeyboardEvent) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          handleSend();
        }
      }
    }) as HTMLTextAreaElement;

    const sendBtn = el("button.btn-primary", {
      onClick: handleSend,
      style: {
        width: "100%",
        padding: "10px",
        backgroundColor: "#a855f7",
        marginTop: "6px"
      }
    }, "إرسال الطلب");

    const inputContainer = el("div", null, inputEl, sendBtn);
    mainContent.appendChild(inputContainer);

    root.appendChild(mainContent);
    renderMessages();
  }

  setTimeout(render, 0);

  return root;
}
