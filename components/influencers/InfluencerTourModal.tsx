"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type TourStep = {
  id: number;
  stepLabel: string;
  title: string;
  description: string;
  highlightSelector?: string;
  tabKey?: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    stepLabel: "15 من 1 • الخطوة المؤثرون",
    title: "مرحباً بك في فريق المؤثرين الافتراضيين",
    description: "قم بإنشاء شخصية ذكاء اصطناعي مرجعية مرة واحدة، واستدعها في أي مكان باستخدام @handle مثل @gavi أو @sophie.",
    tabKey: "influencers",
    highlightSelector: "#tour-influencer-grid",
  },
  {
    id: 2,
    stepLabel: "15 من 2 • الخطوة المؤثرون",
    title: "المؤثرون لديك يعيشون هنا",
    description: "المؤثر شخصية قابلة لإعادة الاستخدام - وجه وشخصية تبنيها مرة واحدة، هذه الشبكة هي قائمتك الأساسية.",
    tabKey: "influencers",
    highlightSelector: "#tour-influencers-roster",
  },
  {
    id: 3,
    stepLabel: "15 من 3 • الخطوة المؤثرون",
    title: "أنشئ شخصية مرة واحدة",
    description: "أضف اسمًا وصورة مرجعية واحدة. ثم استدعها في أي مكان بكتابة @handle في مربع الحوار - على سبيل المثال، @ash على الشاطئ يستخدم صورتها تلقائيًا.",
    tabKey: "influencers",
    highlightSelector: "#tour-add-influencer-card",
  },
  {
    id: 4,
    stepLabel: "15 من 4 • الخطوة المؤثرون",
    title: "تعرّف على غافي - المؤثر الافتراضي لديك",
    description: "يبدأ كل حساب باسم غافي لتتمكن من تجربة الأشياء فورًا. استدعها باستخدام @gavi في أي نافذة من نوافذ الصور أو الفيديوهات أو العناصر المميزة أو لوحات الرسم.",
    tabKey: "influencers",
    highlightSelector: "#tour-gavi-card",
  },
  {
    id: 5,
    stepLabel: "15 من 5 • الخطوة كانفاس",
    title: "ابدأ بشخصية واحدة",
    description: "ينطلق كل شيء من وجه واحد على اليسار. من تلك الصورة المرجعية، يمكنك ابتکار صور أنيقة ومتوافقة مع علامتك التجارية - من النوع الذي تنشره علنًا على إنستغرام أو تيك توك.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-root-node",
  },
  {
    id: 6,
    stepLabel: "15 من 6 • الخطوة كانفاس",
    title: "هذه هي اللوحة",
    description: "مساحة عملك المرئية. كل بطاقة تمثل خطوة إبداعية، والخطوط توضح كيف تغذي كل خطوة الخطوة التالية. اسحب للتحريك، وقم بالتقريب والتكبير والتصغير في أي وقت.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-board",
  },
  {
    id: 7,
    stepLabel: "15 من 7 • الخطوة كانفاس",
    title: "التوسع في المحتوى المتميز",
    description: "انطلاقاً من تلك اللقطات الأساسية، يمكنك إنشاء نسخ مميزة خاصة بالمشتركين فقط - وهي الوسائط الخاصة التي ستبيعها لمعجبيك. يتم إنشاء هذه النسخ في الوضع المميز.",
    tabKey: "canvas",
    highlightSelector: "#tour-canvas-child-nodes",
  },
  {
    id: 8,
    stepLabel: "15 من 8 • الخطوة كانفاس",
    title: "حوّلها إلى فيديو",
    description: "وأخيرًا، يمكنك تحريك أي لقطة وتحويلها إلى مقطع عمودي جاهز للنشر مباشرةً على Reels أو TikTok أو Shorts. شخصية واحدة، مقطع متعدد الصيغ، كل ذلك على لوحة واحدة.",
    tabKey: "canvas",
    highlightSelector: "#tour-video-motion-node",
  },
  {
    id: 9,
    stepLabel: "15 من 9 • الخطوة كانفاس",
    title: "أو ببساطة اسأل المساعد",
    description: "لا تريد توصيل العقد يدويًا؟ أخبر المساعد بما تريد بلغة إنجليزية أو عربية بسيطة - 'حوّل هذا إلى فيديو'، 'التقط 4 صور شاطئية لـ @gavi' - وسيقوم ببناء وتطوير الخطوات نيابةً عنك.",
    tabKey: "canvas",
    highlightSelector: "#tour-assistant-trigger",
  },
  {
    id: 10,
    stepLabel: "15 من 10 • الخطوة استبدال الوجه",
    title: "أداة Face Swap الفورية",
    description: "ارفع أي صورة مرجعية لجسم أو ملابس، واختر المؤثر المفضل مثل @sophie للتوليد بنقرة واحدة بدون الحاجة لكتابة أي برومبت!",
    tabKey: "faceswap",
  },
  {
    id: 11,
    stepLabel: "15 من 11 • الخطوة التحكم بالحركة",
    title: "أداة Motion Control لتحديات تيك توك",
    description: "ارفع فيديو رائج وانسخ حركات ورقصات المشاهير وتطبيقها بالكامل على شخصية المؤثر الخاص بك بكل دقة.",
    tabKey: "motion",
  },
  {
    id: 12,
    stepLabel: "15 من 12 • الخطوة المحتوى المتميز",
    title: "قسم المحتوى الخاص NSFW",
    description: "إنشاء صور حصرية ومميزة لمعجبيك مع نماذج توليد خاصة فائقة الدقة والواقعية.",
    tabKey: "nsfw",
  },
  {
    id: 13,
    stepLabel: "15 من 13 • الخطوة الصور والفيديو",
    title: "توليد الصور والفيديوهات الفردية",
    description: "استخدام خيار Turn into prompt لتشخيص الصور وتحويل النصوص التوصيفية لصور بنكهة الذكاء الاصطناعي.",
    tabKey: "image",
  },
  {
    id: 14,
    stepLabel: "15 من 14 • الخطوة المكتبة",
    title: "مكتبة الوسائط المولّدة",
    description: "عرض كافة توليداتك وتصنيفها حسب الشهر مع إمكانية التنزيل الفوري أو إعادة استخدامها كمرجع.",
    tabKey: "library",
  },
  {
    id: 15,
    stepLabel: "15 من 15 • ختام الجولة",
    title: "أنت جاهز الآن لبناء إمبراطورية المؤثرين!",
    description: "ابدأ الآن بإضافة المؤثرين الافتراضيين وتوليد أروع مجموعات المحتوى عبر الكانفاس المرئي.",
    tabKey: "influencers",
  },
];

