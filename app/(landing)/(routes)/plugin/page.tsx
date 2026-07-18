"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  CheckCircle2,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  FolderArchive,
  Terminal,
  ShieldCheck,
  Monitor,
  Video,
  Image as ImageIcon,
  Sliders,
  Play,
  Wand2,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/use-language";

// Animation Variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function PluginPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [activeTab, setActiveTab] = useState<"zxp" | "manual">("zxp");
  const [activeHostApp, setActiveHostApp] = useState<"ppro" | "ae" | "ps">("ppro");
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedReg, setCopiedReg] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const GDRIVE_URL = "https://drive.google.com/drive/folders/1fQAHUoH5EFyczLuQjQKEdcoLupN9n12a?usp=sharing";

  // Download Links Setup
  const DOWNLOAD_LINKS = {
    zxp: "/downloads/SaadStudio.zxp",
    manualZip: "/downloads/SaadStudio-manual.zip",
    googleDriveModels: GDRIVE_URL,
    aescriptsZxpInstaller: GDRIVE_URL,
  };

  const cepPath = "%APPDATA%\\Adobe\\CEP\\extensions\\";
  const regCommand = `reg add "HKCU\\Software\\Adobe\\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f`;

  const copyToClipboard = (text: string, type: "path" | "reg") => {
    navigator.clipboard.writeText(text);
    if (type === "path") {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } else {
      setCopiedReg(true);
      setTimeout(() => setCopiedReg(false), 2000);
    }
  };

  // Translations
  const t = (en: string, ar: string) => (isAr ? ar : en);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      {/* Dynamic Background Effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-amber-500/10 via-violet-600/10 to-transparent blur-[160px]" />
        <div className="absolute top-1/3 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-blue-600/10 via-emerald-500/10 to-transparent blur-[150px]" />
        <div className="absolute bottom-10 left-10 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-transparent blur-[140px]" />
      </div>

      {/* Main Full-Width Container */}
      <div className="relative z-10 max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-12 py-16 space-y-24">

        {/* 🚀 HERO SECTION */}
        <section className="text-center space-y-6 pt-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/15 via-violet-500/15 to-blue-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold shadow-lg shadow-amber-500/10"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{t("Official Adobe Extension Suite v2.0.0", "إضافة سعد استوديو المعتمدة لبرامج أدوبي v2.0.0")}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.15]"
          >
            {t("Supercharge Your Adobe Workflow with ", "ارتقِ بمونتاجك وإنتاجك على أدوبي مع ")}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              {t("Saad Studio Plugin", "إضافة سعد استوديو")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed"
          >
            {t(
              "One powerful plugin suite designed natively for Premiere Pro, After Effects, and Photoshop. Automate multi-cam switching, auto captions, AI audio sync, and visual asset import in 1-click.",
              "حزمة شاملة مخصصة لبرامج بريمير، أفترافيكت، وفوتوشوب. أتمتة مونتاج الكاميرات المتعددة، الترجمة والفرز الصوتي الآلي، المزامنة وتوليد المؤثرات بنقرة زر واحدة."
            )}
          </motion.p>

          {/* Supported Adobe Host App Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-violet-500/40 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-500/60 flex items-center justify-center text-violet-300 font-black text-sm">
                Pr
              </div>
              <div className="text-left rtl:text-right">
                <p className="text-sm font-bold text-white">Adobe Premiere Pro</p>
                <p className="text-xs text-slate-400">v15.0 – v26.2+</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-blue-500/40 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-500/60 flex items-center justify-center text-blue-300 font-black text-sm">
                Ae
              </div>
              <div className="text-left rtl:text-right">
                <p className="text-sm font-bold text-white">Adobe After Effects</p>
                <p className="text-xs text-slate-400">v18.0 – v26.2+</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-300 font-black text-sm">
                Ps
              </div>
              <div className="text-left rtl:text-right">
                <p className="text-sm font-bold text-white">Adobe Photoshop</p>
                <p className="text-xs text-slate-400">v22.0 – v26.2+</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 📦 DOWNLOAD CENTER SECTION (Full Width Grid) */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-white">
              {t("Download Package Center", "مركز تحميل الحزم والأدوات")}
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              {t(
                "Choose your preferred download method below. All packages are verified and signed.",
                "اختر حزمة التحميل المناسبة لنظامك. جميع الحزم موقعة ومفحوصة بالكامل."
              )}
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
          >
            {/* Download Card 1: Official ZXP */}
            <motion.div
              variants={fadeUp}
              className="relative flex flex-col justify-between rounded-3xl border border-amber-500/40 bg-slate-900/80 p-8 backdrop-blur-md shadow-2xl shadow-amber-500/10 hover:border-amber-400 transition-all duration-300 group"
            >
              <div className="absolute -top-3.5 left-6 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-black text-slate-950 shadow-lg">
                {t("Recommended", "الموصى به")}
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Download className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">{t("SaadStudio.zxp Bundle", "حزمة SaadStudio.zxp الرئيسية")}</h3>
                  <p className="text-xs text-amber-400 font-semibold mt-0.5">v2.0.0 • 32.2 MB • {t("Signed ZXP", "تغليف زيب موقع")}</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {t(
                    "Official signed ZXP extension containing complete logic for Premiere, After Effects, and Photoshop, with pre-bundled FFmpeg binary.",
                    "حزمة الإضافة الموقعة رسمياً مع محرك الـ FFmpeg المدمج بالكامل لبرامج بريمير وأفترافيكت وفوتوشوب."
                  )}
                </p>

                <div className="space-y-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Includes FFmpeg Audio Engine", "يتضمن محرك الصوت FFmpeg")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("1-Click Installer Compatible", "متوافق مع برامج التثبيت التلقائي")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Up to 2 PC Devices per account", "ترخيص يعمل على 2 حاسوب لكل حساب")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-3">
                <a
                  href={DOWNLOAD_LINKS.zxp}
                  download="SaadStudio.zxp"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>{t("Download SaadStudio.zxp (32.2 MB)", "تحميل حزمة SaadStudio.zxp (32.2 ميجابايت)")}</span>
                </a>
              </div>
            </motion.div>

            {/* Download Card 2: AI Models Pack */}
            <motion.div
              variants={fadeUp}
              className="relative flex flex-col justify-between rounded-3xl border border-violet-500/40 bg-slate-900/80 p-8 backdrop-blur-md shadow-2xl shadow-violet-500/10 hover:border-violet-400 transition-all duration-300 group"
            >
              <div className="absolute -top-3.5 left-6 px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-xs font-bold text-white shadow-lg">
                {t("AI Models Drive Pack", "حزمة النماذج الحجم الكامل")}
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">{t("Offline AI Models Pack", "حزمة نماذج الذكاء الاصطناعي الأوفلاين")}</h3>
                  <p className="text-xs text-violet-400 font-semibold mt-0.5">Google Drive • ~6.0 GB • {t("Offline Whisper Models", "نماذج الترجمة المحلية")}</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {t(
                    "Complete offline Whisper models (Medium, Large-v3, Large-v3-Turbo) for instant 100% offline auto-captions and transcription.",
                    "نماذج الـ Whisper الكاملة (Medium و Large-v3 و Large-v3-Turbo) للعمل أوفلاين 100% وبدون الحاجة لإنترنت."
                  )}
                </p>

                <div className="space-y-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Includes 1-Click Install Script (.bat)", "يتضمن سكريبت التثبيت التلقائي .bat")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Whisper Medium + Large v3 + Turbo", "نماذج Medium و Large-v3 و Turbo")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("High Speed Google Drive Link", "رابط تحميل سريع من كوكل درايف")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-3">
                <a
                  href={DOWNLOAD_LINKS.googleDriveModels}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-violet-500/25 transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>{t("Download Models Pack (Google Drive)", "تحميل النماذج (من كوكل درايف)")}</span>
                </a>
              </div>
            </motion.div>

            {/* Download Card 3: Manual Zip Pack */}
            <motion.div
              variants={fadeUp}
              className="relative flex flex-col justify-between rounded-3xl border border-slate-700 bg-slate-900/60 p-8 backdrop-blur-md shadow-2xl hover:border-slate-600 transition-all duration-300 group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
                  <FolderArchive className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">{t("Manual Extraction Package", "حزمة التثبيت اليدوي (.zip)")}</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">v2.0.0 • 32.2 MB • {t("Zip Archive", "ملف مضغوط يدوي")}</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {t(
                    "Direct zip archive for users who prefer copying extension folder manually into %APPDATA%\\Adobe\\CEP\\extensions\\.",
                    "ملف مضغوط للتثبيت اليدوي المباشر بنقل المجلد إلى مجلد الـ CEP بالويندوز دون استخدام برامج تثبيت خارجية."
                  )}
                </p>

                <div className="space-y-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Direct Folder Extraction", "فك ضغط مباشر بدون برامج")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Full Extension Source Included", "يتضمن ملفات الإضافة كاملة")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-3">
                <a
                  href={DOWNLOAD_LINKS.manualZip}
                  download="SaadStudio-manual.zip"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>{t("Download Manual Zip (32.2 MB)", "تحميل الملف اليدوي (32.2 ميجابايت)")}</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* 🛠️ INTERACTIVE INSTALLATION & SETUP GUIDE */}
        <section className="space-y-8 pt-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {t("Interactive Installation Guide", "دليل التنصيب والتفعيل التفاعلي Step-by-Step")}
            </h2>
            <p className="text-slate-400 text-base max-w-3xl mx-auto">
              {t(
                "Follow these simple organized steps to install the extension and activate local AI models in less than 2 minutes.",
                "اتبع الخطوات المنظمة والشرح التفاعلي أدناه لتنصيب الإضافة وتفعيل النماذج المحلية في أقل من دقيقتين."
              )}
            </p>

            {/* Method Selector Tabs */}
            <div className="flex justify-center pt-4">
              <div className="inline-flex items-center p-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-xl">
                <button
                  onClick={() => setActiveTab("zxp")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "zxp"
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>{t("Method 1: ZXP Installer (Recommended)", "الطريقة 1: التثبيت التلقائي عبر ZXP Installer")}</span>
                </button>

                <button
                  onClick={() => setActiveTab("manual")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "manual"
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>{t("Method 2: Manual Folder Copy", "الطريقة 2: التثبيت اليدوي المباشر")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Step Timeline Container */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-10 backdrop-blur-xl shadow-2xl space-y-10">
            <AnimatePresence mode="wait">
              {activeTab === "zxp" ? (
                <motion.div
                  key="zxp-guide"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-6"
                >
                  {/* Step 1 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-slate-800 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-lg">
                        1
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Download ZXP Installer", "تحميل برنامج تثبيت الـ ZXP")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Download and open the free AEScripts ZXP Installer or Anastasiy's Extension Manager.",
                          "قم بتحميل وفتح برنامج ZXP Installer المجاني المعتمد لأدوبي."
                        )}
                      </p>
                    </div>
                    <a
                      href={DOWNLOAD_LINKS.aescriptsZxpInstaller}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:underline pt-4"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t("Download AEScripts ZXP Installer (Google Drive)", "تحميل برنامج ZXP Installer (من كوكل درايف)")}</span>
                    </a>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-slate-800 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-lg">
                        2
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Drag & Drop SaadStudio.zxp", "سحب وإفلات ملف SaadStudio.zxp")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Drag SaadStudio.zxp file into ZXP Installer. The extension will install automatically in seconds.",
                          "قم بسحب وإسقاط ملف SaadStudio.zxp داخل نافذة البرنامج وسيتم التثبيت تلقائياً خلال ثوانٍ."
                        )}
                      </p>
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 pt-4">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t("Auto Verification Passed", "تثبيت موثوق ومفحوص")}</span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-violet-500/30 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 font-black flex items-center justify-center text-lg">
                        3
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Run 1-Click Models Script", "تشغيل سكريبت التثبيت التلقائي للنماذج")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Unzip Whisper-AI-Models.zip and double-click 'install-models.bat' to activate all offline AI models.",
                          "فك الضغط عن حزمة النماذج واضغط مرتين على 'تثبيت النماذج تلقائياً.bat' لتفعيل النماذج محلياً."
                        )}
                      </p>
                    </div>
                    <div className="bg-violet-950/60 border border-violet-500/30 rounded-xl p-2.5 text-[11px] font-mono text-violet-300">
                      {t("install-models.bat", "تثبيت النماذج تلقائياً.bat")}
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-slate-800 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-lg">
                        4
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Launch Adobe App & Open Panel", "تشغيل برنامج أدوبي وفتح الإضافة")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Launch Premiere Pro, After Effects, or Photoshop. Go to top menu: Window > Extensions > Saad Studio.",
                          "افتح برنامج بريمير أو أفترافيكت أو فوتوشوب، واذهب للقائمة العلوية: Window > Extensions > Saad Studio."
                        )}
                      </p>
                    </div>
                    <div className="text-xs font-bold text-slate-200 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                      Window ➔ Extensions ➔ Saad Studio
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="manual-guide"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-6"
                >
                  {/* Step 1 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-slate-800 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-lg">
                        1
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Extract SaadStudio-manual.zip", "فك ضغط ملف SaadStudio-manual.zip")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Unzip SaadStudio-manual.zip to extract the folder named 'app.saadstudio.cep'.",
                          "قم بفك الضغط عن الملف واستخرج مجلد 'app.saadstudio.cep'."
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-amber-500/30 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-lg">
                        2
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Copy to CEP Extensions Folder", "نسخ المجلد لمسار CEP بالويندوز")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Copy 'app.saadstudio.cep' into your Windows CEP directory below:",
                          "قم بنسخ المجلد ولصقه داخل مسار CEP بملفات النظام كما يلي:"
                        )}
                      </p>

                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300">
                        <span className="truncate">{cepPath}</span>
                        <button
                          onClick={() => copyToClipboard(cepPath, "path")}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Copy Path"
                        >
                          {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-violet-500/30 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 font-black flex items-center justify-center text-lg">
                        3
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Run 1-Click Models Script", "تشغيل سكريبت التثبيت التلقائي للنماذج")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Unzip Whisper-AI-Models.zip and double-click 'install-models.bat' to copy AI models.",
                          "افتح حزمة النماذج واضغط مرتين على 'تثبيت النماذج تلقائياً.bat' لنقل وتفعيل النماذج تلقائياً."
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative flex flex-col justify-between rounded-2xl bg-slate-950/80 border border-slate-800 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-lg">
                        4
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {t("Restart & Open Extension", "إعادة تشغيل أدوبي وفتح الإضافة")}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t(
                          "Restart Adobe host application and open Window > Extensions > Saad Studio.",
                          "أعد تشغيل برنامج أدوبي وافتح الإضافة من القائمة العلوية Window > Extensions > Saad Studio."
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 🎨 ADOBE HOST APPS FEATURE SHOWCASE */}
        <section className="space-y-8 pt-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {t("Multi-App Adobe Integration Suite", "مميزات وحزم الإضافة المتكاملة لبرامج أدوبي 3")}
            </h2>
            <p className="text-slate-400 text-base max-w-3xl mx-auto">
              {t(
                "Explore the specialized features designed natively for Premiere Pro, After Effects, and Photoshop.",
                "استكشف أدوات ومميزات الإضافة المخصصة لكل برنامج من برامج أدوبي."
              )}
            </p>

            {/* App Selection Tabs */}
            <div className="flex justify-center pt-4">
              <div className="inline-flex items-center p-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md">
                <button
                  onClick={() => setActiveHostApp("ppro")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeHostApp === "ppro"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Adobe Premiere Pro</span>
                </button>

                <button
                  onClick={() => setActiveHostApp("ae")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeHostApp === "ae"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>Adobe After Effects</span>
                </button>

                <button
                  onClick={() => setActiveHostApp("ps")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeHostApp === "ps"
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Adobe Photoshop</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Details Container */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-10 backdrop-blur-xl">
            <AnimatePresence mode="wait">
              {activeHostApp === "ppro" && (
                <motion.div
                  key="ppro-features"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Multi-Cam Auto Switcher", "مونتاج الكاميرات المتعددة التلقائي")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "RMS-based active speaker detection to make automated camera cut decisions across multiple video tracks.",
                        "تحليل الصوت بنظام RMS للكشف عن المتحدثين وتقطيع مسارات الفيديو تلقائياً وبدقة فائقة."
                      )}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Auto Captions (Faster-Whisper)", "الترجمة والتسميات الآلية")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Generates styled subtitle tracks directly on Premiere timeline 100% offline using local Whisper AI models.",
                        "توليد خطوط الكتابة والترجمة الآلية مباشرة على التايم لاين أوفلاين 100% وبدون إنترنت."
                      )}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Audio Sync Suite", "مزامنة الصوت متعدد المسارات")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Waveform correlation algorithm aligns external microphone audio with camera scratch audio automatically.",
                        "مزامنة وبناء المسارات الصوتية المنفصلة وتطابقها مع فيديو الكاميرات تلقائياً."
                      )}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("1-Click Podcast Auto Editing", "مونتاج البودكاست بنقرة واحدة")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Runs complete multi-cam switching, audio sync, and captions generation in one automated sequence.",
                        "تشغيل المسار الكامل لمونتاج البودكاست (القطع والتسميات والمزامنة) بنقرة زر واحدة."
                      )}
                    </p>
                  </div>
                </motion.div>
              )}

              {activeHostApp === "ae" && (
                <motion.div
                  key="ae-features"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("ExtendScript Composition Engine", "محرك إنشاء التركيبات وتوليد الطبقات")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Generates dynamic composition layers, animated text, and background visual assets directly inside After Effects.",
                        "إنشاء الطبقات والمؤثرات البصرية والنصوص المتحركة آلياً بداخل تركيبات أفترافيكت."
                      )}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                      <Play className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("AI Video Generation Import", "استيراد فيديوهات الذكاء الاصطناعي")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Directly fetch generated AI video clips from your Saad Studio library and place them on AE timeline.",
                        "سحب واستيراد المخرجات البصرية والفيديوهات المولدة من الاستوديو إلى تايم لاين أفترافيكت مباشرة."
                      )}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Automatic Keyframe Sync", "مزامنة الكي فريم التلقائية")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Aligns animation keyframes with speech cadences and audio beat detection.",
                        "مزامنة نقاط التحريك (Keyframes) تلقائياً مع الإيقاع ومسارات الصوت والترجمة."
                      )}
                    </p>
                  </div>
                </motion.div>
              )}

              {activeHostApp === "ps" && (
                <motion.div
                  key="ps-features"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("1-Click Canvas Asset Import", "استيراد الصور إلى لوحة العمل بنقرة واحدة")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Imports generated AI images, backgrounds, and assets directly as editable Photoshop layers.",
                        "استيراد الصور المولدة بالذكاء الاصطناعي كطبقات (Layers) حرة ومستقلة بداخل فوتوشوب."
                      )}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Prompt-to-Layer Studio Panel", "لوحة الأوامر والتوليد داخل فوتوشوب")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Generate Nano Banana, Flux Pro, and GPT Image models directly inside Photoshop panel.",
                        "توليد الصور باستخدام أحدث نماذج الـ AI مباشرة من اللوحة الجانبية داخل فوتوشوب."
                      )}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{t("High Resolution Texture Sync", "مزامنة الخامات والأصول عالية الدقة")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t(
                        "Preserves original color spaces, transparency channels, and 4K resolution metadata.",
                        "الحفاظ على الألوان الأصلية وقنوات الشفافية والدقة العالية للصور المستوردة."
                      )}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 💻 SYSTEM REQUIREMENTS & CHECKLIST */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-10 backdrop-blur-md space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">
            {t("System Requirements & Compatibility Checklist", "متطلبات النظام والبيئة التشغيلية")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <Monitor className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">{t("Operating System", "نظام التشغيل")}</h3>
              <p className="text-xs text-slate-400">Windows 10 / 11 (64-bit)</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <Layers className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-white">{t("Adobe Host Apps", "برامج أدوبي المدعومة")}</h3>
              <p className="text-xs text-slate-400">Premiere, After Effects, Photoshop 2021-2026+</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">{t("Hardware Acceleration", "المعالج والمسرع البصري")}</h3>
              <p className="text-xs text-slate-400">CPU (Int8) or NVIDIA GPU (CUDA Float16)</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">{t("Device Limit", "حد الأجهزة المسموح به")}</h3>
              <p className="text-xs text-slate-400">{t("Up to 2 PC devices per subscriber", "ترخيص يعمل على حاسوبين كحد أقصى")}</p>
            </div>
          </div>
        </section>

        {/* ❓ FREQUENTLY ASKED QUESTIONS (FAQ Accordion) */}
        <section className="space-y-6 pt-4">
          <h2 className="text-3xl font-extrabold text-white text-center">
            {t("Frequently Asked Questions", "الأسئلة الشائعة حول الإضافة والتثبيت")}
          </h2>

          <div className="space-y-4 max-w-4xl mx-auto">
            {[
              {
                qEn: "Does auto captions require an active internet connection?",
                qAr: "هل تتطلب أداة الترجمة والبودكاست اتصالاً بالإنترنت؟",
                aEn: "No! All auto captions, RMS speaker analysis, and audio sync run 100% locally and offline on your PC using embedded FFmpeg and local Whisper AI models.",
                aAr: "لا! جميع عمليات الترجمة والفرز وتقطيع الصوت تعتمد على محركات محلية أوفلاين 100% بداخل جهازك دون الحاجة لإنترنت."
              },
              {
                qEn: "How many computers can I activate with my subscription?",
                qAr: "كم عدد الأجهزة المسموح لي بتثبيت الإضافة عليها؟",
                aEn: "Each subscription account permits installation and active usage on up to 2 PC devices per subscriber.",
                aAr: "يُسمح بتفعيل واستخدام الإضافة على حاسوبين (2 PC Devices) كحد أقصى لكل حساب مشترك."
              },
              {
                qEn: "What if Adobe shows 'unsigned extension' or blank panel in manual mode?",
                qAr: "ماذا أفعل إذا ظهرت الإضافة شاشة بيضاء في التثبيت اليدوي؟",
                aEn: "Run the PlayerDebugMode registry command to allow local beta extensions in Adobe CSXS environments.",
                aAr: "قم بتفعيل خيار PlayerDebugMode في السجل للسماح لأدوبي بتحميل الإضافات التطويرية المحلية."
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-md space-y-3 cursor-pointer"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-white">{t(faq.qEn, faq.qAr)}</h3>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                </div>
                {openFaq === index && (
                  <p className="text-sm text-slate-300 leading-relaxed pt-2 border-t border-slate-800/80">
                    {t(faq.aEn, faq.aAr)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 🏁 FINAL CTA BOTTOM SECTION */}
        <section className="text-center rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-10 sm:p-14 backdrop-blur-xl space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            {t("Ready to Transform Your Adobe Workflow?", "جاهز لرفع سرعة ومستوى إنتاجك على أدوبي؟")}
          </h2>
          <p className="text-slate-300 text-base max-w-2xl mx-auto">
            {t(
              "Subscribe to the Podcast Extension Plan for just $3/mo and unlock unlimited extension usage on Premiere Pro, After Effects, and Photoshop.",
              "اشترك بخطة إضافة البودكاست بـ 3$ شهرياً فقط واستمتع باستخدام غير محدود للإضافة على بريمير وأفترافيكت وفوتوشوب."
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-xl shadow-amber-500/25 transition-all"
            >
              <span>{t("Get Podcast Extension Plan ($3/mo)", "اشترك في خطة الإضافة ($3/شهرياً)")}</span>
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
