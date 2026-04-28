# 🤖 تعليمات لـ Claude Code — Saad Studio Mobile App
# الطريقة: Live URL (بدون تعديل على الموقع)

## المهمة:
بناء تطبيق موبايل لـ saadstudio.app باستخدام Capacitor.
التطبيق يفتح الموقع الحي مباشرة — ما نحتاج static export ولا تعديل على Next.js.

---

## الخطوات:

### 1. إنشاء مجلد المشروع
```bash
mkdir saadstudio-mobile
cd saadstudio-mobile
```

### 2. نسخ الملفات
انسخ هذي الملفات للمجلد:
- capacitor.config.ts
- package.json
- public/index.html

### 3. تثبيت الـ dependencies
```bash
npm install
```

### 4. إضافة Android
```bash
npx cap add android
npx cap sync
```

### 5. تعديل ألوان الـ Android
عدّل الملف: `android/app/src/main/res/values/styles.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:statusBarColor">#080c1a</item>
        <item name="android:navigationBarColor">#080c1a</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowBackground">#080c1a</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:statusBarColor">#080c1a</item>
        <item name="android:navigationBarColor">#080c1a</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowBackground">#080c1a</item>
    </style>
</resources>
```

### 6. تعديل AndroidManifest.xml
تأكد من وجود:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```
وأضف داخل <activity>:
```xml
android:screenOrientation="portrait"
```

### 7. إضافة الأيقونات
أنشئ مجلد resources/ وحط فيه:
- icon-only.png (1024x1024)
- splash.png (2732x2732)
ثم شغّل:
```bash
npx capacitor-assets generate
```

### 8. الاختبار
```bash
npx cap sync
npx cap open android
```
ثم بـ Android Studio اضغط Run.

### 9. بناء APK
```bash
cd android
./gradlew assembleDebug
```
الملف يطلع: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## ⚠️ ملاحظات:
- ما نحتاج نعدل أي شيء بمشروع Next.js
- ما نحتاج output: 'export'
- ما نحتاج نغير API routes
- التطبيق يفتح https://www.saadstudio.app مباشرة
- يحتاج انترنت ليشتغل (مثل أي تطبيق web-based)
- الـ public/index.html هو fallback يظهر بس إذا ما في انترنت

## المميزات:
- Status bar داكن يتوافق مع ثيم الموقع
- Splash screen بلون الموقع
- زر الرجوع يشتغل صحيح (Android)
- الروابط الخارجية تنفتح بالمتصفح
- الروابط الداخلية تبقى بالتطبيق
- Push notifications جاهز
