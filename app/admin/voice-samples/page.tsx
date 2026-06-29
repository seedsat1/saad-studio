"use client";

import React, { useState, useEffect } from "react";
import { Mic, Sparkles, RefreshCw, Play, Pause, CheckCircle2, AlertCircle, Volume2, Shield } from "lucide-react";

interface VoiceItem {
  id: string;
  name: string;
  cleanId: string;
  tone: string;
  gender: string;
  provider: string;
  sampleUrl: string;
  isGenerated?: boolean;
}

export default function AdminVoiceSamplesPage() {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingVoice, setGeneratingVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "ok" | "err" | "info" } | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/voice-samples");
      const json = await res.json();
      if (json.voices) {
        setVoices(json.voices);
      }
    } catch (err: any) {
      setStatusMsg({ text: `فشل تحميل قائمة الأصوات: ${err.message}`, type: "err" });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = (voice: VoiceItem) => {
    if (playingVoice === voice.id) {
      audioObj?.pause();
      setPlayingVoice(null);
      return;
    }

    audioObj?.pause();
    const newAudio = new Audio(voice.sampleUrl);
    newAudio.onended = () => setPlayingVoice(null);
    newAudio.onerror = () => {
      setPlayingVoice(null);
      setStatusMsg({ text: `فشل تشغيل المعاينة الصوتية لـ ${voice.name}`, type: "err" });
    };
    newAudio.play();
    setAudioObj(newAudio);
    setPlayingVoice(voice.id);
  };

  const handleGenerateSample = async (voice: VoiceItem) => {
    setGeneratingVoice(voice.id);
    setStatusMsg({ text: `جاري توليد وحفظ خامة الصوت لـ ${voice.name} في التخزين الدائم...`, type: "info" });
    try {
      const res = await fetch("/api/admin/voice-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voice.cleanId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل التوليد");

      setStatusMsg({ text: `تم بنجاح توليد وحفظ عينة ${voice.name} لجميع المشتركين! 🚀`, type: "ok" });
      fetchVoices();
    } catch (err: any) {
      setStatusMsg({ text: `خطأ في توليد العينة: ${err.message}`, type: "err" });
    } finally {
      setGeneratingVoice(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0d1017] rounded-[14px] flex items-center justify-center">
              <Mic className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                استوديو الأدمن لتوليد وحفظ خامات الأصوات للمشتركين
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Admin Portal
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              قم بتوليد ومعاينة خامات الأصوات الرسمية وحفظها في التخزين الدائم لتعمل فوراً لجميع المشتركين بدون تكلفة أو توليد تفاعلي.
            </p>
          </div>
        </div>

        <button
          onClick={fetchVoices}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition border border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> تحديث القائمة
        </button>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`max-w-7xl mx-auto mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            statusMsg.type === "ok"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
              : statusMsg.type === "err"
              ? "bg-rose-950/40 border-rose-500/30 text-rose-200"
              : "bg-cyan-950/40 border-cyan-500/30 text-cyan-200"
          }`}
        >
          {statusMsg.type === "ok" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : statusMsg.type === "err" ? (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Main Voices Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm">جاري تحميل قائمة الأصوات والمشغلات...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {voices.map((v) => {
              const isGen = generatingVoice === v.id;
              const isPlay = playingVoice === v.id;

              return (
                <div
                  key={v.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col justify-between gap-4 transition shadow-md hover:shadow-xl group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 flex items-center justify-center text-emerald-400 font-bold text-base">
                        {v.cleanId.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 group-hover:text-emerald-300 transition text-base">
                          {v.name}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{v.provider}</span> &bull; <span>{v.tone}</span> &bull; <span className="capitalize">{v.gender}</span>
                        </p>
                      </div>
                    </div>

                    {v.isGenerated ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        جاهز للمشتركين
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        بانتظار التوليد
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handlePlayPreview(v)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                        isPlay
                          ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {isPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isPlay ? "إيقاف المعاينة" : "استماع للخامة"}
                    </button>

                    <button
                      onClick={() => handleGenerateSample(v)}
                      disabled={isGen}
                      className="py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      title="إعادة توليد وحفظ الخامة الرسمية بالسيرفر"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGen ? "animate-spin" : ""}`} />
                      {isGen ? "جاري الحفظ..." : "توليد كـ أدمن"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
