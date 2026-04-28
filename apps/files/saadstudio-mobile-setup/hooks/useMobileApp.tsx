/**
 * Saad Studio - Mobile App Initialization
 * Add this to your _app.tsx or layout.tsx
 */

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export function useMobileApp() {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) return;

    const initApp = async () => {
      // 1. Status bar - dark theme matching your app
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#080c1a' });
      } catch (e) {
        console.log('StatusBar not available');
      }

      // 2. Hide splash screen after app loads
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.log('SplashScreen not available');
      }

      // 3. Handle Android back button
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });

      // 4. Handle app state changes (background/foreground)
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // App came to foreground - refresh data if needed
          console.log('App is active');
        } else {
          // App went to background - save state if needed
          console.log('App is in background');
        }
      });

      // 5. Handle deep links (saadstudio://...)
      App.addListener('appUrlOpen', ({ url }) => {
        const path = url.split('saadstudio.app').pop();
        if (path) {
          window.location.href = path;
        }
      });

      // 6. Keyboard adjustments
      try {
        Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.style.paddingBottom = `${info.keyboardHeight}px`;
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.style.paddingBottom = '0px';
        });
      } catch (e) {
        console.log('Keyboard plugin not available');
      }
    };

    initApp();

    return () => {
      App.removeAllListeners();
    };
  }, []);
}

/**
 * Platform detection helper
 */
export function usePlatform() {
  const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = platform === 'android';
  const isIOS = platform === 'ios';
  const isWeb = platform === 'web';

  return { platform, isNative, isAndroid, isIOS, isWeb };
}

/**
 * Safe area insets for notch/rounded corners
 * Use in your layout component
 */
export function SafeAreaWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        minHeight: '100vh',
        background: '#080c1a',
      }}
    >
      {children}
    </div>
  );
}
