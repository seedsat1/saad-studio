"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/use-language";

export type TourStep = {
  id: number;
  stepLabel: string;
  title: string;
  description: string;
  highlightSelector?: string;
  tabKey?: string;
};

const TOUR_STEPS_EN: TourStep[] = [
  {
    id: 1,
    stepLabel: "WELCOME • STEP 1 OF 15",
    title: "Welcome to Saad Studio 👋",
    description: "Here's a 60-second tour of your studio — where your influencers live, how the Canvas works, your AI assistant, premium mode, and connecting Claude. Use Next and Back anytime.",
    tabKey: "influencers",
    highlightSelector: "#tour-influencer-grid",
  },
  {
    id: 2,
    stepLabel: "INFLUENCERS • STEP 2 OF 15",
    title: "Your influencers live here",
    description: "An influencer is a reusable character — a face and persona you build once. This grid is your roster.",
    tabKey: "influencers",
    highlightSelector: "#tour-influencers-roster",
  },
  {
    id: 3,
    stepLabel: "INFLUENCERS • STEP 3 OF 15",
    title: "Create a character once",
    description: "Add a name and one clear reference photo. Then summon her anywhere by typing @handle — e.g. \"@ash on a beach\" in any Image, Video, or Canvas prompt and her likeness is used automatically.",
    tabKey: "influencers",
    highlightSelector: "#tour-add-influencer-card",
  },
  {
    id: 4,
    stepLabel: "INFLUENCERS • STEP 4 OF 15",
    title: "Default influencer",
    description: "The default influencer (@gavi) lets you test image group generation, video, canvas branching, and face swap flows immediately.",
    tabKey: "influencers",
    highlightSelector: "#tour-gavi-card",
  },
  {
    id: 5,
    stepLabel: "5 of 15 - Canvas",
    title: "Begin with one identity",
    description: "Everything starts from a single trained identity, then branches into multiple content directions.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-root-node",
  },
  {
    id: 6,
    stepLabel: "6 of 15 - Canvas",
    title: "This is the workflow board",
    description: "Each card is a creative step. The lines show how references feed later outputs.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-board",
  },
  {
    id: 7,
    stepLabel: "7 of 15 - Images",
    title: "Generate 10 diverse images",
    description: "A strong talent should produce around 10 varied shots for consistent public and VIP content.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-child-nodes",
  },
  {
    id: 8,
    stepLabel: "8 of 15 - Video",
    title: "Turn shots into video",
    description: "Convert the best images into vertical clips for Reels, TikTok, Shorts, or paid channels.",
    tabKey: "canvas",
    highlightSelector: "#tour-video-motion-node",
  },
  {
    id: 9,
    stepLabel: "9 of 15 - Assistant",
    title: "Ask the assistant",
    description: "Tell it what to create and it can route you to the right workspace.",
    tabKey: "canvas",
    highlightSelector: "#tour-assistant-trigger",
  },
  {
    id: 10,
    stepLabel: "10 of 15 - Face Swap",
    title: "Instant face swap",
    description: "Use a target image and apply the selected talent identity.",
    tabKey: "faceswap",
  },
  {
    id: 11,
    stepLabel: "11 of 15 - Motion",
    title: "Motion Control",
    description: "Copy movement from a reference video onto your selected talent.",
    tabKey: "motion",
  },
  {
    id: 12,
    stepLabel: "12 of 15 - VIP",
    title: "VIP/NSFW generation",
    description: "VIP accounts can generate private subscriber-only variants from the same talent identity.",
    tabKey: "nsfw",
  },
  {
    id: 13,
    stepLabel: "13 of 15 - Studios",
    title: "Use image and video studios",
    description: "Move between focused studios when you do not need the full canvas.",
    tabKey: "image",
  },
  {
    id: 14,
    stepLabel: "14 of 15 - Library",
    title: "Store generated media",
    description: "Review, reuse, download, and organize generated assets.",
    tabKey: "library",
  },
  {
    id: 15,
    stepLabel: "15 of 15 - Done",
    title: "You are ready",
    description: "Build the talent once, generate variations, then publish the strongest outputs.",
    tabKey: "influencers",
  },
];