interface InfluencerTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabKey: string) => void;
}

export function InfluencerTourModal({ isOpen, onClose, onSelectTab }: InfluencerTourModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TOUR_STEPS[currentStepIndex];

  useEffect(() => {
    if (step?.tabKey) {
      onSelectTab(step.tabKey);
    }
  }, [currentStepIndex, step?.tabKey, onSelectTab]);

  if (!isOpen || !step) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Dark Backdrop Overlay with glow effect */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-[2px] pointer-events-auto transition-all" onClick={onClose} />

      {/* Interactive Tour Card matching screenshots 100% */}
      <div className="relative z-50 w-full max-w-md bg-[#0f111a]/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl text-right pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X size={16} />
        </button>

        {/* Step Badge & Counter */}
        <div className="flex items-center gap-2 justify-end mb-3">
          <span className="text-[11px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-full dir-rtl">
            {step.stepLabel}
          </span>
        </div>

        {/* Step Title */}
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight flex items-center justify-end gap-2">
          {step.title}
          <Sparkles size={18} className="text-purple-400 shrink-0" />
        </h3>

        {/* Step Description */}
        <p className="text-sm text-zinc-300 leading-relaxed mb-6 font-normal dir-rtl">
          {step.description}
        </p>

        {/* Action Controls matching screenshots */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
          >
            تخطي الجولة
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-white/5"
              >
                خلف
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-95 transition"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? "إنهاء الجولة" : "التالي"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
