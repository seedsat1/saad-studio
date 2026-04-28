# 🚀 Saad Studio — Mobile App Setup Guide
## تحويل الموقع لتطبيق موبايل (Android + iOS)

---

## 📋 المتطلبات

### لـ Android (على Windows):
- Node.js 18+
- Android Studio (مجاني)
- Java JDK 17+

### لـ iOS (تحتاج واحد من هذي):
- Mac مع Xcode (مجاني)
- أو خدمة cloud: **Appflow** (ionic.io) أو **Codemagic** (codemagic.io)

---

## 🔧 الخطوة 1: تعديل Next.js للتصدير الثابت

افتح ملف `next.config.js` وأضف:

```js
const nextConfig = {
  output: 'export',         // مطلوب لـ Capacitor
  images: {
    unoptimized: true,      // الصور ما تشتغل مع static export
  },
  trailingSlash: true,      // يساعد بالـ routing

  // ... باقي إعداداتك الحالية
};
```

### ⚠️ ملاحظة مهمة:
إذا موقعك يستخدم **API Routes** (`/api/...`) أو **Server Components**:
- API Routes → انقلها لـ backend منفصل (أو خليها على الدومين)
- Server Components → حولها لـ Client Components (`'use client'`)
- بدل SSR استخدم `useEffect` + `fetch` من الـ client

---

## 🔧 الخطوة 2: تثبيت Capacitor

```bash
# ادخل مجلد مشروعك
cd your-saadstudio-project

# ثبّت Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios

# ثبّت الـ plugins المطلوبة
npm install @capacitor/app @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/keyboard @capacitor/browser @capacitor/share
npm install @capacitor/camera @capacitor/filesystem @capacitor/network
npm install @capacitor/haptics @capacitor/toast @capacitor/clipboard
npm install @capacitor/push-notifications @capacitor/local-notifications
npm install @capacitor/device @capacitor/dialog

# أداة توليد الأيقونات
npm install -D @capacitor/assets
```

---

## 🔧 الخطوة 3: إعداد Capacitor

```bash
# نسخ ملف الإعدادات (الملف الموجود بالحزمة)
# أو:
npx cap init "Saad Studio" "app.saadstudio.mobile" --web-dir out
```

انسخ ملف `capacitor.config.ts` من الحزمة المرفقة لمجلد مشروعك.

---

## 🔧 الخطوة 4: البناء والتصدير

```bash
# ابني الموقع وصدّره
npm run build

# إذا ما اشتغل، جرب:
npx next build
npx next export  # (لإصدارات Next.js القديمة)

# المفروض يطلع مجلد 'out/' فيه الملفات الثابتة
```

---

## 🔧 الخطوة 5: إضافة Android

```bash
# أضف منصة Android
npx cap add android

# انسخ ملفات الويب للمنصة
npx cap sync

# افتح بـ Android Studio
npx cap open android
```

### بـ Android Studio:
1. انتظر Gradle sync يخلص
2. وصّل جوالك بـ USB (فعّل Developer Options + USB Debugging)
3. أو شغّل Emulator
4. اضغط Run ▶️

---

## 🔧 الخطوة 6: إضافة الأيقونات والـ Splash

### حط الصور بهذا المكان:
```
resources/
├── icon-only.png          (1024x1024 — أيقونة التطبيق)
├── icon-foreground.png    (1024x1024 — للـ adaptive icon)
├── icon-background.png    (1024x1024 — خلفية الأيقونة)
├── splash.png             (2732x2732 — شاشة التحميل)
└── splash-dark.png        (2732x2732 — شاشة تحميل الوضع الداكن)
```

```bash
# ولّد كل الأحجام تلقائياً
npx capacitor-assets generate
```

---

## 🔧 الخطوة 7: إعدادات Android المهمة

### `android/app/src/main/AndroidManifest.xml`:
تأكد من هذي الصلاحيات:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### `android/app/src/main/res/values/styles.xml`:
```xml
<style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
    <item name="android:statusBarColor">#080c1a</item>
    <item name="android:navigationBarColor">#080c1a</item>
    <item name="android:windowLightStatusBar">false</item>
</style>
```

