"use client";

import React, { useState } from "react";
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
  ExternalLink,
  ShieldCheck,
  Monitor,
  Video,
  Image as ImageIcon,
  Sliders,
  Play,
  Wand2,
  ChevronDown,
  ArrowRight,
  HelpCircle,
  Wrench,
  BookOpen,
} from "lucide-react";
import { useLanguage } from "@/lib/use-language";

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
  const { isAr } = useLanguage();
  const [activeHostApp, setActiveHostApp] = useState<"ppro" | "ae" | "ps">("ppro");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const GDRIVE_URL = "https://drive.google.com/drive/folders/1fQAHUoH5EFyczLuQjQKEdcoLupN9n12a?usp=sharing";

  const DOWNLOAD_LINKS = {
    setupExe: "/downloads/SaadStudio-Setup.exe",
    googleDriveModels: GDRIVE_URL,
  };

  const t = (en: string, ar: string) => (isAr ? ar : en);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      {/* Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-amber-500/10 via-violet-600/10 to-transparent blur-[160px]" />
        <div className="absolute top-1/3 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-blue-600/10 via-emerald-500/10 to-transparent blur-[150px]" />
        <div className="absolute bottom-10 left-10 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-transparent blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-12 py-16 space-y-20">

        {/* 🚀 HERO SECTION */}
        <section className="text-center space-y-6 pt-4">
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
            className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.2] max-w-4xl mx-auto"
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
            className="text-base sm:text-lg text-slate-300/90 max-w-3xl mx-auto leading-relaxed"
          >
            {t(
              "Automate multi-cam cut decisions, auto captions, audio sync, and visual asset import directly in Premiere Pro, After Effects, and Photoshop with 1-click.",
              "أتمتة مونتاج الكاميرات المتعددة، الترجمة والفرز الصوتي الآلي، المزامنة وتوليد المؤثرات بنقرة زر واحدة داخل بريمير، أفترافيكت، وفوتوشوب."
            )}
          </motion.p>

          {/* Adobe Apps Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
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

        {/* 📦 DOWNLOAD CENTER SECTION (Clean 2 Cards) */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white">
              {t("Download Package Center", "مركز التحميل المباشر")}
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              {t(
                "Download the 1-click standalone installer EXE and offline AI models below.",
                "قم بتحميل برنامج التثبيت التلقائي وحزمة النماذج المحلية أدناه."
              )}
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto"
          >
            {/* Card 1: SaadStudio-Setup.exe */}
            <motion.div
              variants={fadeUp}
              className="relative flex flex-col justify-between rounded-3xl border border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-slate-900/95 to-slate-900/95 p-8 backdrop-blur-md shadow-2xl shadow-amber-500/15 hover:border-amber-400 transition-all duration-300 group"
            >
              <div className="absolute -top-3.5 left-6 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-black text-slate-950 shadow-lg">
                {t("★ Recommended (1-Click)", "★ برنامج التثبيت التلقائي")}
              </div>

              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">{t("SaadStudio-Setup.exe", "برنامج التنصيب SaadStudio-Setup.exe")}</h3>
                  <p className="text-xs text-amber-400 font-semibold mt-1">Windows 10/11 • 33.4 MB • 1-Click EXE</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {t(
                    "Standalone 1-click installer. Automatically configures Adobe CEP registry and installs the extension for Premiere Pro, After Effects & Photoshop in seconds.",
                    "برنامج تثبيت تلقائي لنظام ويندوز. بضغطة زر واحدة يقوم بتنصيب الإضافة وتفعيل النظام تلقائياً لبرامج أدوبي بريمير وأفترافيكت وفوتوشوب."
                  )}
                </p>

                <div className="space-y-2.5 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("1-Click Automatic Setup", "تنصيب آلي بنقرة واحدة بدون خطوات معقدة")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Auto-Configures System Debug Mode", "تفعيل تلقائي لبيئة تشغيل الإضافات")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Includes Pre-Bundled Audio Engine", "مدمج مع محرك المعالجة الصوتية")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <a
                  href={DOWNLOAD_LINKS.setupExe}
                  download="SaadStudio-Setup.exe"
                  className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02]"
                >
                  <Download className="w-5 h-5" />
                  <span>{t("Download SaadStudio-Setup.exe (33.4 MB)", "تحميل SaadStudio-Setup.exe (33.4 ميجابايت)")}</span>
                </a>
              </div>
            </motion.div>

            {/* Card 2: Offline AI Models Pack */}
            <motion.div
              variants={fadeUp}
              className="relative flex flex-col justify-between rounded-3xl border border-violet-500/40 bg-slate-900/90 p-8 backdrop-blur-md shadow-2xl shadow-violet-500/10 hover:border-violet-400 transition-all duration-300 group"
            >
              <div className="absolute -top-3.5 left-6 px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-xs font-bold text-white shadow-lg">
                {t("AI Models Drive Pack", "حزمة النماذج أوفلاين")}
              </div>

              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">{t("Offline AI Models Pack", "حزمة نماذج الذكاء الاصطناعي الأوفلاين")}</h3>
                  <p className="text-xs text-violet-400 font-semibold mt-1">Google Drive • ~6 GB • Offline Pack</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {t(
                    "Complete offline speech-to-text AI models pack for instant 100% offline auto-captions and transcription without internet.",
                    "حزمة محركات معالجة الصوت والنصوص المحلية الكاملة للعمل أوفلاين 100% وبدون الحاجة لإنترنت."
                  )}
                </p>

                <div className="space-y-2.5 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("Includes 1-Click Install Script (install-models.bat)", "يتضمن سكريبت التثبيت التلقائي install-models.bat")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("High-Precision Speech Recognition", "دقة عالية في التعرف الصوتي وتوليد النص")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t("High Speed Google Drive Link", "رابط تحميل مباشر وسريع من كوكل درايف")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <a
                  href={DOWNLOAD_LINKS.googleDriveModels}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-base shadow-xl shadow-violet-500/25 transition-all hover:scale-[1.02]"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>{t("Download Models Pack (Google Drive)", "تحميل النماذج (من كوكل درايف)")}</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* 🛠️ طريقة التنصيب (INSTALLATION GUIDE) */}
        <section className="space-y-8 pt-4">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3">
              <Zap className="w-7 h-7 text-amber-400" />
              <span>{t("Installation Method", "طريقة التنصيب")}</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              {t("3 simple steps to get Saad Studio up and running on your system.", "3 خطوات بسيطة لتنصيب وتفعيل الإضافة والنماذج على حاسوبك.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="relative flex flex-col justify-between rounded-3xl bg-slate-900/80 border border-amber-500/30 p-7 space-y-4 backdrop-blur-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-lg">
                  1
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t("Run SaadStudio-Setup.exe", "تشغيل برنامج SaadStudio-Setup.exe")}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t(
                    "Download SaadStudio-Setup.exe and double-click to run. It automatically copies the extension to CEP folder and activates Windows registry PlayerDebugMode.",
                    "قم بتحميل وتشغيل ملف SaadStudio-Setup.exe. سيقوم بتنصيب الإضافة بداخل مجلد CEP وتفعيل سجل الويندوز تلقائياً."
                  )}
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t("Auto Setup Complete in 5s", "تثبيت وتفعيل تلقائي خلال ثوانٍ")}</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col justify-between rounded-3xl bg-slate-900/80 border border-violet-500/30 p-7 space-y-4 backdrop-blur-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 font-black flex items-center justify-center text-lg">
                  2
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t("Activate AI Models (.bat)", "تفعيل النماذج المحلية (.bat)")}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t(
                    "Unzip the downloaded AI Models pack from Google Drive, and double-click 'install-models.bat' to copy AI engines to user folder.",
                    "افتح حزمة النماذج المحملة من كوكل درايف واضغط مرتين على ملف 'install-models.bat' لنقل نماذج الذكاء الاصطناعي."
                  )}
                </p>
              </div>
              <div className="bg-violet-950/60 border border-violet-500/30 rounded-xl p-2.5 text-[11px] font-mono text-violet-300 text-center">
                install-models.bat
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col justify-between rounded-3xl bg-slate-900/80 border border-slate-700 p-7 space-y-4 backdrop-blur-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 font-black flex items-center justify-center text-lg">
                  3
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t("Open Panel inside Adobe App", "فتح الإضافة داخل برنامج أدوبي")}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t(
                    "Launch Premiere Pro, After Effects, or Photoshop. Go to top menu: Window > Extensions > Saad Studio.",
                    "افتح بريمير أو أفترافيكت أو فوتوشوب واذهب للقائمة العلوية: Window > Extensions > Saad Studio."
                  )}
                </p>
              </div>
              <div className="text-xs font-bold text-slate-200 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center">
                Window ➔ Extensions ➔ Saad Studio
              </div>
            </div>
          </div>
        </section>

        {/* 📖 طريقة الاستخدام (HOW TO USE) */}
        <section className="space-y-8 pt-4">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3">
              <BookOpen className="w-7 h-7 text-violet-400" />
              <span>{t("How to Use", "طريقة الاستخدام")}</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              {t("Main features and 1-click workflows available in Saad Studio panel.", "أبرز الميزات وأدوات المونتاج التلقائي بنقرة واحدة.")}
            </p>
          </div>

          {/* App Selector Tabs for How To Use */}
          <div className="flex justify-center">
            <div className="inline-flex items-center p-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md">
              <button
                onClick={() => setActiveHostApp("ppro")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeHostApp === "ppro"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Premiere Pro (مونتاج وتسميات)</span>
              </button>

              <button
                onClick={() => setActiveHostApp("ae")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeHostApp === "ae"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Play className="w-4 h-4" />
                <span>After Effects (مؤثرات وطبقات)</span>
              </button>

              <button
                onClick={() => setActiveHostApp("ps")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeHostApp === "ps"
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photoshop (استيراد الأصول)</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              {activeHostApp === "ppro" && (
                <motion.div
                  key="use-ppro"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center font-bold">
                      1
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Multi-Cam Auto Switcher", "مونتاج الكاميرات التلقائي")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      حدّد مسارات كاميرات الضيوف واضغط على **Run One Click Edit** وتقوم الإضافة بتقطيع الكاميرات تلقائياً حسب المتحدث بالصوت.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center font-bold">
                      2
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Offline Auto Captions", "الترجمة التلقائية أوفلاين")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      تحويل الصوت إلى نص وتوليد خطوط الكابشنز والستايلات السينمائية على تايم لاين بريمير 100% أوفلاين وبدون إنترنت.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center font-bold">
                      3
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Audio Waveform Sync", "مزامنة المسارات الصوتية")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      مزامنة وتسوية مسارات المايكات الخارجية مع فيديو الكاميرات تلقائياً باستخدام خوارزمية التطابق الصوتي.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center font-bold">
                      4
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Silence Removal", "حذف الصمت والتوقفات")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      حذف التوقفات والفترات الصامتة تلقائياً واختصار زمن التسجيلات بدقة فائقة دون إتلاف جودة الفيديو.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeHostApp === "ae" && (
                <motion.div
                  key="use-ae"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                      1
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Composition Generator", "إنشاء التركيبات آلياً")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      إنشاء الطبقات والمؤثرات البصرية للنصوص والخلفيات بنقرة واحدة داخل أفترافيكت.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                      2
                    </div>
                    <h3 className="text-base font-bold text-white">{t("AI Video Timeline Import", "استيراد فيديوهات AI")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      سحب واستيراد الفيديوهات المولدة بالذكاء الاصطناعي من مكتبة سعد استوديو إلى التايم لاين مباشرة.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                      3
                    </div>
                    <h3 className="text-base font-bold text-white">{t("Keyframe Cadence Sync", "مزامنة الكي فريم")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      مزامنة الحركة والـ Keyframes تلقائياً مع إيقاع الصوت والترجمة.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeHostApp === "ps" && (
                <motion.div
                  key="use-ps"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold">
                      1
                    </div>
                    <h3 className="text-base font-bold text-white">{t("1-Click Canvas Asset Import", "استيراد الصور للوحة العمل")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      استيراد الصور المولدة بالذكاء الاصطناعي كطبقات (Layers) مستقلة بداخل فوتوشوب بنقرة زر.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold">
                      2
                    </div>
                    <h3 className="text-base font-bold text-white">{t("In-Panel Image Generation", "توليد الصور داخل اللوحة")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      توليد الصور باستخدام أحدث النماذج العالمية من اللوحة الجانبية بداخل فوتوشوب مباشرة.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold">
                      3
                    </div>
                    <h3 className="text-base font-bold text-white">{t("High Res Transparency Channels", "دقة عالية وحفظ قنوات الشفافية")}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      الحفاظ على قنوات الشفافية (Alpha Channels) ودقة الألوان فور الاستيراد.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 🔧 المشاكل وحلها (TROUBLESHOOTING & SOLUTIONS) */}
        <section className="space-y-8 pt-4">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3">
              <Wrench className="w-7 h-7 text-amber-400" />
              <span>{t("Troubleshooting & Solutions", "المشاكل وحلها")}</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              {t("Common issues and instant step-by-step solutions.", "حلول فورية لأي مشكلة قد تواجهك أثناء التنصيب أو الاستخدام.")}
            </p>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {[
              {
                title: "المشكلة 1: الإضافة لا تظهر في قائمة Window > Extensions داخل أدوبي",
                solution: "أعد تشغيل برنامج أدوبي (بريمير / أفترافيكت / فوتوشوب) بالكامل. إذا استمرت المشكلة انقر بالزر الأيمن على ملف SaadStudio-Setup.exe واختر 'تشغيل كمسؤول' (Run as Administrator) لإعادة كتابة مسار الـ CEP بالسجل."
              },
              {
                title: "المشكلة 2: الإضافة تفتح بشاشة بيضاء أو تظهر رسالة 'Unsigned Extension'",
                solution: "يقوم برنامج SaadStudio-Setup.exe بتفعيل خيار CSXS PlayerDebugMode آلياً لجميع إصدارات أدوبي (CSXS 9 إلى CSXS 16). إذا ظهرت شاشة بيضاء فقط تأكد من عدم وجود برامج حماية تمنع تعديل السجل، وأعد التشغيل."
              },
              {
                title: "المشكلة 3: عدم ظهور الترجمة التلقائية الكابشنز أو عمل المحرك الأوفلاين",
                solution: "تأكد من تنزيل حزمة النماذج من كوكل درايف وتشغيل ملف install-models.bat لنسخ ملفات الذكاء الاصطناعي الصوتية إلى مجلد المستخدم C:\\Users\\YOUR_NAME\\.saadstudio\\models."
              },
              {
                title: "المشكلة 4: ظهور خطأ FFMPEG_NOT_READY أو تكرار المسار الأول فقط Stream 0",
                solution: "تم حل هذه المشكلة بالكامل في هذا الإصدار المحدث! محرك الإضافة الآن يتعرف تلقائياً على FFmpeg المدمج ويقوم بالتقطيع والمزامنة بسلاسة."
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-md space-y-3 cursor-pointer"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-amber-300">{faq.title}</h3>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                </div>
                {openFaq === index && (
                  <div className="text-sm text-slate-200 leading-relaxed pt-3 border-t border-slate-800/80 bg-slate-950/60 p-4 rounded-xl">
                    <p className="font-semibold text-emerald-400 mb-1">✓ الحل:</p>
                    <p className="text-slate-300">{faq.solution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 💻 متطلبات النظام */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-md space-y-6 max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center">
            {t("System Requirements", "متطلبات النظام والبيئة التشغيلية")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* 🏁 CTA BOTTOM SECTION */}
        <section className="text-center rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-10 sm:p-14 backdrop-blur-xl space-y-6 max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
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
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-xl shadow-amber-500/25 transition-all hover:scale-105"
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

