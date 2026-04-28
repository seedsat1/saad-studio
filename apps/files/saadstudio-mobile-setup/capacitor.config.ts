import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.saadstudio.mobile',
  appName: 'Saad Studio',
  webDir: 'out',  // Next.js static export output

  server: {
    // During development, point to your Next.js dev server
    // url: 'http://192.168.1.X:3000',  // Replace with your local IP
    // cleartext: true,

    // For production, use the bundled web assets
    androidScheme: 'https',
    iosScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#080c1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
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
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  // Android-specific settings
  android: {
    buildOptions: {
      keystorePath: 'release-key.jks',
      keystoreAlias: 'saadstudio',
    },
    backgroundColor: '#080c1a',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set true for dev
  },

  // iOS-specific settings (for when you get Mac or use cloud build)
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#080c1a',
    preferredContentMode: 'mobile',
    scheme: 'Saad Studio',
  },
};

export default config;
