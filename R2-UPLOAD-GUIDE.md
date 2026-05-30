# 🚀 دليل رفع الملفات إلى R2

## 📋 الملفات المراد رفعها

```
✅ SaadStudio.zxp (45 MB)         - الإضافة الرئيسية
✅ setup.exe (119.6 MB)            - برنامج التنصيب
```

---

## 🔐 الخطوة الأولى: الحصول على بيانات R2

### 1. إنشاء حساب Cloudflare (إذا لم يكن لديك)
- اذهب إلى: https://dash.cloudflare.com/
- قم بإنشاء حساب مجاني

### 2. إنشاء R2 Bucket
- من لوحة التحكم، اختر **R2**
- اضغط **Create bucket**
- اسم الـ bucket: `saadstudio-media`

### 3. إنشاء API Token
- اذهب إلى **R2 → Settings → API Tokens**
- اضغط **Create API Token**
- اختر **Edit** كصلاحيات
- انسخ المفاتيح الثلاثة:
  - `Access Key ID`
  - `Secret Access Key`
  - `Account ID` (من الـ endpoint)

---

## ✏️ الخطوة الثانية: تحديث .env

أضف البيانات التالية إلى ملف `.env`:

```env
# --- Cloudflare R2 (Downloads) ---------------------------
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET=saadstudio-media
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://media.saadstudio.app
```

**مثال:**
```env
R2_ACCOUNT_ID=abc123def456
R2_ACCESS_KEY_ID=fba79c5f23c7cd0cb
R2_SECRET_ACCESS_KEY=asdf1234qwer5678zxcv9012
R2_BUCKET=saadstudio-media
R2_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
```

---

## 📤 الخطوة الثالثة: رفع الملفات

### خيار 1: رفع الملفات من الكود

```bash
npm run upload-all
```

سيرفع تلقائياً:
- ✅ `SaadStudio.zxp`
- ✅ `setup.exe`

### خيار 2: رفع يدوي من لوحة Cloudflare

1. اذهب إلى: https://dash.cloudflare.com/
2. اختر **R2 → saadstudio-media**
3. اضغط **Upload**
4. اختر الملفات:
   - `adobe/New folder/SaadStudio.zxp`
   - `adobe/New folder/aescripts + aeplugins desktop apps (setup).exe`
5. تأكد من المسار: `downloads/`

---

## ✅ التحقق من الرفع

### تحقق من الملفات المرفوعة:
```bash
# في لوحة Cloudflare:
# R2 → saadstudio-media → downloads/
# يجب أن تجد:
# - saadstudio.zxp
# - setup.exe
```

### اختبر الروابط:
- **الإضافة:** https://www.saadstudio.app/download/saadstudio.zxp
- **برنامج التنصيب:** https://www.saadstudio.app/download/setup.exe

---

## 🌐 الروابط النهائية

| الملف | الرابط | الوصف |
|------|--------|--------|
| صفحة التحميل | https://www.saadstudio.app/download | صفحة بها خياري التحميل |
| الإضافة | https://www.saadstudio.app/download/saadstudio.zxp | تحميل مباشر للإضافة |
| برنامج التنصيب | https://www.saadstudio.app/download/setup.exe | تحميل مباشر للبرنامج |

---

## 🎯 تخصيص صفحة التحميل

عدّل في `app/download/page.tsx`:

```typescript
const PLUGIN_INFO: PluginInfo = {
  version: '1.0.0',           // النسخة
  releaseDate: '2026-05-30',  // تاريخ الإصدار
  fileSize: '45.2 MB',        // حجم الإضافة
  setupSize: '119.6 MB',      // حجم برنامج التنصيب
  downloadUrl: '/api/download/saadstudio.zxp',
  setupUrl: '/api/download/setup.exe'
};
```

---

## 🔧 حل المشاكل

### ❌ "متغيرات البيئة المفقودة"
```
❌ R2_ACCOUNT_ID = replace_me
```
**الحل:** أضف البيانات الصحيحة إلى `.env`

### ❌ "الملف غير موجود"
```
❌ The file is not found in the local system
```
**الحل:** تأكد من وجود الملف في:
- `adobe/New folder/SaadStudio.zxp`
- `adobe/New folder/aescripts + aeplugins desktop apps (setup).exe`

### ❌ "خطأ في الاتصال بـ R2"
```
❌ Failed to connect to R2
```
**الحل:**
1. تحقق من صحة المفاتيح
2. تأكد من أن الـ bucket موجود
3. تحقق من الإنترنت

### ❌ "CORS Error"

قم بتشغيل:
```bash
npm run set-r2-cors
```

---

## 📊 معلومات الملفات

| الملف | الحجم | النوع | المسار |
|------|------|-------|--------|
| SaadStudio.zxp | 45 MB | Adobe Extension | `adobe/New folder/` |
| setup.exe | 119.6 MB | Windows Installer | `adobe/New folder/` |

---

## 🚀 بعد الرفع

1. **اختبر الصفحة:**
   ```
   https://www.saadstudio.app/download
   ```

2. **اختبر التحميل:**
   - انقر على زر "تحميل الإضافة"
   - انقر على زر "تحميل برنامج التنصيب"

3. **تأكد من المعلومات:**
   - النسخة صحيحة
   - التاريخ صحيح
   - الأحجام صحيحة

---

## 💾 الأوامر المفيدة

```bash
# رفع جميع الملفات
npm run upload-all

# رفع الإضافة فقط
npm run upload-r2

# إعدادات CORS
npm run set-r2-cors

# اختبار محلي
npm run dev
```

---

**آخر تحديث:** 2026-05-30 ✨
