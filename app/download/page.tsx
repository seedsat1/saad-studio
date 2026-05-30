'use client';

import { useState } from 'react';
import { Loader2, Download, Settings } from 'lucide-react';

interface PluginInfo {
  version: string;
  releaseDate: string;
  fileSize: string;
  setupSize: string;
  downloadUrl: string;
  setupUrl: string;
}

const PLUGIN_INFO: PluginInfo = {
  version: '1.0.0',
  releaseDate: new Date().toLocaleDateString('ar-EG'),
  fileSize: '45.2 MB',
  setupSize: '119.6 MB',
  downloadUrl: '/api/download/saadstudio.zxp',
  setupUrl: '/api/download/setup.exe'
};

export default function DownloadPage() {
  const [isDownloading, setIsDownloading] = useState<'plugin' | 'setup' | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async (type: 'plugin' | 'setup') => {
    try {
      setIsDownloading(type);
      setDownloadProgress(0);

      const url = type === 'plugin' ? PLUGIN_INFO.downloadUrl : PLUGIN_INFO.setupUrl;
      const filename = type === 'plugin' ? 'SaadStudio.zxp' : 'SaadStudio-Setup.exe';

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('فشل التحميل');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setDownloadProgress(100);
      setTimeout(() => setIsDownloading(null), 1000);
    } catch (error) {
      console.error('خطأ في التحميل:', error);
      setIsDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              تحميل SaadStudio
            </h1>
            <p className="text-slate-400">
              إضافة Adobe Creative Cloud الاحترافية
            </p>
          </div>

          {/* Plugin Info */}
          <div className="bg-slate-700/30 rounded-lg p-6 mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">الإصدار:</span>
              <span className="text-white font-semibold">{PLUGIN_INFO.version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">تاريخ الإصدار:</span>
              <span className="text-white font-semibold">{PLUGIN_INFO.releaseDate}</span>
            </div>
          </div>

          {/* Download Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Plugin Download */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-cyan-400" />
                <h3 className="text-white font-semibold">الإضافة</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                ملف الإضافة للتثبيت المباشر
              </p>
              <div className="text-slate-400 text-xs mb-4">
                الحجم: {PLUGIN_INFO.fileSize}
              </div>
              <button
                onClick={() => handleDownload('plugin')}
                disabled={isDownloading !== null}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                {isDownloading === 'plugin' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    📥 تحميل
                  </>
                )}
              </button>
              {isDownloading === 'plugin' && (
                <div className="mt-3">
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    {downloadProgress}%
                  </p>
                </div>
              )}
            </div>

            {/* Setup Download */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-semibold">برنامج التنصيب</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                برنامج مساعد للتثبيت التلقائي
              </p>
              <div className="text-slate-400 text-xs mb-4">
                الحجم: {PLUGIN_INFO.setupSize}
              </div>
              <button
                onClick={() => handleDownload('setup')}
                disabled={isDownloading !== null}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                {isDownloading === 'setup' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    ⚙️ تحميل
                  </>
                )}
              </button>
              {isDownloading === 'setup' && (
                <div className="mt-3">
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    {downloadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30 mb-6">
            <h3 className="text-white font-semibold mb-3 text-sm">المتطلبات:</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                Adobe Creative Cloud 2022 أو أحدث
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                نظام Windows 10+ أو macOS 10.15+
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                2 GB ذاكرة RAM على الأقل
              </li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30 mb-6">
            <h3 className="text-white font-semibold mb-3 text-sm">خطوات التثبيت:</h3>
            <ol className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2">
                <span className="text-cyan-500 flex-shrink-0">1.</span>
                <span>حمّل الإضافة أو برنامج التنصيب من الأعلى</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500 flex-shrink-0">2.</span>
                <span>شغّل Adobe Creative Cloud إن لم يكن مفتوحاً</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500 flex-shrink-0">3.</span>
                <span>اتبع تعليمات التثبيت على الشاشة</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-500 flex-shrink-0">4.</span>
                <span>أعد تشغيل Adobe عند الانتهاء</span>
              </li>
            </ol>
          </div>

          {/* Support Link */}
          <div className="text-center pt-6 border-t border-slate-700">
            <p className="text-slate-400 text-sm mb-2">
              هل تواجه مشكلة؟
            </p>
            <a
              href="mailto:support@saadstudio.app"
              className="text-cyan-500 hover:text-cyan-400 text-sm font-medium transition-colors"
            >
              تواصل مع الدعم
            </a>
          </div>
        </div>

        {/* Copy Links */}
        <div className="text-center mt-6">
          <p className="text-slate-500 text-xs mb-3">
            روابط التحميل المباشرة:
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-slate-600 text-xs">الإضافة:</p>
              <code className="text-slate-400 text-xs break-all block bg-slate-800/50 p-2 rounded">
                https://www.saadstudio.app/download/saadstudio.zxp
              </code>
            </div>
            <div>
              <p className="text-slate-600 text-xs">برنامج التنصيب:</p>
              <code className="text-slate-400 text-xs break-all block bg-slate-800/50 p-2 rounded">
                https://www.saadstudio.app/download/setup.exe
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
