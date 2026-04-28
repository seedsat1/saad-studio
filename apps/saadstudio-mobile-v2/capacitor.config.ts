import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.saadstudio.mobile',
  appName: 'Saad Studio',

  // ✅ بدل static export، نستخدم الموقع الحي مباشرة
  // هذا يحل مشكلة API routes و SSR
  webDir: 'public',  // مجلد فارغ فيه بس index.html يعمل redirect

  server: {
    // ✅ التطبيق يفتح موقعك الحي مباشرة
    url: 'https://www.saadstudio.app',
    cleartext: false,

    // هذا يخلي الروابط الداخلية تبقى داخل التطبيق
    // والروابط الخارجية تنفتح بالمتصفح
    allowNavigation: [
      'www.saadstudio.app',
      'saadstudio.app',
      '*.saadstudio.app',
      'accounts.saadstudio.app',
      'clerk.saadstudio.app',
      '*.clerk.accounts.dev',
      'accounts.google.com',
      '*.google.com',
      'challenges.cloudflare.com',
    ],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#080c1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#818cf8',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080c1a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },

  android: {
    backgroundColor: '#080c1a',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#080c1a',
    preferredContentMode: 'mobile',
    scheme: 'Saad Studio',
  },
};

export default config;
