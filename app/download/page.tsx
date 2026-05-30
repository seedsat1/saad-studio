'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PluginInfo {
  version: string;
  releaseDate: string;
  fileSize: string;
  downloadUrl: string;
}

const PLUGIN_INFO: PluginInfo = {
  version: '1.0.0',
  releaseDate: new Date().toLocaleDateString('ar-EG'),
  fileSize: '45.2 MB',
  downloadUrl: '/api/download/saadstudio.zxp'
};

export default function DownloadPage() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const response = await fetch(PLUGIN_INFO.downloadUrl);
      
      if (!response.ok) {
        throw new Error('فشل التحميل');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SaadStudio.zxp';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadProgress(100);
      setTimeout(() => setIsDownloading(false), 1000);
    } catch (error) {
      console.error('خطأ في التحميل:', error);
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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
            <div className="flex justify-between items-center">
              <span className="text-slate-400">حجم الملف:</span>
              <span className="text-white font-semibold">{PLUGIN_INFO.fileSize}</span>
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="mb-6">
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-slate-400 mt-2">
                {downloadProgress}%
              </p>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mb-4"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                📥 تحميل الإضافة
              </>
            )}
          </button>

          {/* Requirements */}
          <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
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

          {/* Support Link */}
          <div className="text-center mt-6 pt-6 border-t border-slate-700">
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

        {/* Copy Link */}
        <div className="text-center mt-6">
          <p className="text-slate-500 text-xs mb-2">
            رابط التحميل المباشر:
          </p>
          <code className="text-slate-400 text-xs break-all">
            https://www.saadstudio.app/download/saadstudio.zxp
          </code>
        </div>
      </div>
    </div>
  );
}