const TOUR_STEPS_AR: TourStep[] = [
  {
    id: 1,
    stepLabel: "1 من 15 - المواهب",
    title: "أهلا بك في استوديو المواهب الذكية",
    description: "أنشئ شخصية قابلة لإعادة الاستخدام مرة واحدة واستدعها في أي مكان باستعمال @handle.",
    tabKey: "influencers",
    highlightSelector: "#tour-influencer-grid",
  },
  {
    id: 2,
    stepLabel: "2 من 15 - المواهب",
    title: "المواهب لديك تعيش هنا",
    description: "هذه القائمة هي مكتبة الشخصيات المدربة التي ستستخدمها في كل أدوات الاستوديو.",
    tabKey: "influencers",
    highlightSelector: "#tour-influencers-roster",
  },
  {
    id: 3,
    stepLabel: "3 من 15 - التدريب",
    title: "أنشئ الشخصية مرة واحدة",
    description: "أضف اسما و @handle وصورة وجه واضحة، ثم أعد استخدامها في كل الصفحات.",
    tabKey: "influencers",
    highlightSelector: "#tour-add-influencer-card",
  },
  {
    id: 4,
    stepLabel: "4 من 15 - الافتراضي",
    title: "ابدأ مع Gavi",
    description: "الموهبة الافتراضية تسمح لك بتجربة الصور والفيديو والكانفاس وتبديل الوجه مباشرة.",
    tabKey: "influencers",
    highlightSelector: "#tour-gavi-card",
  },
  {
    id: 5,
    stepLabel: "5 من 15 - كانفاس",
    title: "ابدأ بهوية واحدة",
    description: "كل العمل يبدأ من شخصية واحدة مدربة، ثم يتفرع إلى اتجاهات محتوى متعددة.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-root-node",
  },
  {
    id: 6,
    stepLabel: "6 من 15 - كانفاس",
    title: "هذه هي لوحة العمل",
    description: "كل بطاقة تمثل خطوة إبداعية، والخطوط توضح كيف تغذي المراجع المخرجات التالية.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-board",
  },
  {
    id: 7,
    stepLabel: "7 من 15 - الصور",
    title: "ولّد 10 صور متنوعة",
    description: "نعم، الأفضل توليد حوالي 10 لقطات متنوعة حتى تبقى الهوية ثابتة بين المحتوى العام والخاص.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-child-nodes",
  },
  {
    id: 8,
    stepLabel: "8 من 15 - الفيديو",
    title: "حوّل اللقطات إلى فيديو",
    description: "حوّل أفضل الصور إلى مقاطع عمودية مناسبة للنشر على Reels أو TikTok أو Shorts أو القنوات المدفوعة.",
    tabKey: "canvas",
    highlightSelector: "#tour-video-motion-node",
  },
  {
    id: 9,
    stepLabel: "9 من 15 - المساعد",
    title: "اسأل المساعد",
    description: "اكتب له ما تريد وسيأخذك إلى مساحة العمل المناسبة.",
    tabKey: "canvas",
    highlightSelector: "#tour-assistant-trigger",
  },
  {
    id: 10,
    stepLabel: "10 من 15 - تبديل الوجه",
    title: "تبديل وجه فوري",
    description: "ارفع صورة مستهدفة وطبّق عليها هوية الموهبة المختارة.",
    tabKey: "faceswap",
  },
  {
    id: 11,
    stepLabel: "11 من 15 - الحركة",
    title: "نسخ الحركة",
    description: "انسخ الحركة من فيديو مرجعي وطبّقها على الموهبة المختارة.",
    tabKey: "motion",
  },
  {
    id: 12,
    stepLabel: "12 من 15 - VIP",
    title: "توليد VIP/NSFW",
    description: "حسابات VIP تستطيع إنشاء نسخ خاصة للمشتركين من نفس هوية الموهبة.",
    tabKey: "nsfw",
  },
  {
    id: 13,
    stepLabel: "13 من 15 - الاستوديوهات",
    title: "استخدم استوديو الصور والفيديو",
    description: "انتقل إلى الصفحات المتخصصة عندما لا تحتاج الكانفاس الكامل.",
    tabKey: "image",
  },
  {
    id: 14,
    stepLabel: "14 من 15 - المكتبة",
    title: "احفظ الوسائط المولدة",
    description: "راجع، أعد استخدام، نزّل، ونظم كل الأصول الناتجة.",
    tabKey: "library",
  },
  {
    id: 15,
    stepLabel: "15 من 15 - النهاية",
    title: "أنت جاهز",
    description: "درّب الموهبة مرة واحدة، ولّد التنويعات، ثم انشر أفضل النتائج.",
    tabKey: "influencers",
  },
];

interface InfluencerTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabKey: string) => void;
}

export function InfluencerTourModal({ isOpen, onClose, onSelectTab }: InfluencerTourModalProps) {
  const { lang } = useLanguage();
  const isArabic = lang !== "en";
  const steps = useMemo(() => (isArabic ? TOUR_STEPS_AR : TOUR_STEPS_EN), [isArabic]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const step = steps[currentStepIndex];

  useEffect(() => {
    if (step?.tabKey) onSelectTab(step.tabKey);
  }, [currentStepIndex, onSelectTab, step?.tabKey]);

  if (!isOpen || !step) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex((prev) => prev + 1);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/65 backdrop-blur-[2px] pointer-events-auto transition-all" onClick={onClose} />

      <div className={`relative z-50 w-full max-w-md bg-[#0f111a]/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200 ${isArabic ? "text-right dir-rtl" : "text-left dir-ltr"}`}>
        <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition">
          <X size={16} />
        </button>

        <div className={`flex items-center gap-2 mb-3 ${isArabic ? "justify-end" : "justify-start"}`}>
          <span className="text-[11px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-full">
            {step.stepLabel}
          </span>
        </div>

        <h3 className={`text-xl font-bold text-white mb-2 tracking-tight flex items-center gap-2 ${isArabic ? "justify-end" : "justify-start"}`}>
          {step.title}
          <Sparkles size={18} className="text-purple-400 shrink-0" />
        </h3>

        <p className="text-sm text-zinc-300 leading-relaxed mb-6 font-normal">{step.description}</p>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <button onClick={onClose} className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition">
            {isArabic ? "تخطي الجولة" : "Skip tour"}
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-white/5"
              >
                {isArabic ? "خلف" : "Back"}
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-95 transition"
            >
              {currentStepIndex === steps.length - 1 ? (isArabic ? "إنهاء الجولة" : "Finish") : (isArabic ? "التالي" : "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