---

## 🔧 الخطوة 8: دمج الـ Hook بمشروعك

انسخ ملف `hooks/useMobileApp.tsx` لمشروعك واستخدمه:

```tsx
// في _app.tsx أو layout.tsx
import { useMobileApp, SafeAreaWrapper } from '@/hooks/useMobileApp';

export default function App({ children }) {
  useMobileApp(); // يشتغل بس على الموبايل

  return (
    <SafeAreaWrapper>
      {children}
    </SafeAreaWrapper>
  );
}
```

---

## 🔧 الخطوة 9: بناء APK / AAB للرفع

```bash
# بناء release
cd android
./gradlew assembleRelease      # APK
./gradlew bundleRelease        # AAB (مطلوب لـ Google Play)
```

### الملف يطلع هنا:
```
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📱 الخطوة 10: رفع على Google Play

1. سجّل حساب مطور: https://play.google.com/console ($25 مرة وحدة)
2. أنشئ تطبيق جديد
3. ارفع ملف `.aab`
4. عبّي المعلومات (وصف، صور، فئة)
5. أرسل للمراجعة (1-7 أيام)

---

## 🍎 iOS بدون Mac (Cloud Build)

### الخيار 1: Codemagic (codemagic.io)
1. سجّل حساب مجاني
2. وصّل مع GitHub repo
3. Codemagic يبني iOS على سيرفراتهم
4. يعطيك ملف .ipa جاهز

### الخيار 2: Ionic Appflow
1. سجّل على ionic.io
2. ارفع مشروعك
3. يبني Android + iOS بالـ cloud

### الخيار 3: GitHub Actions + macOS runner
```yaml
# .github/workflows/ios-build.yml
name: iOS Build
on: push
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
      - run: npx cap sync ios
      - run: xcodebuild -workspace ios/App/App.xcworkspace -scheme App
```

---

## ⚡ نصائح مهمة

### التطوير السريع (Live Reload):
```bash
# شغّل Next.js dev server
npm run dev

# بملف capacitor.config.ts فعّل:
server: {
  url: 'http://192.168.1.X:3000',  // IP جهازك
  cleartext: true,
}

# شغّل على الموبايل
npx cap run android --livereload --external
```
⚠️ لا تنسى تشيل الـ `url` قبل ما تبني للإنتاج!

### إذا واجهت مشاكل:
- **شاشة بيضاء**: تأكد `webDir: 'out'` وإن مجلد `out/` فيه `index.html`
- **API ما تشتغل**: لازم تستخدم الـ URL الكامل `https://www.saadstudio.app/api/...`
- **صور ما تطلع**: تأكد `images: { unoptimized: true }`
- **routing مشاكل**: تأكد `trailingSlash: true`

---

## 📁 هيكل الملفات النهائي

```
saadstudio/
├── android/                 ← Capacitor يولّده
├── ios/                     ← Capacitor يولّده
├── out/                     ← Next.js static export
├── public/
│   ├── manifest.json
│   └── icons/
├── resources/
│   ├── icon-only.png
│   ├── splash.png
│   └── splash-dark.png
├── hooks/
│   └── useMobileApp.tsx
├── capacitor.config.ts
├── next.config.js
└── package.json
```

---

## 🎯 الخطوات بالترتيب:

1. ✅ عدّل `next.config.js` (أضف `output: 'export'`)
2. ✅ ثبّت Capacitor + plugins
3. ✅ انسخ `capacitor.config.ts`
4. ✅ `npm run build`
5. ✅ `npx cap add android`
6. ✅ `npx cap sync`
7. ✅ أضف الأيقونات
8. ✅ `npx cap open android` → شغّل بـ Android Studio
9. ✅ ابني APK/AAB
10. ✅ ارفع على Google Play

**الوقت المتوقع: 2-4 ساعات** للبناء الأول
