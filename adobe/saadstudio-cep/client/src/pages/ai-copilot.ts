import { Header } from "../components/header";
import { el } from "../lib/dom";
import { isInsideAdobe, evalES } from "../lib/cep";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { icon } from "../lib/icons";

interface SequenceInfo {
  name: string;
  projectName?: string;
  fps?: number;
  width?: number;
  height?: number;
}

export function AICopilotPage(): HTMLElement {
  const root = el("div.saad-curves-container", {
    style: {
      direction: "rtl",
      textAlign: "right",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }
  });

  // State
  let activeProject = "جاري الكشف...";
  let activeSequence = "لا يوجد تسلسل نشط";
  let promptText = "أنشئ مونتاجاً سينمائياً سريع الإيقاع، اختر أفضل اللقطات، احذف الأخطاء والصمت، وبدل الكاميرات حسب المتحدث.";
  let charCount = 118;
  
  let isAnalyzing = false;
  let isEditing = false;
  let progressPercent = 0;
  
  // Steps status: "waiting" | "loading" | "done" | "error"
  let stepStates = ["waiting", "waiting", "waiting", "waiting", "waiting"];
  let stats = { shots: 0, speakers: 0, audio: 0, video: 0 };
  
  let currentLog = "";
  let currentLogColor = "#9cb2c3";

  // Elements references
  let projectLabel: HTMLElement;
  let sequenceLabel: HTMLElement;
  let textareaEl: HTMLTextAreaElement;
  let charCounter: HTMLElement;
  
  let videoThumGrid: HTMLElement;
  let audioSpeakerRows: HTMLElement;
  let contentTranscriptList: HTMLElement;
  
  let statShotsEl: HTMLElement;
  let statSpeakersEl: HTMLElement;
  let statAudioEl: HTMLElement;
  let statVideoEl: HTMLElement;
  
  let stepItemsList: HTMLElement;
  let progressContainer: HTMLElement;
  let progressFillEl: HTMLElement;
  let progressTextEl: HTMLElement;
  
  let analyzeBtn: HTMLButtonElement;
  let startBtn: HTMLButtonElement;
  let logEl: HTMLElement;

  async function loadSequenceInfo() {
    if (isInsideAdobe()) {
      try {
        const info = await evalES<SequenceInfo>("getActiveSequenceInfo");
        if (info && info.name) {
          activeProject = info.projectName || "مشروع غير محفوظ";
          activeSequence = info.name;
        } else {
          activeProject = "لا يوجد مشروع مفتوح";
          activeSequence = "يرجى تحديد تسلسل";
        }
      } catch (_) {
        activeProject = "مشروع وثائقي";
        activeSequence = "Sequence 01";
      }
    } else {
      activeProject = "فيلم وثائقي - رحلة الإلهام";
      activeSequence = "Sequence 01";
    }
    if (projectLabel) projectLabel.textContent = activeProject;
    if (sequenceLabel) sequenceLabel.textContent = activeSequence;
  }

  // Generate XML/SVG icon paths for checklist items
  function getStatusIcon(status: string): HTMLElement {
    const iconContainer = el("div", {
      style: {
        width: "18px",
        height: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.15)"
      }
    });

    if (status === "done") {
      iconContainer.style.backgroundColor = "#10b981";
      iconContainer.style.borderColor = "#10b981";
      iconContainer.innerHTML = `<svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L3.5 6.5L1 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else if (status === "loading") {
      iconContainer.style.borderColor = "#0284c7";
      iconContainer.innerHTML = `<div class="saad-spinner" style="width: 10px; height: 10px; border: 2px solid #0284c7; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>`;
    } else if (status === "error") {
      iconContainer.style.backgroundColor = "#ef4444";
      iconContainer.style.borderColor = "#ef4444";
      iconContainer.innerHTML = `<span style="color:#fff; font-size:10px; font-weight:bold; line-height:1">!</span>`;
    } else {
      // Waiting
      iconContainer.style.backgroundColor = "transparent";
    }
    return iconContainer;
  }

  function updateStepsUI() {
    if (!stepItemsList) return;
    stepItemsList.replaceChildren();

    const steps = [
      { title: "اختيار أفضل اللقطات", desc: "جار تقييم اللقطات واختيار الأفضل جودة ومحتوى" },
      { title: "حذف الإعادات", desc: "تم تحديد الإعادات والمقاطع الزائدة للحذف" },
      { title: "تبديل الكاميرات", desc: "جار اختيار الزوايا الأنسب لكل متحدث ومشهد" },
      { title: "تنظيف الصوت", desc: "إزالة الضوضاء، وتقليل الصمت، وتوحيد المستويات" },
      { title: "ضبط الإيقاع", desc: "تحسين الإيقاع وسرعة القطع للحفاظ على التفاعل" }
    ];

    steps.forEach((step, idx) => {
      const state = stepStates[idx];
      const item = el("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: state === "loading" ? "rgba(2, 132, 199, 0.08)" : "transparent",
          borderRadius: "6px",
          border: state === "loading" ? "1px solid rgba(2, 132, 199, 0.2)" : "1px solid transparent",
          transition: "all 0.3s ease"
        }
      });

      const textCol = el("div", { style: { display: "flex", flexDirection: "column", gap: "2px" } });
      const titleLabel = el("span", {
        style: {
          fontSize: "13px",
          fontWeight: "600",
          color: state === "done" ? "#10b981" : (state === "loading" ? "#0284c7" : "#e2e8f0")
        }
      }, step.title);
      
      const descLabel = el("span", {
        style: {
          fontSize: "11px",
          color: state === "done" ? "rgba(16, 185, 129, 0.7)" : "rgba(148, 163, 184, 0.7)"
        }
      }, step.desc);

      textCol.appendChild(titleLabel);
      textCol.appendChild(descLabel);
      item.appendChild(textCol);
      item.appendChild(getStatusIcon(state));

      stepItemsList.appendChild(item);
    });
  }

  function updateLogUI(message: string, color = "#9cb2c3") {
    currentLog = message;
    currentLogColor = color;
    if (logEl) {
      logEl.textContent = currentLog;
      logEl.style.color = currentLogColor;
    }
  }

  function updateProgressUI(percent: number, show = true) {
    progressPercent = percent;
    if (progressContainer) progressContainer.style.display = show ? "flex" : "none";
    if (progressFillEl) progressFillEl.style.width = `${progressPercent}%`;
    if (progressTextEl) progressTextEl.textContent = `${progressPercent}%`; // updates the numerical text inside footer
  }

  function updateStatsUI() {
    if (statShotsEl) statShotsEl.textContent = stats.shots > 0 ? String(stats.shots) : "-";
    if (statSpeakersEl) statSpeakersEl.textContent = stats.speakers > 0 ? String(stats.speakers) : "-";
    if (statAudioEl) statAudioEl.textContent = stats.audio > 0 ? String(stats.audio) : "-";
    if (statVideoEl) statVideoEl.textContent = stats.video > 0 ? String(stats.video) : "-";
  }

  function updateAnalysisPanels(show = false) {
    if (!videoThumGrid || !audioSpeakerRows || !contentTranscriptList) return;

    if (show) {
      // Show mockup thumbnails based on actual video count
      const thumsCount = Math.max(1, Math.min(4, stats.video || 1));
      const thums = [];
      for (let num = 1; num <= thumsCount; num++) {
        thums.push(el("div", {
          style: {
            background: "rgba(10,18,26,0.8)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "4px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            color: "#64748b"
          }
        }, `شاهد ${num}`));
      }
      videoThumGrid.replaceChildren(...thums);

      // Show speaker percentages dynamically based on actual speakers count
      const speakerContainer = el("div", { style: { display:"flex", flexDirection:"column", gap:"6px", width:"100%" } });
      const numSpeakers = stats.speakers || 1;
      if (numSpeakers === 1) {
        speakerContainer.appendChild(el("div", { style: { display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#94a3b8" } },
          el("span", null, "المتحدث 1"), el("span", null, "100%")
        ));
        speakerContainer.appendChild(el("div", { style: { width:"100%", height:"4px", background:"#334155", borderRadius:"2px" } },
          el("div", { style: { width:"100%", height:"100%", background:"#3b82f6", borderRadius:"2px" } })
        ));
      } else if (numSpeakers === 2) {
        speakerContainer.appendChild(el("div", { style: { display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#94a3b8" } },
          el("span", null, "المتحدث 1"), el("span", null, "60%")
        ));
        speakerContainer.appendChild(el("div", { style: { width:"100%", height:"4px", background:"#334155", borderRadius:"2px" } },
          el("div", { style: { width:"60%", height:"100%", background:"#3b82f6", borderRadius:"2px" } })
        ));
        speakerContainer.appendChild(el("div", { style: { display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#94a3b8" } },
          el("span", null, "المتحدث 2"), el("span", null, "40%")
        ));
        speakerContainer.appendChild(el("div", { style: { width:"100%", height:"4px", background:"#334155", borderRadius:"2px" } },
          el("div", { style: { width:"40%", height:"100%", background:"#a855f7", borderRadius:"2px" } })
        ));
      } else {
        // 3 or more
        speakerContainer.appendChild(el("div", { style: { display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#94a3b8" } },
          el("span", null, "المتحدث 1"), el("span", null, "45%")
        ));
        speakerContainer.appendChild(el("div", { style: { width:"100%", height:"4px", background:"#334155", borderRadius:"2px" } },
          el("div", { style: { width:"45%", height:"100%", background:"#3b82f6", borderRadius:"2px" } })
        ));
        speakerContainer.appendChild(el("div", { style: { display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#94a3b8" } },
          el("span", null, "المتحدث 2"), el("span", null, "35%")
        ));
        speakerContainer.appendChild(el("div", { style: { width:"100%", height:"4px", background:"#334155", borderRadius:"2px" } },
          el("div", { style: { width:"35%", height:"100%", background:"#a855f7", borderRadius:"2px" } })
        ));
        speakerContainer.appendChild(el("div", { style: { display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#94a3b8" } },
          el("span", null, "المتحدث 3"), el("span", null, "20%")
        ));
        speakerContainer.appendChild(el("div", { style: { width:"100%", height:"4px", background:"#334155", borderRadius:"2px" } },
          el("div", { style: { width:"20%", height:"100%", background:"#14b8a6", borderRadius:"2px" } })
        ));
      }
      audioSpeakerRows.replaceChildren(speakerContainer);

      // Show mock transcript
      contentTranscriptList.replaceChildren(
        el("div", { style: { display:"flex", flexDirection:"column", gap:"4px", textAlign:"right" } },
          el("div", { style: { fontSize:"9px", color:"rgba(255,255,255,0.8)" } }, "00:00:12 البدايات دائماً تكون أصعب..."),
          el("div", { style: { fontSize:"9px", color:"rgba(255,255,255,0.8)" } }, "00:01:45 التحديات تصنع منك شخصاً..."),
          el("div", { style: { fontSize:"9px", color:"rgba(255,255,255,0.8)" } }, "00:03:22 النجاح ليس وجهة، بل...")
        )
      );
    } else {
      videoThumGrid.replaceChildren(el("span.muted", { style: { fontSize: "10px" } }, "لم يتم التحليل"));
      audioSpeakerRows.replaceChildren(el("span.muted", { style: { fontSize: "10px" } }, "لم يتم التحليل"));
      contentTranscriptList.replaceChildren(el("span.muted", { style: { fontSize: "10px" } }, "لم يتم التحليل"));
    }
  }

  async function handleAnalyze() {
    if (isAnalyzing || isEditing) return;
    isAnalyzing = true;
    
    // Reset
    stepStates = ["loading", "waiting", "waiting", "waiting", "waiting"];
    stats = { shots: 0, speakers: 0, audio: 0, video: 0 };
    updateStatsUI();
    updateStepsUI();
    updateAnalysisPanels(false);
    updateLogUI("جاري تقييم لقطات الفيديو وتحديد جودتها...", "#38bdf8");

    // Fetch actual sequence stats from Premiere Pro ExtendScript
    let realStats = { shots: 127, speakers: 3, audio: 6, video: 48 };
    if (isInsideAdobe()) {
      try {
        const pproStats = await evalES<{ shots: number; speakers: number; audioFiles: number; videoFiles: number }>("getSequenceStats");
        if (pproStats) {
          realStats = {
            shots: pproStats.shots || 0,
            speakers: pproStats.speakers || 1,
            audio: pproStats.audioFiles || 0,
            video: pproStats.videoFiles || 0
          };
        }
      } catch (_) {}
    }

    setTimeout(() => {
      stepStates[0] = "done";
      stepStates[1] = "loading";
      stats.shots = realStats.shots || 1;
      stats.video = realStats.video || 1;
      updateStatsUI();
      updateStepsUI();
      updateLogUI("جاري مطابقة المسارات الصوتية وتحديد المتحدثين...", "#38bdf8");

      setTimeout(() => {
        stepStates[1] = "done";
        stats.speakers = realStats.speakers || 1;
        stats.audio = realStats.audio || 1;
        isAnalyzing = false;
        
        updateStatsUI();
        updateStepsUI();
        updateAnalysisPanels(true);
        updateLogUI("اكتمل تحليل المشروع وجاهز للمونتاج الذكي.", "#10b981");
        toast("Analysis complete!");
      }, 1000);
    }, 1000);
  }

  async function handleStartEdit() {
    if (isEditing || isAnalyzing) return;
    isEditing = true;

    // Reset steps
    stepStates = ["done", "done", "loading", "waiting", "waiting"];
    updateStepsUI();
    updateProgressUI(10, true);
    updateLogUI("جاري الاتصال بـ Saad AI Copilot وتوليد التعديلات...", "#a855f7");

    // Gather sequence details
    let contextStr = "";
    if (isInsideAdobe()) {
      try {
        const info = await evalES<SequenceInfo>("getActiveSequenceInfo");
        if (info && info.name) {
          contextStr = `\n\n[Context: Active project has sequence named "${info.name}" at ${info.fps || 29.97} FPS, size ${info.width || 1920}x${info.height || 1080}]`;
        }
      } catch (_) {}
    }

    const messagesPayload = [
      {
        role: "system",
        content: `You are Saad AI Copilot, a helpful AI video editor operating inside Adobe Premiere Pro.
You help the user automate editing workflows. When the user asks you to perform an editing action, you MUST generate a clean JavaScript ExtendScript code block wrapped in \`\`\`javascript or \`\`\`js.
The code will be evaluated directly inside the Premiere Pro ExtendScript runtime.

Guidelines for writing ExtendScript code:
1. Always get the active sequence directly using app.project.activeSequence:
   var activeSeq = app.project ? app.project.activeSequence : null;
   if (!activeSeq) {
     alert("يرجى فتح مشروع واختيار تسلسل (Sequence) أولاً.");
     return;
   }
2. IMPORTANT: DO NOT search for the sequence by name in app.project.rootItem.children or loop through project items/bins to locate it. This will fail if the sequence is nested inside folders. Just reference app.project.activeSequence directly.
3. All code must be ES3 compatible (no const, let, arrow functions, or promises). Use 'var' for all variable declarations.
4. Focus strictly on executing the requested timeline changes, and avoid unnecessary dialogs or complex searches.`
      },
      { role: "user", content: promptText + contextStr }
    ];

    // Progress bar simulation to 90%
    let progressTimer = setInterval(() => {
      if (progressPercent < 85) {
        progressPercent += 5;
        updateProgressUI(progressPercent, true);
      }
    }, 500);

    try {
      const res = await api.chat(messagesPayload);
      const answer = res.choices?.[0]?.message?.content || "";
      if (!answer) {
        throw new Error("لم يرجع الذكاء الاصطناعي أي رد.");
      }

      // Extract javascript
      const match = answer.match(/```(?:javascript|js)?([\s\S]*?)```/);
      const code = match ? match[1].trim() : undefined;

      if (!code) {
        throw new Error("لم يقم الذكاء الاصطناعي بتوليد أي كود برمجي للتطبيق.");
      }

      updateLogUI("جاري تنفيذ كود المونتاج على التايم لاين...", "#eab308");
      stepStates[2] = "done";
      stepStates[3] = "loading";
      updateStepsUI();

      if (isInsideAdobe()) {
        (window as any).__adobe_cep__.evalScript(code, (result: string) => {
          clearInterval(progressTimer);
          isEditing = false;
          
          if (result === "EvalScript error." || result === "EvalScript error" || result.indexOf("Error") === 0) {
            stepStates[3] = "error";
            updateStepsUI();
            updateLogUI(`فشل التنفيذ: ${result}`, "#ef4444");
            toast("Execution failed");
          } else {
            stepStates[3] = "done";
            stepStates[4] = "done";
            updateStepsUI();
            updateProgressUI(100, true);
            updateLogUI("تم إنهاء التحرير والمونتاج الذكي بنجاح على التايم لاين!", "#10b981");
            toast("Applied successfully!");
            store.refreshUser().catch(() => {});
          }
        });
      } else {
        // Browser mockup mode
        setTimeout(() => {
          clearInterval(progressTimer);
          isEditing = false;
          stepStates[3] = "done";
          stepStates[4] = "done";
          updateStepsUI();
          updateProgressUI(100, true);
          updateLogUI("تم تنفيذ الأمر بنجاح (بيئة متصفح تجريبية).", "#10b981");
          toast("Applied successfully!");
        }, 1500);
      }
    } catch (e) {
      clearInterval(progressTimer);
      isEditing = false;
      stepStates[2] = "error";
      updateStepsUI();
      updateLogUI("خطأ: " + (e as Error).message, "#ef4444");
      toast("Error executing request");
    }
  }

  function buildUI() {
    root.appendChild(Header());
    
    // Page Main Area
    const page = el("div.saad-studio-shell", {
      style: {
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxSizing: "border-box",
        height: "calc(100% - 48px)",
        overflowY: "auto",
        background: "#080e14"
      }
    });

    // 1. PROJECT INFO BAR
    const infoBar = el("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(20, 31, 41, 0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
        padding: "8px 12px"
      }
    });

    const projectSide = el("div", { style: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" } },
      icon("captions", 14), // mock document icon
      el("span", null, "المشروع:"),
      (projectLabel = el("span", { style: { color: "#fff", fontWeight: "bold" } }, "جاري الكشف..."))
    );

    const seqSide = el("div", { style: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" } },
      icon("video", 14),
      el("span", null, "التسلسل النشط:"),
      (sequenceLabel = el("span", { style: { color: "#38bdf8", fontWeight: "bold" } }, "Sequence 01"))
    );

    infoBar.appendChild(projectSide);
    infoBar.appendChild(seqSide);
    page.appendChild(infoBar);

    // 2. EDITOR GUIDANCE (توجيه المونتير)
    const guidanceCard = el("div.saad-production-card", {
      style: {
        background: "rgba(20, 31, 41, 0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }
    });

    const guidanceHead = el("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
      icon("settings", 16), // reticle icon mapping
      el("span", { style: { fontSize: "13px", fontWeight: "bold", color: "#fff" } }, "توجيه المونتير")
    );

    textareaEl = el("textarea", {
      value: promptText,
      placeholder: "اكتب تعليمات المونتاج هنا...",
      style: {
        width: "100%",
        height: "60px",
        background: "rgba(10,18,26,0.6)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "6px",
        color: "#f1f5f9",
        fontSize: "12px",
        lineHeight: "1.4",
        padding: "8px",
        resize: "none",
        boxSizing: "border-box"
      },
      onInput: (e: any) => {
        promptText = e.target.value;
        charCount = promptText.length;
        if (charCounter) charCounter.textContent = `${charCount}/500`;
      }
    }) as HTMLTextAreaElement;

    const guidanceFooter = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      el("div", { style: { color: "#a855f7", display: "flex", alignItems: "center" } }, icon("spark", 14)),
      (charCounter = el("span", { style: { fontSize: "10px", color: "#64748b" } }, `${charCount}/500`))
    );

    guidanceCard.appendChild(guidanceHead);
    guidanceCard.appendChild(textareaEl);
    guidanceCard.appendChild(guidanceFooter);
    page.appendChild(guidanceCard);

    // 3. PROJECT UNDERSTANDING (فهم المشروع)
    const understandingCard = el("div.saad-production-card", {
      style: {
        background: "rgba(20, 31, 41, 0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }
    });

    const understandingHead = el("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
      icon("crop", 16), // mock brain/understanding icon
      el("span", { style: { fontSize: "13px", fontWeight: "bold", color: "#fff" } }, "فهم المشروع")
    );

    const columnsGrid = el("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px"
      }
    });

    // Column 1: Video Analysis
    const colVideo = el("div", {
      style: {
        background: "rgba(10,18,26,0.3)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: "6px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "6px"
      }
    },
      el("div", { style: { display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#94a3b8" } }, icon("video", 12), "تحليل الفيديو"),
      (videoThumGrid = el("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
          minHeight: "84px",
          alignItems: "center",
          justifyContent: "center"
        }
      }, el("span.muted", { style: { fontSize: "10px" } }, "لم يتم التحليل"))),
      el("span", { style: { fontSize: "9px", color: "#64748b" } }, "فهم اللقطات واختيار الأفضل"),
      el("div", { style: { width: "100%", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2.5px" } },
        el("div", { style: { width: "78%", height: "100%", background: "#0284c7", borderRadius: "2.5px" } })
      )
    );

    // Column 2: Audio Analysis
    const colAudio = el("div", {
      style: {
        background: "rgba(10,18,26,0.3)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: "6px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "6px"
      }
    },
      el("div", { style: { display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#94a3b8" } }, icon("waveform", 12), "تحليل الصوت"),
      (audioSpeakerRows = el("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "84px",
          width: "100%"
        }
      }, el("span.muted", { style: { fontSize: "10px" } }, "لم يتم التحليل"))),
      el("span", { style: { fontSize: "9px", color: "#64748b" } }, "فهم المتحدثين والصوت"),
      el("div", { style: { width: "100%", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2.5px" } },
        el("div", { style: { width: "65%", height: "100%", background: "#0284c7", borderRadius: "2.5px" } })
      )
    );

    // Column 3: Content Analysis
    const colContent = el("div", {
      style: {
        background: "rgba(10,18,26,0.3)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: "6px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "6px"
      }
    },
      el("div", { style: { display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#94a3b8" } }, icon("captions", 12), "فهم المحتوى"),
      (contentTranscriptList = el("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "84px",
          overflow: "hidden"
        }
      }, el("span.muted", { style: { fontSize: "10px" } }, "لم يتم التحليل"))),
      el("span", { style: { fontSize: "9px", color: "#64748b" } }, "تحليل النص وفهم المحتوى"),
      el("div", { style: { width: "100%", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2.5px" } },
        el("div", { style: { width: "72%", height: "100%", background: "#0284c7", borderRadius: "2.5px" } })
      )
    );

    columnsGrid.appendChild(colVideo);
    columnsGrid.appendChild(colAudio);
    columnsGrid.appendChild(colContent);
    understandingCard.appendChild(understandingHead);
    understandingCard.appendChild(columnsGrid);

    // Timeline statistics bar
    const statsBar = el("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        padding: "8px",
        background: "rgba(10,18,26,0.4)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: "6px",
        textAlign: "center"
      }
    });

    const statShots = el("div", { style: { display: "flex", flexDirection: "column" } },
      (statShotsEl = el("span", { style: { color: "#fff", fontWeight: "bold", fontSize: "14px" } }, "-")),
      el("span", { style: { fontSize: "9px", color: "#94a3b8" } }, "لقطة")
    );
    const statSpeakers = el("div", { style: { display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" } },
      (statSpeakersEl = el("span", { style: { color: "#fff", fontWeight: "bold", fontSize: "14px" } }, "-")),
      el("span", { style: { fontSize: "9px", color: "#94a3b8" } }, "متحدثين")
    );
    const statAudio = el("div", { style: { display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" } },
      (statAudioEl = el("span", { style: { color: "#fff", fontWeight: "bold", fontSize: "14px" } }, "-")),
      el("span", { style: { fontSize: "9px", color: "#94a3b8" } }, "ملفات صوت")
    );
    const statVideo = el("div", { style: { display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" } },
      (statVideoEl = el("span", { style: { color: "#fff", fontWeight: "bold", fontSize: "14px" } }, "-")),
      el("span", { style: { fontSize: "9px", color: "#94a3b8" } }, "فيديو")
    );

    statsBar.appendChild(statShots);
    statsBar.appendChild(statSpeakers);
    statsBar.appendChild(statAudio);
    statsBar.appendChild(statVideo);
    understandingCard.appendChild(statsBar);
    page.appendChild(understandingCard);

    // 4. SMART EDITING PROGRESS (المونتاج الذكي)
    const stepsCard = el("div.saad-production-card", {
      style: {
        background: "rgba(20, 31, 41, 0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }
    });

    const stepsHead = el("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
      icon("magic-wand", 16),
      el("span", { style: { fontSize: "13px", fontWeight: "bold", color: "#fff" } }, "المونتاج الذكي")
    );

    stepItemsList = el("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
      }
    });

    stepsCard.appendChild(stepsHead);
    stepsCard.appendChild(stepItemsList);
    page.appendChild(stepsCard);

    // 5. ACTION BUTTONS ROW
    const actionRow = el("div", {
      style: {
        display: "flex",
        gap: "10px",
        marginTop: "4px"
      }
    });

    analyzeBtn = el("button.btn-secondary", {
      type: "button",
      onClick: handleAnalyze,
      style: {
        flex: 1,
        padding: "10px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: "transparent",
        border: "1px solid #475569",
        color: "#94a3b8",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }
    }, "حلّل المشروع أولاً") as HTMLButtonElement;

    startBtn = el("button.btn-primary", {
      type: "button",
      onClick: handleStartEdit,
      style: {
        flex: 1,
        padding: "10px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: "#0284c7",
        border: "none",
        color: "#fff",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px"
      }
    }, icon("spark", 12), "ابدأ المونتاج") as HTMLButtonElement;

    actionRow.appendChild(analyzeBtn);
    actionRow.appendChild(startBtn);
    page.appendChild(actionRow);

    // 6. DYNAMIC TIMELINE PROGRESS FOOTER
    progressContainer = el("div.saad-production-card", {
      style: {
        background: "rgba(20, 31, 41, 0.8)",
        border: "1px solid rgba(2, 132, 199, 0.3)",
        borderRadius: "8px",
        padding: "12px",
        display: "none", // hidden by default, shown during edit
        flexDirection: "column",
        gap: "10px"
      }
    });

    const progressHead = el("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
      icon("waveform", 14), // lightning indicator mock mapping
      el("span", { style: { fontSize: "12px", fontWeight: "bold", color: "#fff" } }, "ينفذ الآن على التايملاين —")
    );

    const progressBarWrapper = el("div", {
      style: {
        width: "100%",
        height: "8px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: "4px",
        position: "relative",
        overflow: "hidden"
      }
    });

    progressFillEl = el("div", {
      style: {
        width: "0%",
        height: "100%",
        background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
        borderRadius: "4px",
        transition: "width 0.3s ease"
      }
    });
    progressBarWrapper.appendChild(progressFillEl);

    const progressControls = el("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    });

    const controlsGroup = el("div", { style: { display: "flex", gap: "12px" } },
      el("button", {
        type: "button",
        style: { background: "none", border: "none", color: "#94a3b8", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }
      },
        icon("captions", 10), // mock pause icon
        "Pause"
      ),
      el("button", {
        type: "button",
        style: { background: "none", border: "none", color: "#94a3b8", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }
      },
        icon("scissors", 10), // mock stop/cross icon
        "Stop"
      )
    );

    progressTextEl = el("span", { style: { fontSize: "10px", color: "#38bdf8", fontWeight: "bold" } }, "جاري التجهيز...");

    progressControls.appendChild(controlsGroup);
    progressControls.appendChild(progressTextEl);

    progressContainer.appendChild(progressHead);
    progressContainer.appendChild(progressBarWrapper);
    progressContainer.appendChild(progressControls);
    page.appendChild(progressContainer);

    // 7. REALTIME STATUS/LOG ROW
    logEl = el("div", {
      style: {
        fontSize: "11px",
        color: "#94a3b8",
        padding: "4px 8px",
        textAlign: "center",
        background: "rgba(10,18,26,0.2)",
        borderRadius: "4px",
        border: "1px solid rgba(255,255,255,0.02)"
      }
    }, "اللوحة جاهزة ومزامنة مع بريمير.");
    page.appendChild(logEl);

    root.appendChild(page);

    // Initial load sequences details and update steps UI
    loadSequenceInfo();
    updateStepsUI();
  }

  buildUI();
  return root;
}
