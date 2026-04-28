# 🤖 تعليمات لـ Claude Code — تحويل Saad Studio لتطبيق موبايل

## المهمة:
تحويل مشروع Next.js (saadstudio.app) إلى تطبيق موبايل باستخدام Capacitor.

## الخطوات بالترتيب:

### الخطوة 1: تعديل next.config.js
أضف هذي الإعدادات (بدون حذف الإعدادات الموجودة):
```js
output: 'export',
images: { unoptimized: true },
trailingSlash: true,
```

### الخطوة 2: تثبيت Capacitor
شغّل هذي الأوامر:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm install @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/browser @capacitor/share @capacitor/camera @capacitor/filesystem @capacitor/network @capacitor/haptics @capacitor/toast @capacitor/clipboard @capacitor/push-notifications @capacitor/local-notifications @capacitor/device @capacitor/dialog
npm install -D @capacitor/assets
```

### الخطوة 3: نسخ ملف capacitor.config.ts
انسخ ملف capacitor.config.ts من حزمة saadstudio-mobile-setup.zip إلى root المشروع.

### الخطوة 4: نسخ useMobileApp.tsx
انسخ ملف hooks/useMobileApp.tsx إلى مجلد hooks/ بالمشروع.

### الخطوة 5: تعديل layout.tsx أو _app.tsx
أضف useMobileApp hook و SafeAreaWrapper:
```tsx
import { useMobileApp, SafeAreaWrapper } from '@/hooks/useMobileApp';

// داخل الـ component:
useMobileApp();

// لف المحتوى بـ:
<SafeAreaWrapper>{children}</SafeAreaWrapper>
```

### الخطوة 6: تعديل API calls
أي fetch لـ API routes (`/api/...`) لازم يكون URL كامل:
```ts
// ❌ خطأ
fetch('/api/generate')

// ✅ صحيح
fetch('https://www.saadstudio.app/api/generate')
```
أو استخدم environment variable:
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://www.saadstudio.app';
fetch(`${API_BASE}/api/generate`)
```

### الخطوة 7: نسخ manifest.json
انسخ public/manifest.json إلى مجلد public/ بالمشروع.

### الخطوة 8: البناء
```bash
npm run build
```
تأكد إن مجلد `out/` يتولّد فيه index.html

### الخطوة 9: إضافة Android
```bash
npx cap add android
npx cap sync
```

### الخطوة 10: الاختبار
```bash
npx cap open android
# أو
npx cap run android
```

## ⚠️ ملاحظات مهمة:
- إذا في Server Components (بدون 'use client') → أضف 'use client' أو حولها
- إذا في middleware.ts → ما يشتغل مع static export، انقل المنطق للـ client
- إذا في getServerSideProps → حولها لـ getStaticProps أو useEffect + fetch
- إذا في dynamic routes مع generateStaticParams → تأكد كلها معرفة
