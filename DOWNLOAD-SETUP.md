# 📥 دليل إعداد صفحة التحميل

## الخطوات:

### 1️⃣ إضافة بيانات R2 إلى `.env`

أضف المتغيرات التالية إلى ملف `.env`:

```env
# --- Cloudflare R2 (downloads bucket) -----
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=saadstudio-media
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://media.saadstudio.app
```

### 2️⃣ الحصول على بيانات Cloudflare R2

1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. اختر **R2** من القائمة الجانبية
3. **أنشئ bucket** جديد (أو استخدم الموجود: `saadstudio-media`)
4. اذهب إلى **R2 → API Tokens**
5. اضغط **Create API Token**
6. احفظ:
   - `Access Key ID`
   - `Secret Access Key`
   - `Account ID` (من عنوان الـ API endpoint)

### 3️⃣ تثبيت المكتبة المطلوبة

```bash
npm install @aws-sdk/client-s3
```

### 4️⃣ رفع الملف إلى R2

```bash
npm run upload-r2
```

أو يدويًا:

```bash
npx ts-node scripts/upload-to-r2.ts
```

### 5️⃣ التحقق من الصفحة

- **صفحة التحميل:** https://www.saadstudio.app/download
- **API endpoint:** https://www.saadstudio.app/api/download/saadstudio.zxp

---

## 📝 إضافة الأمر إلى package.json

أضف إلى قسم `scripts`:

```json
{
  "scripts": {
    "upload-r2": "NODE_ENV=production ts-node scripts/upload-to-r2.ts"
  }
}
```

---

## 🔍 استكشاف الأخطاء

### ❌ "الملف غير موجود"

تأكد من أن الملف موجود في:
- `adobe/New folder/SaadStudio.zxp`
- أو `public/downloads/SaadStudio.zxp`

### ❌ "خطأ في الاتصال بـ R2"

1. تحقق من متغيرات البيئة
2. تأكد من أن API Token لديه الصلاحيات
3. اختبر الاتصال: `aws s3 ls s3://saadstudio-media --endpoint-url https://YOUR_ID.r2.cloudflarestorage.com`

### ❌ "CORS Error"

قم بتشغيل script الـ CORS:

```bash
npm run set-r2-cors
```

---

## 🔗 الروابط النهائية

| الاستخدام | الرابط |
|---------|--------|
| صفحة التحميل الرسمية | https://www.saadstudio.app/download |
| رابط التحميل المباشر | https://www.saadstudio.app/download/saadstudio.zxp |
| API endpoint | https://www.saadstudio.app/api/download/saadstudio.zxp |

---

## 📊 معلومات الملف

- **الاسم:** SaadStudio.zxp
- **النسخة:** 1.0.0
- **الحجم:** ~45 MB
- **النوع:** Adobe Extension Package
- **الدعم:** Adobe CC 2022+

---

## 🚀 اختبار محلي

للاختبار بدون رفع إلى R2:

```bash
npm run dev
# ثم اذهب إلى http://localhost:3000/download
```

الملف سيتم تحميله من الخادم المحلي تلقائياً إذا لم تكن R2 متصلة.
