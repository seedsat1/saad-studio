import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

/**
 * Script لرفع ملف SaadStudio.zxp إلى Cloudflare R2
 * 
 * المتطلبات:
 * 1. تحديث متغيرات البيئة في .env:
 *    - R2_ACCOUNT_ID: معرف حسابك على Cloudflare
 *    - R2_ACCESS_KEY_ID: مفتاح الوصول
 *    - R2_SECRET_ACCESS_KEY: المفتاح السري
 *    - R2_BUCKET: اسم الـ bucket (مثل: saadstudio-media)
 *    - R2_ENDPOINT: (اختياري) - سيتم حسابه تلقائياً
 * 
 * الاستخدام:
 * npx ts-node scripts/upload-to-r2.ts
 */

const uploadToR2 = async () => {
  // التحقق من متغيرات البيئة
  const requiredEnvVars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
  ];

  const missingVars = requiredEnvVars.filter(
    (v) => !process.env[v]
  );

  if (missingVars.length > 0) {
    console.error(
      '❌ متغيرات البيئة المفقودة:',
      missingVars.join(', ')
    );
    console.error('\nأضف المتغيرات التالية إلى ملف .env:');
    console.error('R2_ACCOUNT_ID=your_account_id');
    console.error('R2_ACCESS_KEY_ID=your_access_key');
    console.error('R2_SECRET_ACCESS_KEY=your_secret_key');
    console.error('R2_BUCKET=saadstudio-media');
    process.exit(1);
  }

  try {
    const accountId = process.env.R2_ACCOUNT_ID!;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
    const bucket = process.env.R2_BUCKET!;
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    console.log('📦 إعدادات R2:');
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Bucket: ${bucket}`);
    console.log(`   Endpoint: ${endpoint}\n`);

    // إنشاء S3 client
    const s3Client = new S3Client({
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint,
    });

    // البحث عن الملف
    const possiblePaths = [
      path.join(process.cwd(), 'adobe', 'New folder', 'SaadStudio.zxp'),
      path.join(process.cwd(), 'public', 'downloads', 'SaadStudio.zxp'),
    ];

    let localFilePath: string | null = null;
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        localFilePath = p;
        console.log(`✅ تم العثور على الملف: ${p}\n`);
        break;
      } catch {
        continue;
      }
    }

    if (!localFilePath) {
      console.error('❌ لم يتم العثور على ملف SaadStudio.zxp في:');
      console.error(possiblePaths.join('\n'));
      process.exit(1);
    }

    // قراءة الملف
    console.log('📖 قراءة الملف...');
    const fileBuffer = await fs.readFile(localFilePath);
    const fileSize = (fileBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`✅ حجم الملف: ${fileSize} MB\n`);

    // رفع الملف
    console.log('📤 رفع الملف إلى R2...');
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `downloads/saadstudio.zxp`,
      Body: fileBuffer,
      ContentType: 'application/octet-stream',
      CacheControl: 'public, max-age=604800', // أسبوع واحد
      Metadata: {
        'upload-date': new Date().toISOString(),
        'version': '1.0.0',
      },
    });

    await s3Client.send(command);
    console.log('✅ تم رفع الملف بنجاح!\n');

    // عرض رابط التحميل
    const downloadUrl = `https://www.saadstudio.app/download/saadstudio.zxp`;
    const r2Url = `${endpoint}/${bucket}/downloads/saadstudio.zxp`;

    console.log('📎 روابط التحميل:');
    console.log(`   الرابط النهائي: ${downloadUrl}`);
    console.log(`   رابط R2 المباشر: ${r2Url}\n`);

    console.log('✅ تم الانتهاء بنجاح!');
    console.log('\nاختبار: https://www.saadstudio.app/download');
  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
};

uploadToR2();
